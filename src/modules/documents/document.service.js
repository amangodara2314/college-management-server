const { uploadSingle, deleteFile } = require("../../utils/cloudinaryUpload");
const documentRepository = require("./document.repository");
const studentRepository = require("../students/student.repository");

const createDocument = async (data) => {
  const student = await studentRepository.findStudentById(data.studentId);
  if (!student) {
    throw new Error("Student not found");
  }
  const uploadedDocument = await uploadSingle(data.file);
  let document;
  try {
    document = await documentRepository.createStudentDocument({
      documentTypeId: data.documentTypeId,
      fileUrl: uploadedDocument.secure_url,
      publicId: uploadedDocument.public_id,
      resourceType: uploadedDocument.resource_type,
      format: uploadedDocument.format,
      fileName: uploadedDocument.original_filename,
      fileSize: uploadedDocument.bytes,
      studentId: data.studentId,
    });
  } catch (error) {
    (deleteFile(uploadedDocument.public_id).catch((err) => {
      console.error(
        `Failed to delete file ${uploadedDocument.public_id} during rollback:`,
        err,
      );
    }),
      console.error(
        "Error creating document record, rolled back upload:",
        error,
      ));
    throw new Error("Failed to create document");
  }
  return document;
};

const createDocuments = async (documents) => {
  const createdDocuments =
    await documentRepository.createStudentDocuments(documents);
  return createdDocuments;
};

const getDocumentTypes = async (query) => {
  return documentRepository.getDocumentTypes(query);
};

const createDocumentType = async (data) => {
  const documentType = await documentRepository.createDocumentType(data);
  return documentType;
};

module.exports = {
  createDocument,
  createDocuments,
  getDocumentTypes,
  createDocumentType,
};
