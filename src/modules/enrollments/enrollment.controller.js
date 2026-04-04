// Enrollment controller

const { successResponse, errorResponse } = require("../../utils/apiResponse");
const { buildPagination } = require("../../utils/pagination");
const enrollmentService = require("./enrollment.service");

const enrollmentStatuses = [
  "ACTIVE",
  "PROMOTED",
  "REPEAT",
  "FAILED",
  "COMPLETED",
  "DROPPED",
];

const createEnrollment = async (req, res) => {
  try {
    const { admissionId, sessionId, semesterId, year, status } = req.body;

    if (!admissionId || !sessionId || !semesterId) {
      return errorResponse(
        res,
        "Admission, session and semester are required",
        400,
      );
    }

    const parsedYear = parseInt(year, 10);
    if (Number.isNaN(parsedYear) || parsedYear < 1) {
      return errorResponse(res, "Valid year is required", 400);
    }

    if (status && !enrollmentStatuses.includes(status)) {
      return errorResponse(res, "Invalid enrollment status", 400);
    }

    const enrollment = await enrollmentService.createEnrollment({
      admissionId,
      sessionId,
      semesterId,
      year: parsedYear,
      status,
    });

    return successResponse(
      res,
      enrollment,
      "Enrollment created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const promoteStudent = async (req, res) => {
  try {
    const { admissionId, nextSemesterId, sessionId } = req.body;

    if (!admissionId || !sessionId) {
      return errorResponse(res, "Admission and session are required", 400);
    }

    if (typeof nextSemesterId !== "undefined" && !nextSemesterId) {
      return errorResponse(res, "nextSemesterId cannot be empty", 400);
    }

    const result = await enrollmentService.promoteStudent({
      admissionId,
      nextSemesterId,
      sessionId,
    });

    const message =
      result.action === "COMPLETED"
        ? "Student marked as completed successfully"
        : "Student promoted successfully";

    return successResponse(res, result, message, 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const promoteStudentsBulk = async (req, res) => {
  try {
    const { items, concurrency } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "Items array is required", 400);
    }

    const result = await enrollmentService.promoteStudentsBulk({
      items,
      concurrency,
    });

    return successResponse(
      res,
      result,
      "Bulk promotion processed successfully",
      200,
    );
  } catch (error) {
    if (
      error.message === "Items array is required" ||
      error.message.startsWith("Bulk promotion supports up to")
    ) {
      return errorResponse(res, error.message, 400);
    }

    return errorResponse(res, error.message);
  }
};

const promoteStudentToCourse = async (req, res) => {
  try {
    const {
      currentAdmissionId,
      targetCourseId,
      sessionId,
      startingSemesterId,
      subjectIds,
      admissionDate,
    } = req.body;

    if (
      !currentAdmissionId ||
      !targetCourseId ||
      !sessionId ||
      !startingSemesterId
    ) {
      return errorResponse(
        res,
        "currentAdmissionId, targetCourseId, sessionId and startingSemesterId are required",
        400,
      );
    }

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      return errorResponse(res, "subjectIds array is required", 400);
    }

    const result = await enrollmentService.promoteStudentToCourse({
      currentAdmissionId,
      targetCourseId,
      sessionId,
      startingSemesterId,
      subjectIds,
      admissionDate,
    });

    return successResponse(
      res,
      result,
      "Student promoted to course successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const promoteStudentsToCourseBulk = async (req, res) => {
  try {
    const {
      targetCourseId,
      sessionId,
      startingSemesterId,
      subjectIds,
      items,
      concurrency,
    } = req.body;

    if (!targetCourseId || !sessionId || !startingSemesterId) {
      return errorResponse(
        res,
        "targetCourseId, sessionId and startingSemesterId are required",
        400,
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "Items array is required", 400);
    }

    if (typeof subjectIds !== "undefined" && !Array.isArray(subjectIds)) {
      return errorResponse(res, "subjectIds must be an array", 400);
    }

    const result = await enrollmentService.promoteStudentsToCourseBulk({
      targetCourseId,
      sessionId,
      startingSemesterId,
      subjectIds,
      items,
      concurrency,
    });

    return successResponse(
      res,
      result,
      "Bulk course promotion processed successfully",
      200,
    );
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const getEnrollments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sessionId,
      semesterId,
      admissionId,
      year,
    } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    if (
      Number.isNaN(parsedPage) ||
      Number.isNaN(parsedLimit) ||
      parsedPage < 1 ||
      parsedLimit < 1
    ) {
      return errorResponse(res, "Invalid page or limit value", 400);
    }

    const query = {
      where: {},
      skip: (parsedPage - 1) * parsedLimit,
      take: parsedLimit,
      orderBy: [{ year: "desc" }, { id: "desc" }],
    };

    if (status) {
      if (!enrollmentStatuses.includes(status)) {
        return errorResponse(res, "Invalid enrollment status", 400);
      }
      query.where.status = status;
    }

    if (sessionId) {
      query.where.sessionId = sessionId;
    }

    if (semesterId) {
      query.where.semesterId = semesterId;
    }

    if (admissionId) {
      query.where.admissionId = admissionId;
    }

    if (year) {
      const parsedYear = parseInt(year, 10);
      if (Number.isNaN(parsedYear) || parsedYear < 1) {
        return errorResponse(res, "Invalid year filter", 400);
      }
      query.where.year = parsedYear;
    }

    if (search && search.trim() !== "") {
      query.where.OR = [
        {
          admission: {
            enrollmentNo: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          admission: {
            student: {
              firstName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          admission: {
            student: {
              lastName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    const { enrollments, totalCount } =
      await enrollmentService.getEnrollments(query);
    const pagination = buildPagination(parsedPage, parsedLimit, totalCount);

    return successResponse(
      res,
      { enrollments, pagination },
      "Enrollments retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getEnrollmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const enrollment = await enrollmentService.getEnrollmentById(id);

    if (!enrollment) {
      return errorResponse(res, "Enrollment not found", 404);
    }

    return successResponse(
      res,
      enrollment,
      "Enrollment retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const updateEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { year, status, sessionId, semesterId } = req.body;

    if (typeof status !== "undefined") {
      return errorResponse(
        res,
        "Use PATCH /api/enrollment/:id/status for enrollment status updates",
        400,
      );
    }

    if (
      typeof year === "undefined" &&
      typeof sessionId === "undefined" &&
      typeof semesterId === "undefined"
    ) {
      return errorResponse(
        res,
        "At least one field is required to update",
        400,
      );
    }

    let parsedYear;
    if (typeof year !== "undefined") {
      parsedYear = parseInt(year, 10);
      if (Number.isNaN(parsedYear) || parsedYear < 1) {
        return errorResponse(res, "Valid year is required", 400);
      }
    }

    const enrollment = await enrollmentService.updateEnrollment(id, {
      year: parsedYear,
      status,
      sessionId,
      semesterId,
    });

    return successResponse(res, enrollment, "Enrollment updated successfully");
  } catch (error) {
    if (error.code === "P2025" || error.message === "Enrollment not found") {
      return errorResponse(res, "Enrollment not found", 404);
    }

    return errorResponse(res, error.message);
  }
};

const updateEnrollmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return errorResponse(res, "Status is required", 400);
    }

    if (!enrollmentStatuses.includes(status)) {
      return errorResponse(res, "Invalid enrollment status", 400);
    }

    const enrollment = await enrollmentService.updateEnrollmentStatus(
      id,
      status,
    );

    return successResponse(
      res,
      enrollment,
      "Enrollment status updated successfully",
      200,
    );
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    await enrollmentService.deleteEnrollment(id);
    return successResponse(res, null, "Enrollment deleted successfully");
  } catch (error) {
    if (error.code === "P2025" || error.statusCode === 404) {
      return errorResponse(res, "Enrollment not found", 404);
    }

    return errorResponse(res, error.message, error.statusCode || 500);
  }
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
