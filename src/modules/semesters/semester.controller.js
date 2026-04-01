// Semester controller

const { successResponse, errorResponse } = require("../../utils/apiResponse");
const { buildPagination } = require("../../utils/pagination");
const { convertToUtc } = require("../../utils/dateFormat");
const semesterService = require("./semester.service");

const createSemester = async (req, res) => {
  try {
    const { sessionId, number, startDate, endDate } = req.body;

    if (!sessionId || typeof number === "undefined" || !startDate || !endDate) {
      return errorResponse(
        res,
        "Session, number, start date and end date are required",
        400,
      );
    }

    const parsedNumber = parseInt(number, 10);
    if (Number.isNaN(parsedNumber) || parsedNumber < 1) {
      return errorResponse(res, "Valid semester number is required", 400);
    }

    const utcStartDate = convertToUtc(startDate);
    const utcEndDate = convertToUtc(endDate);

    if (new Date(utcStartDate) > new Date(utcEndDate)) {
      return errorResponse(res, "Start date cannot be after end date", 400);
    }

    const semester = await semesterService.createSemester({
      sessionId,
      number: parsedNumber,
      startDate: utcStartDate,
      endDate: utcEndDate,
    });

    return successResponse(res, semester, "Semester created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getSemesters = async (req, res) => {
  try {
    const { page = 1, limit = 10, sessionId } = req.query;

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
      orderBy: [{ number: "asc" }, { id: "asc" }],
    };

    if (sessionId) {
      query.where.sessionId = sessionId;
    }

    const { semesters, totalCount } = await semesterService.getSemesters(query);
    const pagination = buildPagination(parsedPage, parsedLimit, totalCount);

    return successResponse(
      res,
      { semesters, pagination },
      "Semesters retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getSemesterById = async (req, res) => {
  try {
    const { id } = req.params;
    const semester = await semesterService.getSemesterById(id);

    if (!semester) {
      return errorResponse(res, "Semester not found", 404);
    }

    return successResponse(res, semester, "Semester retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const updateSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, startDate, endDate } = req.body;

    if (
      typeof number === "undefined" &&
      typeof startDate === "undefined" &&
      typeof endDate === "undefined"
    ) {
      return errorResponse(
        res,
        "At least one field is required to update semester",
        400,
      );
    }

    let parsedNumber;
    if (typeof number !== "undefined") {
      parsedNumber = parseInt(number, 10);
      if (Number.isNaN(parsedNumber) || parsedNumber < 1) {
        return errorResponse(res, "Valid semester number is required", 400);
      }
    }

    const utcStartDate =
      typeof startDate !== "undefined" ? convertToUtc(startDate) : undefined;
    const utcEndDate =
      typeof endDate !== "undefined" ? convertToUtc(endDate) : undefined;

    if (
      typeof utcStartDate !== "undefined" &&
      typeof utcEndDate !== "undefined" &&
      new Date(utcStartDate) > new Date(utcEndDate)
    ) {
      return errorResponse(res, "Start date cannot be after end date", 400);
    }

    const semester = await semesterService.updateSemester(id, {
      number: parsedNumber,
      startDate: utcStartDate,
      endDate: utcEndDate,
    });

    return successResponse(res, semester, "Semester updated successfully");
  } catch (error) {
    if (error.code === "P2025" || error.message === "Semester not found") {
      return errorResponse(res, "Semester not found", 404);
    }

    return errorResponse(res, error.message);
  }
};

const deleteSemester = async (req, res) => {
  try {
    const { id } = req.params;
    await semesterService.deleteSemester(id);
    return successResponse(res, null, "Semester deleted successfully");
  } catch (error) {
    if (error.code === "P2025") {
      return errorResponse(res, "Semester not found", 404);
    }

    return errorResponse(res, error.message);
  }
};

module.exports = {
  createSemester,
  getSemesters,
  getSemesterById,
  updateSemester,
  deleteSemester,
};
