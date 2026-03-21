// Admission repository

const prisma = require("../../config/prisma");

const createAdmission = async (admissionData) => {
  return await prisma.admission.create({ data: admissionData });
};

const createAdmissionTransaction = async (tx, admissionData) => {
  return await tx.admission.create({ data: admissionData });
};

const findAdmissionById = async (id) => {
  return await prisma.admission.findUnique({
    where: { id },
    include: {
      student: true,
      course: true,
      session: true,
      studentSubjects: {
        include: {
          subject: true,
        },
      },
      enrollments: true,
    },
  });
};

const findByStudentCourseSession = async (studentId, courseId, sessionId) => {
  return await prisma.admission.findFirst({
    where: { studentId, courseId, admissionSessionId: sessionId },
  });
};

const findAdmission = async (params) => {
  return await prisma.admission.findMany({
    ...params,
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mobile: true,
        },
      },
      course: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      session: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

const countAdmissions = async (params) => {
  return await prisma.admission.count(params);
};

const updateAdmission = async (id, admissionData) => {
  return await prisma.admission.update({
    where: { id },
    data: admissionData,
  });
};

const deleteAdmission = async (id) => {
  return await prisma.admission.delete({
    where: { id },
  });
};

module.exports = {
  createAdmission,
  findAdmission,
  countAdmissions,
  findAdmissionById,
  findByStudentCourseSession,
  createAdmissionTransaction,
  updateAdmission,
  deleteAdmission,
};
