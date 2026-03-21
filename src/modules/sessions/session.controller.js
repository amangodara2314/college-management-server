const { errorResponse, successResponse } = require("../../utils/apiResponse");
const { convertToUtc } = require("../../utils/dateFormat");
const { buildPagination } = require("../../utils/pagination");
const sessionService = require("./session.service");

const createSession = async (req, res) => {
  try {
    let { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
      return errorResponse(
        res,
        "Name, start date and end date are required",
        400,
      );
    }

    startDate = convertToUtc(startDate);
    endDate = convertToUtc(endDate);

    console.log("Start Date (UTC):", startDate);
    console.log("End Date (UTC):", endDate);

    if (new Date(startDate) > new Date(endDate)) {
      return errorResponse(res, "Start date cannot be after end date", 400);
    }

    const data = await sessionService.createSession({
      name,
      startDate,
      endDate,
    });

    return successResponse(res, data, "Session created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getSessions = async (req, res) => {
  try {
    const { page = 1, search, limit = 5 } = req.query;
    const query = { where: {} };
    if (search && search.trim() !== "") {
      query.where.name = {
        contains: search,
        mode: "insensitive",
      };
    }
    query.skip = (page - 1) * limit;
    query.take = parseInt(limit);
    const result = await sessionService.getSessions(query);
    const { sessions, totalCount } = result;
    const pagination = buildPagination(page, limit, totalCount);

    return successResponse(res, { sessions, pagination }, "Data found");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await sessionService.getSessionById(id);
    if (!session) {
      return errorResponse(res, "Session not found", 404);
    }
    return successResponse(res, session, "Data found");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, startDate, endDate } = req.body;
    if (startDate) {
      startDate = convertToUtc(startDate);
    }
    if (endDate) {
      endDate = convertToUtc(endDate);
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return errorResponse(res, "Start date cannot be after end date", 400);
    }
    const session = await sessionService.updateSession(id, {
      name,
      startDate,
      endDate,
    });
    if (!session) {
      return errorResponse(res, "Session not found", 404);
    }
    return successResponse(res, session, "Session updated successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    await sessionService.deleteSession(id);
    return successResponse(res, null, "Session deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
};
