// Enrollment service

const admissionRepository = require("../admissions/admission.repository");
const courseRepository = require("../courses/course.repository");
const sessionRepository = require("../sessions/session.repository");
const semesterRepository = require("../semesters/semester.repository");
const subjectRepository = require("../subjects/subject.repository");
const enrollmentRepository = require("./enrollment.repository");
const prisma = require("../../config/prisma");
const { generateEnrollmentNo } = require("../../utils/generateEnrollmentNo");
const { convertToUtc } = require("../../utils/dateFormat");

const DEFAULT_BULK_CONCURRENCY = 10;
const MAX_BULK_CONCURRENCY = 25;
const MAX_BULK_PROMOTION_SIZE = 1000;
const COURSE_PROMOTION_ELIGIBLE_STATUSES = new Set(["PROMOTED", "COMPLETED"]);
const ENROLLMENT_STATUS_TRANSITIONS = {
  ACTIVE: new Set(["PROMOTED", "REPEAT", "FAILED", "COMPLETED", "DROPPED"]),
  PROMOTED: new Set(["ACTIVE"]),
  REPEAT: new Set(["ACTIVE", "FAILED", "DROPPED"]),
  FAILED: new Set(["ACTIVE", "REPEAT", "DROPPED"]),
  COMPLETED: new Set(["ACTIVE"]),
  DROPPED: new Set(["ACTIVE"]),
};

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeConcurrency = (concurrency) => {
  const parsed = parseInt(concurrency, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_BULK_CONCURRENCY;
  }

  return Math.min(parsed, MAX_BULK_CONCURRENCY);
};

const runWithConcurrency = async (items, concurrency, handler) => {
  const results = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = cursor;
      cursor += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await handler(items[currentIndex]);
    }
  };

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
};

const normalizeSubjectIds = (subjectIds) => {
  if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
    return null;
  }

  if (subjectIds.some((subjectId) => !subjectId)) {
    return null;
  }

  const uniqueSubjectIds = [...new Set(subjectIds)];

  if (uniqueSubjectIds.length !== subjectIds.length) {
    throw buildError("Duplicate subjectIds are not allowed", 400);
  }

  return uniqueSubjectIds;
};

const resolveCoursePromotionContext = async ({
  targetCourseId,
  sessionId,
  startingSemesterId,
}) => {
  const [targetCourse, session, startingSemester] = await Promise.all([
    courseRepository.findCourseById(targetCourseId),
    sessionRepository.findSessionById(sessionId),
    semesterRepository.findSemesterById(startingSemesterId),
  ]);

  if (!targetCourse) {
    throw buildError("Target course not found", 404);
  }

  if (!session) {
    throw buildError("Session not found", 404);
  }

  if (!startingSemester) {
    throw buildError("Starting semester not found", 404);
  }

  if (startingSemester.sessionId !== sessionId) {
    throw buildError(
      "Starting semester does not belong to selected session",
      400,
    );
  }

  return {
    targetCourse,
    session,
    startingSemester,
    startYear: session.name.split("-")[0],
  };
};

const getSemestersPerYear = (course) => {
  if (!course || !course.totalSemesters || !course.durationYears) {
    throw buildError("Invalid course configuration for year calculation", 400);
  }

  if (course.totalSemesters % course.durationYears !== 0) {
    throw buildError(
      "Invalid course configuration: totalSemesters must be divisible by durationYears",
      400,
    );
  }

  return course.totalSemesters / course.durationYears;
};

const deriveEnrollmentYearFromCourse = async (
  admissionId,
  targetSemesterNumber,
  db = prisma,
) => {
  const admission = await db.admission.findUnique({
    where: {
      id: admissionId,
    },
    select: {
      id: true,
      course: {
        select: {
          totalSemesters: true,
          durationYears: true,
        },
      },
    },
  });

  if (!admission) {
    throw buildError("Admission not found", 404);
  }

  const semestersPerYear = getSemestersPerYear(admission.course);

  if (
    targetSemesterNumber < 1 ||
    targetSemesterNumber > admission.course.totalSemesters
  ) {
    throw buildError(
      `Semester number ${targetSemesterNumber} is outside the course semester range`,
      400,
    );
  }

  return Math.ceil(targetSemesterNumber / semestersPerYear);
};

const promoteStudentToCourseInTransaction = async (
  tx,
  { currentAdmissionId, subjectIds, admissionDate },
  context,
) => {
  const sourceAdmission = await tx.admission.findUnique({
    where: { id: currentAdmissionId },
    include: {
      enrollments: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!sourceAdmission) {
    throw buildError("Current admission not found", 404);
  }

  if (sourceAdmission.courseId === context.targetCourse.id) {
    throw buildError("Source and target course cannot be same", 400);
  }

  if (sourceAdmission.enrollments.length === 0) {
    throw buildError("Current admission has no enrollments", 400);
  }

  const hasIneligibleEnrollment = sourceAdmission.enrollments.some(
    (enrollment) => !COURSE_PROMOTION_ELIGIBLE_STATUSES.has(enrollment.status),
  );

  if (hasIneligibleEnrollment) {
    throw buildError(
      "Student is not eligible for course promotion. All enrollments must be PROMOTED or COMPLETED",
      400,
    );
  }

  const existingTargetAdmission = await tx.admission.findFirst({
    where: {
      studentId: sourceAdmission.studentId,
      courseId: context.targetCourse.id,
      admissionSessionId: context.session.id,
    },
  });

  if (existingTargetAdmission) {
    throw buildError(
      "Student is already admitted to target course in this session",
      409,
    );
  }

  const subjects = await tx.subject.findMany({
    where: {
      id: {
        in: subjectIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (subjects.length !== subjectIds.length) {
    throw buildError("One or more subjectIds are invalid", 400);
  }

  const enrollmentNo = await generateEnrollmentNo(
    tx,
    context.targetCourse.code,
    context.startYear,
  );

  const utcAdmissionDate = convertToUtc(
    admissionDate || new Date().toISOString(),
  );

  const newAdmission = await tx.admission.create({
    data: {
      studentId: sourceAdmission.studentId,
      courseId: context.targetCourse.id,
      admissionSessionId: context.session.id,
      enrollmentNo,
      admissionDate: utcAdmissionDate,
      status: "ACTIVE",
      mode: sourceAdmission.mode || "COLLEGIATE",
    },
  });

  await subjectRepository.createStudentSubjectTransaction(
    tx,
    subjectIds.map((subjectId) => ({
      admissionId: newAdmission.id,
      subjectId,
    })),
  );

  const newEnrollment = await enrollmentRepository.createEnrollmentTransaction(
    tx,
    {
      admissionId: newAdmission.id,
      sessionId: context.session.id,
      semesterId: context.startingSemester.id,
      year: 1,
      status: "ACTIVE",
    },
  );

  await tx.admission.update({
    where: {
      id: sourceAdmission.id,
    },
    data: {
      status: "COMPLETED",
    },
  });

  return {
    action: "COURSE_PROMOTED",
    sourceAdmissionId: sourceAdmission.id,
    newAdmission,
    newEnrollment,
  };
};

const createEnrollment = async (data) => {
  const [admission, session, semester] = await Promise.all([
    admissionRepository.findAdmissionById(data.admissionId),
    sessionRepository.findSessionById(data.sessionId),
    semesterRepository.findSemesterById(data.semesterId),
  ]);

  if (!admission) throw new Error("Admission not found");
  if (!session) throw new Error("Session not found");
  if (!semester) throw new Error("Semester not found");

  if (admission.admissionSessionId !== data.sessionId) {
    throw new Error("Admission does not belong to selected session");
  }

  if (semester.sessionId !== data.sessionId) {
    throw new Error("Semester does not belong to selected session");
  }

  // Prevent duplicate enrollment
  const existingEnrollment =
    await enrollmentRepository.findEnrollmentByAdmissionAndSemester(
      data.admissionId,
      data.semesterId,
    );

  if (existingEnrollment) {
    throw new Error("Enrollment already exists for this semester");
  }

  //  Get latest enrollment
  const latestEnrollment = await prisma.enrollment.findFirst({
    where: { admissionId: data.admissionId },
    orderBy: {
      semester: {
        number: "desc",
      },
    },
    include: { semester: true },
  });

  if (latestEnrollment) {
    if (semester.number < latestEnrollment.semester.number) {
      throw new Error("Cannot create past semester enrollment");
    }
  }

  // Ensure only one ACTIVE
  const activeEnrollment = await prisma.enrollment.findFirst({
    where: {
      admissionId: data.admissionId,
      status: "ACTIVE",
    },
  });

  if (activeEnrollment) {
    await prisma.enrollment.update({
      where: { id: activeEnrollment.id },
      data: { status: "PROMOTED" },
    });
  }

  // ✅ Create new enrollment
  return await enrollmentRepository.createEnrollment({
    admissionId: data.admissionId,
    sessionId: data.sessionId,
    semesterId: data.semesterId,
    year: data.year,
    status: "ACTIVE",
  });
};
const getEnrollments = async (query) => {
  const { where } = query;
  const [enrollments, totalCount] = await Promise.all([
    enrollmentRepository.findEnrollments(query),
    enrollmentRepository.countEnrollments({ where }),
  ]);

  return { enrollments, totalCount };
};

const getEnrollmentById = async (id) => {
  return await enrollmentRepository.findEnrollmentById(id);
};

const updateEnrollment = async (id, data) => {
  const existingEnrollment = await enrollmentRepository.findEnrollmentById(id);

  if (!existingEnrollment) {
    throw new Error("Enrollment not found");
  }

  const payload = {};

  if (typeof data.status !== "undefined") {
    throw buildError(
      "Status cannot be updated from this endpoint. Use PATCH /api/enrollment/:id/status",
      400,
    );
  }

  if (typeof data.year !== "undefined") {
    payload.year = data.year;
  }

  if (typeof data.sessionId !== "undefined") {
    const session = await sessionRepository.findSessionById(data.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (existingEnrollment.admission.admissionSessionId !== data.sessionId) {
      throw new Error("Admission does not belong to selected session");
    }

    payload.sessionId = data.sessionId;
  }

  if (typeof data.semesterId !== "undefined") {
    const semester = await semesterRepository.findSemesterById(data.semesterId);
    if (!semester) {
      throw new Error("Semester not found");
    }

    const targetSessionId = payload.sessionId || existingEnrollment.sessionId;

    if (semester.sessionId !== targetSessionId) {
      throw new Error("Semester does not belong to selected session");
    }

    payload.semesterId = data.semesterId;
  }

  return await enrollmentRepository.updateEnrollment(id, payload);
};

const updateEnrollmentStatus = async (id, targetStatus) => {
  return await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        admissionId: true,
        semester: {
          select: {
            number: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw buildError("Enrollment not found", 404);
    }

    if (enrollment.status === targetStatus) {
      return tx.enrollment.findUnique({ where: { id } });
    }

    const allowedTargets =
      ENROLLMENT_STATUS_TRANSITIONS[enrollment.status] || new Set();

    if (!allowedTargets.has(targetStatus)) {
      throw buildError(
        `Invalid status transition from ${enrollment.status} to ${targetStatus}`,
        400,
      );
    }

    if (targetStatus === "ACTIVE") {
      const existingActive = await tx.enrollment.findFirst({
        where: {
          admissionId: enrollment.admissionId,
          status: "ACTIVE",
          id: {
            not: enrollment.id,
          },
        },
      });

      if (existingActive) {
        throw buildError(
          "Cannot set status to ACTIVE. Another ACTIVE enrollment already exists",
          400,
        );
      }
    }

    if (targetStatus === "PROMOTED") {
      const higherActiveEnrollment = await tx.enrollment.findFirst({
        where: {
          admissionId: enrollment.admissionId,
          status: "ACTIVE",
          semester: {
            number: {
              gt: enrollment.semester.number,
            },
          },
        },
      });

      if (!higherActiveEnrollment) {
        throw buildError(
          "Cannot mark as PROMOTED without a higher-semester ACTIVE enrollment",
          400,
        );
      }
    }

    if (targetStatus === "COMPLETED") {
      const higherEnrollment = await tx.enrollment.findFirst({
        where: {
          admissionId: enrollment.admissionId,
          semester: {
            number: {
              gt: enrollment.semester.number,
            },
          },
        },
      });

      if (higherEnrollment) {
        throw buildError(
          "Cannot mark enrollment as COMPLETED while a higher-semester enrollment exists",
          400,
        );
      }
    }

    return await tx.enrollment.update({
      where: { id },
      data: { status: targetStatus },
    });
  });
};

const promoteStudent = async ({ admissionId, nextSemesterId, sessionId }) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Get current ACTIVE enrollment
    const currentEnrollment =
      await enrollmentRepository.findActiveEnrollmentByAdmission(
        admissionId,
        tx,
      );

    if (!currentEnrollment) {
      throw buildError("No active enrollment found to promote", 404);
    }

    if (currentEnrollment.admission.admissionSessionId !== sessionId) {
      throw buildError("Admission does not belong to selected session", 400);
    }

    const expectedSemesterNumber = currentEnrollment.semester.number + 1;

    // 2. Resolve next semester
    let nextSemester;

    if (nextSemesterId) {
      nextSemester = await semesterRepository.findSemesterById(
        nextSemesterId,
        tx,
      );
      if (!nextSemester) {
        throw buildError("Next semester not found", 404);
      }
    } else {
      nextSemester = await semesterRepository.findBySessionAndNumber(
        sessionId,
        expectedSemesterNumber,
        tx,
      );

      // Final semester reached: mark current as completed.
      if (!nextSemester) {
        const completedEnrollment =
          await enrollmentRepository.updateEnrollmentTransaction(
            tx,
            currentEnrollment.id,
            { status: "COMPLETED" },
          );

        return {
          action: "COMPLETED",
          enrollment: completedEnrollment,
        };
      }
    }

    // 3. Validate same session
    if (nextSemester.sessionId !== sessionId) {
      throw buildError("Semester does not belong to given session", 400);
    }

    // 4. Validate correct sequence
    if (nextSemester.number !== expectedSemesterNumber) {
      throw buildError(
        `Invalid promotion. Expected semester ${expectedSemesterNumber}`,
        400,
      );
    }

    const derivedYear = await deriveEnrollmentYearFromCourse(
      admissionId,
      nextSemester.number,
      tx,
    );

    // 5. Prevent duplicate enrollment
    const existing =
      await enrollmentRepository.findEnrollmentByAdmissionAndSemester(
        admissionId,
        nextSemester.id,
        tx,
      );

    if (existing) {
      throw buildError("Enrollment already exists for next semester", 409);
    }

    // 6. Mark current as PROMOTED
    await enrollmentRepository.updateEnrollmentTransaction(
      tx,
      currentEnrollment.id,
      { status: "PROMOTED" },
    );

    // 7. Create next ACTIVE enrollment
    const newEnrollment =
      await enrollmentRepository.createEnrollmentTransaction(tx, {
        admissionId,
        sessionId,
        semesterId: nextSemester.id,
        year: derivedYear,
        status: "ACTIVE",
      });

    return {
      action: "PROMOTED",
      enrollment: newEnrollment,
    };
  });
};

const promoteStudentsBulk = async ({ items, concurrency }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Items array is required");
  }

  if (items.length > MAX_BULK_PROMOTION_SIZE) {
    throw new Error(
      `Bulk promotion supports up to ${MAX_BULK_PROMOTION_SIZE} items per request`,
    );
  }

  const safeConcurrency = normalizeConcurrency(concurrency);
  const seenAdmissionIds = new Set();

  const normalizedItems = items.map((item, index) => {
    const admissionId = item?.admissionId;
    const sessionId = item?.sessionId;
    const nextSemesterId = item?.nextSemesterId;

    if (!admissionId || !sessionId) {
      return {
        index,
        admissionId,
        sessionId,
        nextSemesterId,
        valid: false,
        error: "admissionId and sessionId are required",
      };
    }

    if (typeof nextSemesterId !== "undefined" && !nextSemesterId) {
      return {
        index,
        admissionId,
        sessionId,
        nextSemesterId,
        valid: false,
        error: "nextSemesterId cannot be empty",
      };
    }

    if (seenAdmissionIds.has(admissionId)) {
      return {
        index,
        admissionId,
        sessionId,
        nextSemesterId,
        valid: false,
        error:
          "Duplicate admissionId in same request is not allowed for bulk promotion",
      };
    }

    seenAdmissionIds.add(admissionId);

    return {
      index,
      admissionId,
      sessionId,
      nextSemesterId,
      valid: true,
    };
  });

  const results = new Array(items.length);
  const validItems = normalizedItems.filter((item) => item.valid);

  normalizedItems
    .filter((item) => !item.valid)
    .forEach((item) => {
      results[item.index] = {
        index: item.index,
        admissionId: item.admissionId,
        success: false,
        error: item.error,
      };
    });

  const processedResults = await runWithConcurrency(
    validItems,
    safeConcurrency,
    async (item) => {
      try {
        const promotionResult = await promoteStudent({
          admissionId: item.admissionId,
          sessionId: item.sessionId,
          nextSemesterId: item.nextSemesterId,
        });

        return {
          index: item.index,
          admissionId: item.admissionId,
          success: true,
          action: promotionResult.action,
          enrollment: promotionResult.enrollment,
        };
      } catch (error) {
        return {
          index: item.index,
          admissionId: item.admissionId,
          success: false,
          error: error.message,
        };
      }
    },
  );

  processedResults.forEach((entry) => {
    results[entry.index] = entry;
  });

  const successCount = results.filter((item) => item.success).length;
  const failureCount = results.length - successCount;

  return {
    summary: {
      total: results.length,
      successCount,
      failureCount,
      concurrency: safeConcurrency,
    },
    results,
  };
};

const promoteStudentToCourse = async ({
  currentAdmissionId,
  targetCourseId,
  sessionId,
  startingSemesterId,
  subjectIds,
  admissionDate,
}) => {
  const normalizedSubjectIds = normalizeSubjectIds(subjectIds);

  if (!normalizedSubjectIds) {
    throw buildError("subjectIds array is required", 400);
  }

  const context = await resolveCoursePromotionContext({
    targetCourseId,
    sessionId,
    startingSemesterId,
  });

  return prisma.$transaction(async (tx) => {
    return promoteStudentToCourseInTransaction(
      tx,
      {
        currentAdmissionId,
        subjectIds: normalizedSubjectIds,
        admissionDate,
      },
      context,
    );
  });
};

const promoteStudentsToCourseBulk = async ({
  targetCourseId,
  sessionId,
  startingSemesterId,
  subjectIds,
  items,
  concurrency,
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw buildError("Items array is required", 400);
  }

  if (items.length > MAX_BULK_PROMOTION_SIZE) {
    throw buildError(
      `Bulk promotion supports up to ${MAX_BULK_PROMOTION_SIZE} items per request`,
      400,
    );
  }

  const context = await resolveCoursePromotionContext({
    targetCourseId,
    sessionId,
    startingSemesterId,
  });

  const sharedSubjectIds =
    typeof subjectIds === "undefined"
      ? undefined
      : normalizeSubjectIds(subjectIds);

  if (typeof subjectIds !== "undefined" && !sharedSubjectIds) {
    throw buildError("subjectIds must be a non-empty array", 400);
  }

  const safeConcurrency = normalizeConcurrency(concurrency);
  const seenAdmissionIds = new Set();

  const normalizedItems = items.map((item, index) => {
    const currentAdmissionId = item?.currentAdmissionId;
    let itemSubjectIds;

    try {
      itemSubjectIds = normalizeSubjectIds(
        item?.subjectIds || sharedSubjectIds,
      );
    } catch (error) {
      return {
        index,
        currentAdmissionId,
        valid: false,
        error: error.message,
      };
    }

    if (!currentAdmissionId) {
      return {
        index,
        currentAdmissionId,
        valid: false,
        error: "currentAdmissionId is required",
      };
    }

    if (!itemSubjectIds) {
      return {
        index,
        currentAdmissionId,
        valid: false,
        error: "subjectIds are required (shared or per item)",
      };
    }

    if (seenAdmissionIds.has(currentAdmissionId)) {
      return {
        index,
        currentAdmissionId,
        valid: false,
        error:
          "Duplicate currentAdmissionId in same request is not allowed for course promotion",
      };
    }

    seenAdmissionIds.add(currentAdmissionId);

    return {
      index,
      currentAdmissionId,
      subjectIds: itemSubjectIds,
      admissionDate: item?.admissionDate,
      valid: true,
    };
  });

  const results = new Array(items.length);
  const validItems = normalizedItems.filter((item) => item.valid);

  normalizedItems
    .filter((item) => !item.valid)
    .forEach((item) => {
      results[item.index] = {
        index: item.index,
        currentAdmissionId: item.currentAdmissionId,
        success: false,
        error: item.error,
      };
    });

  const processedResults = await runWithConcurrency(
    validItems,
    safeConcurrency,
    async (item) => {
      try {
        const promotionResult = await prisma.$transaction(async (tx) => {
          return promoteStudentToCourseInTransaction(
            tx,
            {
              currentAdmissionId: item.currentAdmissionId,
              subjectIds: item.subjectIds,
              admissionDate: item.admissionDate,
            },
            context,
          );
        });

        return {
          index: item.index,
          currentAdmissionId: item.currentAdmissionId,
          success: true,
          action: promotionResult.action,
          newAdmission: promotionResult.newAdmission,
          newEnrollment: promotionResult.newEnrollment,
        };
      } catch (error) {
        return {
          index: item.index,
          currentAdmissionId: item.currentAdmissionId,
          success: false,
          error: error.message,
          statusCode: error.statusCode || 500,
        };
      }
    },
  );

  processedResults.forEach((entry) => {
    results[entry.index] = entry;
  });

  const successCount = results.filter((item) => item.success).length;
  const failureCount = results.length - successCount;

  return {
    summary: {
      total: results.length,
      successCount,
      failureCount,
      concurrency: safeConcurrency,
    },
    results,
  };
};

const deleteEnrollment = async (id) => {
  return await prisma.$transaction(async (tx) => {
    const enrollment = await enrollmentRepository.findEnrollmentForDeleteById(
      id,
      tx,
    );

    if (!enrollment) {
      throw buildError("Enrollment not found", 404);
    }

    const higherEnrollment =
      await enrollmentRepository.findHigherEnrollmentAfterSemester(
        enrollment.admissionId,
        enrollment.semester.number,
        tx,
      );

    if (higherEnrollment) {
      throw buildError(
        "Cannot delete previous enrollment. Higher-semester enrollment exists for this admission",
        400,
      );
    }

    const fallbackEnrollment =
      await enrollmentRepository.findLatestPromotedBeforeSemester(
        enrollment.admissionId,
        enrollment.semester.number,
        tx,
      );

    if (fallbackEnrollment) {
      await enrollmentRepository.updateEnrollmentTransaction(
        tx,
        fallbackEnrollment.id,
        {
          status: "ACTIVE",
        },
      );
    }

    return await enrollmentRepository.deleteEnrollmentTransaction(tx, id);
  });
};

module.exports = {
  createEnrollment,
  getEnrollments,
  getEnrollmentById,
  updateEnrollment,
  updateEnrollmentStatus,
  deleteEnrollment,
  promoteStudent,
  promoteStudentsBulk,
  promoteStudentToCourse,
  promoteStudentsToCourseBulk,
};
