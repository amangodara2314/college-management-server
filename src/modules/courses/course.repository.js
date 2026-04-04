const prisma = require("../../config/prisma");

const createCourse = async (courseData) => {
  return await prisma.course.create({
    data: courseData,
  });
};

const findCourseById = async (id) => {
  return await prisma.course.findUnique({ where: { id } });
};

const findCourses = async (query) => {
  return await prisma.course.findMany(query);
};

const findCourseByCode = async (code) => {
  return await prisma.course.findUnique({ where: { code } });
};

const updateCourse = async (id, courseData) => {
  return await prisma.course.update({
    where: {
      id,
    },
    data: courseData,
  });
};

module.exports = {
  createCourse,
  findCourseById,
  findCourses,
  updateCourse,
  findCourseByCode,
};
