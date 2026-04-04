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

const updateCourse = async (id, data) => {
  let { code, ...rest } = data;
  const existingCourse = await courseRepository.findCourseById(id);
  if (!existingCourse) {
    throw new Error("Course not found");
  }
  if (existingCourse.code !== data.code) {
    const existingCourseWithCode = await courseRepository.findCourseByCode(
      data.code,
    );
    if (existingCourseWithCode) {
      throw new Error("Course code already exists");
    }
  }
  const course = await courseRepository.updateCourse(id, { code, ...rest });
  return course;
};

module.exports = { createCourse, findCourseById, findCourses, updateCourse };
