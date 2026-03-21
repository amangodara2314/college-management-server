const prisma = require("../../config/prisma");
const { uploadMultiple, deleteFile } = require("../../utils/cloudinaryUpload");
const studentRepository = require("./student.repository");
const documentRepository = require("../documents/document.repository");
const sessionRepository = require("../sessions/session.repository");
const courseRepository = require("../courses/course.repository");
const admissionRepository = require("../admissions/admission.repository");
const enrollmentRepository = require("../enrollments/enrollment.repository");
const subjectRepository = require("../subjects/subject.repository");
const { generateEnrollmentNo } = require("../../utils/generateEnrollmentNo");
const { convertToUtc } = require("../../utils/dateFormat");

// Student service
const createStudent = async (data) => {
  const files = data.documents || [];
  const documentTypes = data.documentTypes || [];

  const studentData = {
    firstName: data?.firstName,
    lastName: data?.lastName,
    fatherName: data?.fatherName,
    dob: convertToUtc(data?.dob),
    mobile: data?.mobile,
    email: data?.email,
    address: data?.address,
    aadhar: data?.aadhar,
    janAadhar: data?.janAadhar,
    ssoId: data?.ssoId,
    ssoIdPassword: data?.ssoIdPassword,
    otr: data?.otr,
    gender: data?.gender,
    category: data?.category,
    subCategory: data?.subCategory,
    religion: data?.religion,
  };

  const [course, session] = await Promise.all([
    courseRepository.findCourseById(data.courseId),
    sessionRepository.findSessionById(data.sessionId),
  ]);

  if (!course) throw new Error("Course not found");
  if (!session) throw new Error("Session not found");

  let student;
  let admission;
  let enrollment;
  let uploadedDocuments = [];

  const startYear = session.name.split("-")[0];

  try {
    if (files.length > 0) {
      uploadedDocuments = await uploadMultiple(files);
    }
    await prisma.$transaction(async (tx) => {
      student = await studentRepository.createStudent(tx, studentData);

      if (uploadedDocuments.length > 0) {
        const studentDocuments = uploadedDocuments.map((file, index) => ({
          studentId: student.id,
          documentTypeId: documentTypes[index],
          fileUrl: file.secure_url,
          publicId: file.public_id,
          resourceType: file.resource_type,
          format: file.format,
          fileName: file.original_filename,
          fileSize: file.bytes,
        }));

        await documentRepository.createTransactionDocuments(
          tx,
          studentDocuments,
        );
      }

      const enrollmentNumber = await generateEnrollmentNo(
        tx,
        course.code,
        startYear,
      );

      admission = await admissionRepository.createAdmissionTransaction(tx, {
        enrollmentNo: enrollmentNumber,
        courseId: course.id,
        studentId: student.id,
        admissionDate:
          convertToUtc(data.admissionDate) || new Date().toISOString(),
        admissionSessionId: data.sessionId,
      });

      enrollment = await enrollmentRepository.createEnrollmentTransaction(tx, {
        admissionId: admission.id,
        sessionId: session.id,
        year: parseInt(data.year),
      });

      const subjects = data.subjectIds.map((subjectId) => ({
        subjectId,
        admissionId: admission.id,
      }));

      await subjectRepository.createStudentSubjectTransaction(tx, subjects);
    });
  } catch (error) {
    // rollback cloudinary uploads
    await Promise.all(
      uploadedDocuments.map((file) =>
        deleteFile(file.public_id).catch((err) => {
          console.error(
            `Failed to delete file ${file.public_id} during rollback:`,
            err,
          );
        }),
      ),
    );

    throw error;
  }

  return student;
};

const findStudents = async (query) => {
  const students = await studentRepository.findStudents(query);
  return students;
};

const countStudents = async (query) => {
  const count = await studentRepository.countStudents(query);
  return count;
};

const getStudentStatsBySession = async (sessionId) => {
  const stats = await studentRepository.getStudentStatsBySession(sessionId);

  const summary = {
    total: 0,
    male: 0,
    female: 0,
  };

  for (const item of stats) {
    const count = item?._count?.gender || 0;
    summary.total += count;

    if (item.gender === "MALE") {
      summary.male += count;
    }

    if (item.gender === "FEMALE") {
      summary.female += count;
    }
  }

  return summary;
};

module.exports = {
  createStudent,
  findStudents,
  countStudents,
  getStudentStatsBySession,
};
