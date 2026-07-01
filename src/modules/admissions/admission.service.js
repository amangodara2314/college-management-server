// Admission service
const studentRepository = require("../students/student.repository");
const courseRepository = require("../courses/course.repository");
const admissionRepository = require("../admissions/admission.repository");
const sessionRepository = require("../sessions/session.repository");
const semesterRepository = require("../semesters/semester.repository");
const { generateEnrollmentNo } = require("../../utils/generateEnrollmentNo");
const prisma = require("../../config/prisma");
const { Mode } = require("@prisma/client");

const createAdmission = async (data) => {
  if (!data.mode || Mode[data.mode] === undefined) {
    data.mode = Mode.COLLEGIATE; // Default to COLLEGIATE if mode is not provided or invalid
  }
  const [student, course, session, semester] = await Promise.all([
    studentRepository.findStudentById(data.studentId),
    courseRepository.findCourseById(data.courseId),
    sessionRepository.findSessionById(data.sessionId),
    semesterRepository.findSemesterById(data.semesterId),
  ]);

  if (!student) throw new Error("Student not found");
  if (!course) throw new Error("Course not found");
  if (!session) throw new Error("Session not found");
  if (!semester) throw new Error("Semester not found");

  if (semester.sessionId !== session.id) {
    throw new Error("Semester does not belong to selected session");
  }

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
        mode: data.mode,
      },
    });

    enrollment = await tx.enrollment.create({
      data: {
        admissionId: admission.id,
        sessionId: session.id,
        semesterId: semester.id,
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

  if (data.mode || Mode[data.mode] === undefined) {
    data.mode = Mode.COLLEGIATE; // Default to COLLEGIATE if mode is not provided or invalid
  }

  return admissionRepository.updateAdmission(id, payload);
};

const deleteAdmission = async (id) => {
  return admissionRepository.deleteAdmission(id);
};

const updateStudentSubjects = async (admissionId, subjectIds) => {
  if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
    throw new Error("At least one subject is required");
  }

  const admission = await admissionRepository.findAdmissionById(admissionId);
  if (!admission) throw new Error("Admission not found");

  await prisma.$transaction(async (tx) => {
    await tx.studentSubject.deleteMany({ where: { admissionId } });
    await tx.studentSubject.createMany({
      data: subjectIds.map((subjectId) => ({ admissionId, subjectId })),
    });
  });

  // Return the updated admission with subjects
  return admissionRepository.findAdmissionById(admissionId);
};

module.exports = {
  createAdmission,
  getAdmissions,
  getAdmissionById,
  updateAdmission,
  updateStudentSubjects,
  deleteAdmission,
};
