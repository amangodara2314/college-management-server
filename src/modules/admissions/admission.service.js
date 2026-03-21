// Admission service
const studentRepository = require("../students/student.repository");
const courseRepository = require("../courses/course.repository");
const admissionRepository = require("../admissions/admission.repository");
const sessionRepository = require("../sessions/session.repository");
const { generateEnrollmentNo } = require("../../utils/generateEnrollmentNo");
const prisma = require("../../config/prisma");

const createAdmission = async (data) => {
  const [student, course, session] = await Promise.all([
    studentRepository.findStudentById(data.studentId),
    courseRepository.findCourseById(data.courseId),
    sessionRepository.findSessionById(data.sessionId),
  ]);

  if (!student) throw new Error("Student not found");
  if (!course) throw new Error("Course not found");
  if (!session) throw new Error("Session not found");

  const existingAdmission =
    await admissionRepository.findByStudentCourseSession(
      student.id,
      course.id,
      session.id,
    );

  if (existingAdmission) {
    throw new Error(
      "Student is already enrolled in this course for this session",
    );
  }

  const startYear = session.name.split("-")[0];

  let admission;
  let enrollment;

  await prisma.$transaction(async (tx) => {
    const enrollmentNumber = await generateEnrollmentNo(
      tx,
      course.code,
      startYear,
    );

    admission = await tx.admission.create({
      data: {
        enrollmentNo: enrollmentNumber,
        courseId: course.id,
        studentId: student.id,
        admissionDate: data.admissionDate || new Date().toISOString(),
        admissionSessionId: data.sessionId,
      },
    });

    enrollment = await tx.enrollment.create({
      data: {
        admissionId: admission.id,
        sessionId: session.id,
        year: data.year,
      },
    });

    await tx.studentSubject.createMany({
      data: data.subjectIds.map((subjectId) => ({
        subjectId,
        admissionId: admission.id,
      })),
    });
  });

  return { admission, enrollment };
};

const getAdmissions = async (query) => {
  const { where } = query;
  const [admissions, totalCount] = await Promise.all([
    admissionRepository.findAdmission(query),
    admissionRepository.countAdmissions({ where }),
  ]);

  return { admissions, totalCount };
};

const getAdmissionById = async (id) => {
  return admissionRepository.findAdmissionById(id);
};

const updateAdmission = async (id, data) => {
  const payload = {};

  if (typeof data.status !== "undefined") {
    payload.status = data.status;
  }

  if (typeof data.admissionDate !== "undefined") {
    payload.admissionDate = data.admissionDate;
  }

  return admissionRepository.updateAdmission(id, payload);
};

const deleteAdmission = async (id) => {
  return admissionRepository.deleteAdmission(id);
};

module.exports = {
  createAdmission,
  getAdmissions,
  getAdmissionById,
  updateAdmission,
  deleteAdmission,
};
