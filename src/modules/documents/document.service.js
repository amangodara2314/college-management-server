const documentRepository = require("./document.repository");

const createDocument = async (data) => {
  const document = await documentRepository.createStudentDocument({
    data,
  });
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
