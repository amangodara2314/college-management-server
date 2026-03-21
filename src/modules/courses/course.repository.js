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

module.exports = { createCourse, findCourseById, findCourses };
