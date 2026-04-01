// Semester repository

const prisma = require("../../config/prisma");

const createSemester = async (semesterData) => {
  return await prisma.semester.create({ data: semesterData });
};

const findSemesterById = async (id, db = prisma) => {
  return await db.semester.findUnique({
    where: { id },
    include: {
      session: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

const findBySessionAndNumber = async (sessionId, number, db = prisma) => {
  return await db.semester.findUnique({
    where: {
      sessionId_number: {
        sessionId,
        number,
      },
    },
  });
};

const findSemesters = async (params) => {
  return await prisma.semester.findMany({
    ...params,
    include: {
      session: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

const countSemesters = async (params) => {
  return await prisma.semester.count(params);
};

const updateSemester = async (id, semesterData) => {
  return await prisma.semester.update({
    where: { id },
    data: semesterData,
  });
};

const deleteSemester = async (id) => {
  return await prisma.semester.delete({
    where: { id },
  });
};

module.exports = {
  createSemester,
  findSemesterById,
  findBySessionAndNumber,
  findSemesters,
  countSemesters,
  updateSemester,
  deleteSemester,
};
