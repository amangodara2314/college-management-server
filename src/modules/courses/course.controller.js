const { errorResponse, successResponse } = require("../../utils/apiResponse");
const { generateCourseCode } = require("../../utils/generateCourseCode");
const courseService = require("./course.service");

const createCourse = async (req, res) => {
  try {
    const { name, durationYears, totalSemesters, code } = req.body;
    if (!name || !durationYears || !totalSemesters) {
      return errorResponse(
        res,
        "Name, Duration and Total Number of Semesters are required",
        400,
      );
    }

    if (
      typeof durationYears !== "number" ||
      typeof totalSemesters !== "number"
    ) {
      return errorResponse(
        res,
        "Duration years and total semester should be numbers",
        400,
      );
    }
    const generatedCode = code || generateCourseCode(name);
    const result = await courseService.createCourse({
      name,
      durationYears,
      totalSemesters,
      code: generatedCode,
    });
    return successResponse(res, result, "Course created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const findCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return errorResponse(res, "Id is required", 400);
    }
    const response = await courseService.findCourseById(id);
    if (!response) {
      return errorResponse(res, "Course not found", 404);
    }
    return successResponse(res, response, "Course retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const findCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const query = { skip, take: parseInt(limit) };
    const response = await courseService.findCourses(query);
    return successResponse(res, response, "Courses retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return errorResponse(res, "Id is required", 400);
    }

    const course = await courseService.updateCourse(id, req.body);
    return successResponse(res, course, "Course updated successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { createCourse, findCourseById, findCourses, updateCourse };
