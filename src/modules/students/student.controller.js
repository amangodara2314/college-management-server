// Student controller
const { startsWith } = require("zod");
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
  if (!data.semesterId || !data.semesterId.trim()) {
    return "Semester is required";
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
      semesterId,
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
      semesterId,
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
    const { search, page, limit, courseId, sessionId, semesterId } = req.query;

    const result = await studentService.findStudents({
      search,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      courseId,
      sessionId,
      semesterId,
    });

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getStudentById = async (req, res) => {
  try {
    const studentId = req.params.id;

    if (!studentId) {
      return errorResponse(res, "Student id is required", 400);
    }

    const student = await studentService.getStudentById(studentId);
    return successResponse(
      res,
      student,
      "Student details fetched successfully",
      200,
    );
  } catch (error) {
    const statusCode = error.message === "Student not found" ? 404 : 500;
    return errorResponse(res, error.message, statusCode);
  }
};

const updateStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    if (!studentId) {
      return errorResponse(res, "Student id is required", 400);
    }

    if (
      typeof req.body.gender !== "undefined" &&
      !genders.includes(req.body.gender)
    ) {
      return errorResponse(res, "Invalid gender", 400);
    }

    if (
      typeof req.body.category !== "undefined" &&
      !categories.includes(req.body.category)
    ) {
      return errorResponse(res, "Invalid category", 400);
    }

    if (
      typeof req.body.religion !== "undefined" &&
      !religions.includes(req.body.religion)
    ) {
      return errorResponse(res, "Invalid religion", 400);
    }

    if (
      typeof req.body.firstName !== "undefined" &&
      (!req.body.firstName || String(req.body.firstName).trim() === "")
    ) {
      return errorResponse(res, "First name is required", 400);
    }

    const student = await studentService.updateStudent(studentId, req.body);

    return successResponse(res, student, "Student updated successfully", 200);
  } catch (error) {
    if (error.message === "Student not found") {
      return errorResponse(res, error.message, 404);
    }

    if (error.message === "At least one field is required to update student") {
      return errorResponse(res, error.message, 400);
    }

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

const deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    if (!studentId) {
      return errorResponse(res, "Student id is required", 400);
    }

    await studentService.deleteStudent(studentId);
    return successResponse(res, null, "Student deleted successfully", 200);
  } catch (error) {
    if (error.message === "Student not found") {
      return errorResponse(res, error.message, 404);
    }

    if (error.message.startsWith("Cannot delete student")) {
      return errorResponse(res, error.message, 400);
    }

    return errorResponse(res, error.message);
  }
};

module.exports = {
  createStudent,
  findStudents,
  getStudentById,
  updateStudent,
  getStudentStatsBySession,
  deleteStudent,
};
