const { successResponse, errorResponse } = require("../../utils/apiResponse");
const documentService = require("./document.service");

const createDocument = async (req, res) => {
  try {
    const file = req.file;
    const studentId = req.body.studentId;
    const documentTypeId = req.body.documentTypeId;
    if (!file) {
      return errorResponse(res, "Document file is required", 400);
    }
    if (!studentId) {
      return errorResponse(res, "Student ID is required", 400);
    }
    if (!documentTypeId) {
      return errorResponse(res, "Document type ID is required", 400);
    }

    const result = await documentService.createDocument({
      studentId,
      file,
      documentTypeId,
    });
    return successResponse(res, result, "Document created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const createDocuments = async (req, res) => {
  try {
    const documents = req.body.documents;
    if (!Array.isArray(documents) || documents.length === 0) {
      return errorResponse(res, "Documents array is required", 400);
    }
    const result = await documentService.createDocuments(documents);
    return successResponse(res, result, "Documents created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getDocumentTypes = async (req, res) => {
  try {
    const { name } = req.query || {};
    const query = { where: {} };
    if (name && name.trim() !== "") {
      query.where.name = {
        contains: name,
        mode: "insensitive",
      };
    }

    const result = await documentService.getDocumentTypes(query);
    return successResponse(
      res,
      result,
      "Document types retrieved successfully",
      200,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const createDocumentType = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return errorResponse(res, "Document type name is required", 400);
    }
    const result = await documentService.createDocumentType(req.body);
    return successResponse(
      res,
      result,
      "Document type created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  createDocument,
  createDocuments,
  getDocumentTypes,
  createDocumentType,
};
