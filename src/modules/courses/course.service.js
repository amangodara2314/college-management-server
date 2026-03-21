const courseRepository = require("./course.repository");

const createCourse = async (data) => {
  const course = await courseRepository.createCourse(data);
  return course;
};

const findCourseById = async (id) => {
  const course = await courseRepository.findCourseById(id);
  return course;
};

const findCourses = async (query) => {
  const courses = await courseRepository.findCourses(query);
  return courses;
};

module.exports = { createCourse, findCourseById, findCourses };
