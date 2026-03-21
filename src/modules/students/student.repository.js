// Student repository

const prisma = require("../../config/prisma");

const findStudentById = async (id) => {
  return await prisma.student.findUnique({ where: { id } });
};

const createStudent = async (db, studentData) => {
  return await db.student.create({
    data: studentData,
  });
};

const updateStudent = async (id, studentData) => {
  return await prisma.student.update({
    where: { id },
    data: studentData,
  });
};

const findStudents = async (query) => {
  return await prisma.student.findMany(query);
};

const countStudents = async (query) => {
  return await prisma.student.count(query);
};

const getStudentStatsBySession = async (sessionId) => {
  return prisma.student.groupBy({
    by: ["gender"],
    _count: {
      gender: true,
    },
    where: {
      admissions: {
        some: {
          admissionSessionId: sessionId,
        },
      },
    },
  });
};

module.exports = {
  findStudentById,
  createStudent,
  findStudents,
  countStudents,
  getStudentStatsBySession,
  updateStudent,
};
