// Enrollment service

const admissionRepository = require("../admissions/admission.repository");
const sessionRepository = require("../sessions/session.repository");
const semesterRepository = require("../semesters/semester.repository");
const enrollmentRepository = require("./enrollment.repository");
const prisma = require("../../config/prisma");

const DEFAULT_BULK_CONCURRENCY = 10;
const MAX_BULK_CONCURRENCY = 25;
const MAX_BULK_PROMOTION_SIZE = 1000;

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

  if (typeof data.year !== "undefined") {
    payload.year = data.year;
  }

  if (typeof data.status !== "undefined") {
    payload.status = data.status;
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

const promoteStudent = async ({ admissionId, nextSemesterId, sessionId }) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Get current ACTIVE enrollment
    const currentEnrollment =
      await enrollmentRepository.findActiveEnrollmentByAdmission(
        admissionId,
        tx,
      );

    if (!currentEnrollment) {
      throw new Error("No active enrollment found to promote");
    }

    if (currentEnrollment.admission.admissionSessionId !== sessionId) {
      throw new Error("Admission does not belong to selected session");
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
        throw new Error("Next semester not found");
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
      throw new Error("Semester does not belong to given session");
    }

    // 4. Validate correct sequence
    if (nextSemester.number !== expectedSemesterNumber) {
      throw new Error(
        `Invalid promotion. Expected semester ${expectedSemesterNumber}`,
      );
    }

    // 5. Prevent duplicate enrollment
    const existing =
      await enrollmentRepository.findEnrollmentByAdmissionAndSemester(
        admissionId,
        nextSemester.id,
        tx,
      );

    if (existing) {
      throw new Error("Enrollment already exists for next semester");
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
        year: currentEnrollment.year + 1,
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

const deleteEnrollment = async (id) => {
  return await enrollmentRepository.deleteEnrollment(id);
};

module.exports = {
  createEnrollment,
  getEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
  promoteStudent,
  promoteStudentsBulk,
};
