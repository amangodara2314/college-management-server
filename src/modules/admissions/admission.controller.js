// Admission controller

const { successResponse, errorResponse } = require("../../utils/apiResponse");
const { convertToUtc } = require("../../utils/dateFormat");
const { buildPagination } = require("../../utils/pagination");
const admissionService = require("./admission.service");

const createAdmission = async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      sessionId,
      semesterId,
      admissionDate,
      year,
      subjectIds,
    } = req.body;

    const normalizedSubjectIds = Array.isArray(subjectIds)
      ? subjectIds
      : subjectIds
        ? [subjectIds]
        : [];

    if (!studentId || !courseId || !sessionId || !semesterId) {
      return errorResponse(
        res,
        "Student, course, session and semester are required",
        400,
      );
    }

    if (!year || Number.isNaN(parseInt(year, 10))) {
      return errorResponse(res, "Valid course year is required", 400);
    }

    if (normalizedSubjectIds.length === 0) {
      return errorResponse(res, "At least one subject is required", 400);
    }

    const admission = await admissionService.createAdmission({
      ...req.body,
      subjectIds: normalizedSubjectIds,
      semesterId,
      admissionDate: admissionDate ? convertToUtc(admissionDate) : undefined,
      year: parseInt(year, 10),
    });
    return successResponse(
      res,
      admission,
      "Admission created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getAdmissions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sessionId,
      courseId,
      studentId,
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
      orderBy: { createdAt: "desc" },
    };

    if (status) {
      query.where.status = status;
    }

    if (sessionId) {
      query.where.admissionSessionId = sessionId;
    }

    if (courseId) {
      query.where.courseId = courseId;
    }

    if (studentId) {
      query.where.studentId = studentId;
    }

    if (search && search.trim() !== "") {
      query.where.OR = [
        {
          enrollmentNo: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          student: {
            firstName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          student: {
            lastName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const { admissions, totalCount } =
      await admissionService.getAdmissions(query);
    const pagination = buildPagination(parsedPage, parsedLimit, totalCount);

    return successResponse(
      res,
      { admissions, pagination },
      "Admissions retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getAdmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const admission = await admissionService.getAdmissionById(id);

    if (!admission) {
      return errorResponse(res, "Admission not found", 404);
    }

    return successResponse(res, admission, "Admission retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const updateAdmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admissionDate } = req.body;

    if (typeof status === "undefined" && typeof admissionDate === "undefined") {
      return errorResponse(
        res,
        "At least one field is required to update admission",
        400,
      );
    }

    const admission = await admissionService.updateAdmission(id, {
      status,
      admissionDate: admissionDate ? convertToUtc(admissionDate) : undefined,
    });

    return successResponse(res, admission, "Admission updated successfully");
  } catch (error) {
    if (error.code === "P2025") {
      return errorResponse(res, "Admission not found", 404);
    }

    return errorResponse(res, error.message);
  }
};

const deleteAdmission = async (req, res) => {
  try {
    const { id } = req.params;
    await admissionService.deleteAdmission(id);
    return successResponse(res, null, "Admission deleted successfully");
  } catch (error) {
    if (error.code === "P2025") {
      return errorResponse(res, "Admission not found", 404);
    }

    return errorResponse(res, error.message);
  }
};

const updateStudentSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectIds } = req.body;

    const normalized = Array.isArray(subjectIds)
      ? subjectIds
      : subjectIds
        ? [subjectIds]
        : [];

    if (normalized.length === 0) {
      return errorResponse(res, "At least one subject is required", 400);
    }

    const admission = await admissionService.updateStudentSubjects(id, normalized);
    return successResponse(res, admission, "Subjects updated successfully");
  } catch (error) {
    if (error.message === "Admission not found") {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, error.message);
  }
};

module.exports = {
  createAdmission,
  getAdmissions,
  getAdmissionById,
  updateAdmission,
  updateStudentSubjects,
  deleteAdmission,
};
