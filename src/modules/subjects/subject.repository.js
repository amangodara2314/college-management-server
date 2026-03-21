const prisma = require("../../config/prisma");

/**
 * Create a new subject
 */
const createSubject = async (data) => {
  return await prisma.subject.create({ data });
};

const createStudentSubjectTransaction = async (tx, data) => {
  return await tx.studentSubject.createMany({ data });
};

/**
 * Get all subjects with optional filters
 */
const getAllSubjects = async (filters = {}) => {
  const { search, page = 1, limit = 10 } = filters;

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [subjects, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            studentSubjects: true,
            marks: true,
          },
        },
      },
    }),
    prisma.subject.count({ where }),
  ]);

  return {
    subjects,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get subject by ID
 */
const getSubjectById = async (id) => {
  return await prisma.subject.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          studentSubjects: true,
          marks: true,
        },
      },
    },
  });
};

/**
 * Get subject by code
 */
const getSubjectByCode = async (code) => {
  return await prisma.subject.findUnique({
    where: { code },
  });
};

/**
 * Update subject
 */
const updateSubject = async (id, data) => {
  return await prisma.subject.update({
    where: { id },
    data,
  });
};

/**
 * Delete subject
 */
const deleteSubject = async (id) => {
  return await prisma.subject.delete({
    where: { id },
  });
};

/**
 * Check if subject exists by name
 */
const subjectExistsByName = async (name, excludeId = null) => {
  const where = {
    name: {
      equals: name,
      mode: "insensitive",
    },
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const subject = await prisma.subject.findFirst({ where });
  return !!subject;
};

/**
 * Check if subject code exists
 */
const codeExists = async (code, excludeId = null) => {
  const where = { code };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const subject = await prisma.subject.findFirst({ where });
  return !!subject;
};

module.exports = {
  createSubject,
  createStudentSubjectTransaction,
  getAllSubjects,
  getSubjectById,
  getSubjectByCode,
  updateSubject,
  deleteSubject,
  subjectExistsByName,
  codeExists,
};
