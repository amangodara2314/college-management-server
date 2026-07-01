const buildStudentWhere = ({ courseId, sessionId, semesterId, search, gender, category }) => {
  const where = {};

  // 🔍 Search filter (top-level, Student fields)
  if (search && search.trim() !== "") {
    where.OR = [
      {
        firstName: {
          startsWith: search,
          mode: "insensitive",
        },
      },
      {
        lastName: {
          startsWith: search,
          mode: "insensitive",
        },
      },
    ];
  }

  // 🚻 Gender filter (top-level Student field)
  if (gender && gender.trim() !== "") {
    where.gender = gender.trim().toUpperCase();
  }

  // 📂 Category filter (top-level Student field)
  if (category && category.trim() !== "") {
    where.category = category.trim().toUpperCase();
  }

  // 🎯 Build admission-level filter
  if (courseId || sessionId || semesterId) {
    const admissionFilter = {};

    // Course filter
    if (courseId) {
      admissionFilter.courseId = courseId;
    }

    // Enrollment filter
    if (sessionId || semesterId) {
      const enrollmentFilter = {};

      if (sessionId) {
        enrollmentFilter.sessionId = sessionId;
      }

      if (semesterId) {
        enrollmentFilter.semesterId = semesterId;
      }

      admissionFilter.enrollments = {
        some: enrollmentFilter,
      };
    }

    // Attach to main where
    where.admissions = {
      some: admissionFilter,
    };
  }

  return where;
};

module.exports = {
  buildStudentWhere,
};
