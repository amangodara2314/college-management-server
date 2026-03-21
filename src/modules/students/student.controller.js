// Student controller
const { errorResponse, successResponse } = require("../../utils/apiResponse");
const { buildPagination } = require("../../utils/pagination");
const studentService = require("./student.service");

const genders = ["MALE", "FEMALE", "OTHER"];
const categories = ["GENERAL", "OBC", "SC", "ST"];
const religions = ["HINDU", "MUSLIM", "CHRISTIAN", "SIKH", "OTHER"];

const validateStudentData = (data) => {
  if (!data.firstName || data.firstName.trim() === "") {
    return "First name is required";
  }
  if (!data.gender || !genders.includes(data.gender)) {
    return "Invalid gender";
  }
  if (!data.category || !categories.includes(data.category)) {
    return "Invalid category";
  }
  if (!data.religion || !religions.includes(data.religion)) {
    return "Invalid religion";
  }
  if (!data.sessionId || !data.sessionId.trim()) {
    return "Session is required";
  }
  if (!data.courseId || !data.courseId.trim()) {
    return "Course is required";
  }
  if (!parseInt(data.year) > 0) {
    return "Course year is required";
  }
  console.log("Subject IDs:", data.subjectIds);
  if (!data.subjectIds || data.subjectIds?.length === 0) {
    return "Subject IDs are required";
  }

  return null;
};

const createStudent = async (req, res) => {
  try {
    const {
      firstName,
      gender,
      category,
      religion,
      courseId,
      sessionId,
      subjectIds,
      year,
    } = req.body;

    let documentTypes = req.body.documentTypes;
    if (documentTypes && !Array.isArray(documentTypes)) {
      documentTypes = [documentTypes];
    }

    const subjectIdsArray = Array.isArray(subjectIds)
      ? subjectIds
      : [subjectIds];
    const validationError = validateStudentData({
      firstName,
      gender,
      category,
      religion,
      sessionId,
      courseId,
      year: year,
      subjectIds: subjectIdsArray,
    });

    if (validationError) {
      return errorResponse(res, validationError, 400);
    }

    if (Array.isArray(documentTypes) && documentTypes.length > 0) {
      const set = new Set(documentTypes);
      if (set.size !== documentTypes.length) {
        return errorResponse(
          res,
          "Duplicate document types are not allowed",
          400,
        );
      }
    }
    const fileGroups = req.files || {};
    const documents = Array.isArray(fileGroups)
      ? fileGroups
      : [
          ...(fileGroups.documents || []),
          ...(fileGroups["documents[]"] || []),
          ...(fileGroups.files || []),
        ];

    const data = {
      ...req.body,
      documents,
      subjectIds: subjectIdsArray,
      documentTypes,
    };

    const result = await studentService.createStudent(data);
    return successResponse(res, result, "Student created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const findStudents = async (req, res) => {
  try {
    const filter = req.query || {};
    const query = { where: {} };
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    if (filter.firstName && filter.firstName.trim() !== "") {
      query.where.firstName = {
        contains: filter.firstName,
        mode: "insensitive",
      };
    }
    if (filter.lastName && filter.lastName.trim() !== "") {
      query.where.firstName = {
        contains: filter.firstName,
        mode: "insensitive",
      };
    }
    query.skip = page;
    query.take = limit;
    const [students, totalStudents] = await Promise.all([
      studentService.findStudents(),
      studentService.countStudents(),
    ]);
    const data = {
      students,
      pagination: buildPagination(page, limit, totalStudents),
    };
    return successResponse(res, data, "Students found successfully", 200);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getStudentStatsBySession = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const stats = await studentService.getStudentStatsBySession(sessionId);
    return successResponse(
      res,
      stats,
      "Student stats retrieved successfully",
      200,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { createStudent, findStudents, getStudentStatsBySession };
