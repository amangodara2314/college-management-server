const prisma = require("../../config/prisma");

const createStudentDocument = async (data) => {
  return prisma.studentDocument.create({ data });
};
const createTransactionDocuments = async (db, data) => {
  return db.studentDocument.createMany({ data });
};
const createStudentDocuments = async (documents) => {
  return prisma.studentDocument.createMany({
    data: documents,
  });
};

const findDocumentsByStudentId = async (studentId) => {
  return prisma.studentDocument.findMany({
    where: { studentId },
  });
};

const deleteDocumentById = async (id) => {
  return prisma.studentDocument.delete({
    where: { id },
  });
};

const createDocumentType = async (data) => {
  return prisma.documentType.create({ data });
};

const getDocumentTypes = async (query) => {
  return prisma.documentType.findMany(query);
};

module.exports = {
  createStudentDocument,
  createStudentDocuments,
  findDocumentsByStudentId,
  deleteDocumentById,
  createDocumentType,
  getDocumentTypes,
  createTransactionDocuments,
};
