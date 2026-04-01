// Enrollment repository

const prisma = require("../../config/prisma");

const createEnrollment = async (enrollmentData) => {
  return await prisma.enrollment.create({ data: enrollmentData });
};

const createEnrollmentTransaction = async (tx, enrollmentData) => {
  return await tx.enrollment.create({ data: enrollmentData });
};

const updateEnrollmentTransaction = async (tx, id, enrollmentData) => {
  return await tx.enrollment.update({
    where: { id },
    data: enrollmentData,
  });
};

const findEnrollmentById = async (id) => {
  return await prisma.enrollment.findUnique({
    where: { id },
    include: {
      session: true,
      semester: true,
      admission: {
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mobile: true,
              email: true,
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
      },
      feePayments: {
        include: {
          feeComponent: true,
        },
        orderBy: {
          paymentDate: "desc",
        },
      },
    },
  });
};

const findEnrollmentByAdmissionAndSemester = async (
  admissionId,
  semesterId,
  db = prisma,
) => {
  return await db.enrollment.findUnique({
    where: {
      admissionId_semesterId: {
        admissionId,
        semesterId,
      },
    },
  });
};

const findActiveEnrollmentByAdmission = async (admissionId, db = prisma) => {
  return await db.enrollment.findFirst({
    where: {
      admissionId,
      status: "ACTIVE",
    },
    include: {
      semester: true,
      admission: {
        select: {
          id: true,
          admissionSessionId: true,
        },
      },
    },
  });
};

const findEnrollments = async (params) => {
  return await prisma.enrollment.findMany({
    ...params,
    include: {
      session: {
        select: {
          id: true,
          name: true,
        },
      },
      semester: {
        select: {
          id: true,
          number: true,
          startDate: true,
          endDate: true,
        },
      },
      admission: {
        select: {
          id: true,
          enrollmentNo: true,
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
        },
      },
    },
  });
};

const countEnrollments = async (params) => {
  return await prisma.enrollment.count(params);
};

const updateEnrollment = async (id, enrollmentData) => {
  return await prisma.enrollment.update({
    where: { id },
    data: enrollmentData,
  });
};

const deleteEnrollment = async (id) => {
  return await prisma.enrollment.delete({
    where: { id },
  });
};

module.exports = {
  createEnrollment,
  createEnrollmentTransaction,
  findEnrollmentById,
  findEnrollmentByAdmissionAndSemester,
  findActiveEnrollmentByAdmission,
  findEnrollments,
  countEnrollments,
  updateEnrollment,
  deleteEnrollment,
  updateEnrollmentTransaction,
};
