// Enrollment repository

const prisma = require("../../config/prisma");

const createEnrollment = async (enrollmentData) => {
  return await prisma.enrollment.create({ data: enrollmentData });
};

const createEnrollmentTransaction = async (tx, enrollmentData) => {
  return await tx.enrollment.create({ data: enrollmentData });
};

module.exports = {
  createEnrollment,
  createEnrollmentTransaction,
};
