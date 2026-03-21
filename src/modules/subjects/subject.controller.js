const { successResponse, errorResponse } = require("../../utils/apiResponse");
const subjectService = require("./subject.service");

/**
 * Create a new subject
 * POST /api/subjects
 */
const createSubject = async (req, res, next) => {
  try {
    const { name, code } = req.body;

    // Validation
    if (!name || name.trim() === "") {
      return errorResponse(res, "Subject name is required", 400);
    }

    const subject = await subjectService.createSubject({ name, code });

    return successResponse(res, subject, "Subject created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

/**
 * Get all subjects with pagination
 * GET /api/subjects
 */
const getAllSubjects = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;

    const result = await subjectService.getAllSubjects({
      search,
      page,
      limit,
    });

    return successResponse(res, result, "Subjects retrieved successfully", 200);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

/**
 * Get subject by ID
 * GET /api/subjects/:id
 */
const getSubjectById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const subject = await subjectService.getSubjectById(id);

    return successResponse(res, subject, "Subject retrieved successfully", 200);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

/**
 * Update subject
 * PUT /api/subjects/:id
 */
const updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    // Validation
    if (name && name.trim() === "") {
      return res
        .status(400)
        .json(ApiResponse.error("Subject name cannot be empty", 400));
    }

    const subject = await subjectService.updateSubject(id, { name, code });

    return successResponse(res, subject, "Subject updated successfully", 200);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
/**
 * Delete subject
 * DELETE /api/subjects/:id
 */
const deleteSubject = async (req, res, next) => {
  try {
    const { id } = req.params;

    await subjectService.deleteSubject(id);

    return successResponse(res, null, "Subject deleted successfully", 200);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
