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
    return errorResponse(res, error.message);
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

    if (
      typeof year === "undefined" &&
      typeof status === "undefined" &&
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

    if (typeof status !== "undefined" && !enrollmentStatuses.includes(status)) {
      return errorResponse(res, "Invalid enrollment status", 400);
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

const deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    await enrollmentService.deleteEnrollment(id);
    return successResponse(res, null, "Enrollment deleted successfully");
  } catch (error) {
    if (error.code === "P2025") {
      return errorResponse(res, "Enrollment not found", 404);
    }

    return errorResponse(res, error.message);
  }
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
