const prisma = require("../../config/prisma");
const { uploadMultiple, deleteFile } = require("../../utils/cloudinaryUpload");
const studentRepository = require("./student.repository");
const documentRepository = require("../documents/document.repository");
const sessionRepository = require("../sessions/session.repository");
const courseRepository = require("../courses/course.repository");
const admissionRepository = require("../admissions/admission.repository");
const enrollmentRepository = require("../enrollments/enrollment.repository");
const subjectRepository = require("../subjects/subject.repository");
const semesterRepository = require("../semesters/semester.repository");
const { generateEnrollmentNo } = require("../../utils/generateEnrollmentNo");
const { convertToUtc } = require("../../utils/dateFormat");
const { buildPagination } = require("../../utils/pagination");
const { buildStudentWhere } = require("../../utils/buildStudentWhere");

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

  const [course, session, semester] = await Promise.all([
    courseRepository.findCourseById(data.courseId),
    sessionRepository.findSessionById(data.sessionId),
    semesterRepository.findSemesterById(data.semesterId),
  ]);

  if (!course) throw new Error("Course not found");
  if (!session) throw new Error("Session not found");
  if (!semester) throw new Error("Semester not found");

  if (semester.sessionId !== session.id) {
    throw new Error("Semester does not belong to selected session");
  }

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
        semesterId: semester.id,
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

const findStudents = async ({
  search,
  page,
  limit,
  courseId,
  sessionId,
  semesterId,
}) => {
  const skip = (page - 1) * limit;

  const where = buildStudentWhere({
    search,
    courseId,
    sessionId,
    semesterId,
  });

  const query = {
    where,
    skip,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
  };

  const [students, totalStudents] = await Promise.all([
    studentRepository.findStudents(query),
    studentRepository.countStudents({ where }),
  ]);

  return {
    students,
    pagination: buildPagination(page, limit, totalStudents),
  };
};

const getStudentById = async (id) => {
  const student = await studentRepository.findStudentById(id, {
    include: {
      documents: {
        include: {
          documentType: true,
        },
        orderBy: {
          uploadedAt: "desc",
        },
      },
      notes: {
        orderBy: {
          createdAt: "desc",
        },
      },
      marks: {
        include: {
          subject: true,
          exam: {
            include: {
              session: true,
              semester: true,
            },
          },
        },
        orderBy: {
          attempt: "desc",
        },
      },
      admissions: {
        include: {
          course: true,
          session: true,
          studentSubjects: {
            include: {
              subject: true,
            },
          },
          enrollments: {
            include: {
              session: true,
              semester: true,
              feePayments: {
                include: {
                  feeComponent: true,
                },
                orderBy: {
                  paymentDate: "desc",
                },
              },
            },
            orderBy: {
              year: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const totalFeePaid = student.admissions.reduce(
    (admissionTotal, admission) => {
      const enrollmentTotal = admission.enrollments.reduce(
        (sum, enrollment) => {
          const paidInEnrollment = enrollment.feePayments.reduce(
            (paymentSum, payment) => paymentSum + payment.amount,
            0,
          );
          return sum + paidInEnrollment;
        },
        0,
      );
      return admissionTotal + enrollmentTotal;
    },
    0,
  );

  return {
    ...student,
    summary: {
      admissionsCount: student.admissions.length,
      documentsCount: student.documents.length,
      marksCount: student.marks.length,
      totalFeePaid,
    },
  };
};

const updateStudent = async (id, data) => {
  const existingStudent = await studentRepository.findStudentById(id);
  if (!existingStudent) {
    throw new Error("Student not found");
  }

  const payload = {};

  if (typeof data.firstName !== "undefined") {
    payload.firstName = String(data.firstName).trim();
  }

  if (typeof data.lastName !== "undefined") {
    payload.lastName = data.lastName;
  }

  if (typeof data.fatherName !== "undefined") {
    payload.fatherName = data.fatherName;
  }

  if (typeof data.dob !== "undefined") {
    payload.dob = data.dob ? convertToUtc(data.dob) : null;
  }

  if (typeof data.mobile !== "undefined") {
    payload.mobile = data.mobile;
  }

  if (typeof data.email !== "undefined") {
    payload.email = data.email;
  }

  if (typeof data.address !== "undefined") {
    payload.address = data.address;
  }

  if (typeof data.aadhar !== "undefined") {
    payload.aadhar = data.aadhar;
  }

  if (typeof data.janAadhar !== "undefined") {
    payload.janAadhar = data.janAadhar;
  }

  if (typeof data.ssoId !== "undefined") {
    payload.ssoId = data.ssoId;
  }

  if (typeof data.ssoIdPassword !== "undefined") {
    payload.ssoIdPassword = data.ssoIdPassword;
  }

  if (typeof data.otr !== "undefined") {
    payload.otr = data.otr;
  }

  if (typeof data.gender !== "undefined") {
    payload.gender = data.gender;
  }

  if (typeof data.category !== "undefined") {
    payload.category = data.category;
  }

  if (typeof data.subCategory !== "undefined") {
    payload.subCategory = data.subCategory;
  }

  if (typeof data.religion !== "undefined") {
    payload.religion = data.religion;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("At least one field is required to update student");
  }

  return await studentRepository.updateStudent(id, payload);
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

const deleteStudent = async (id) => {
  const student = await studentRepository.findStudentById(id, {
    include: {
      documents: {
        select: {
          publicId: true,
        },
      },
      _count: {
        select: {
          marks: true,
        },
      },
    },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  if (student._count.marks > 0) {
    throw new Error(
      "Cannot delete student. Exam marks exist for this student. Please remove marks first.",
    );
  }

  await studentRepository.deleteStudent(id);

  await Promise.all(
    student.documents
      .filter((doc) => doc.publicId)
      .map((doc) =>
        deleteFile(doc.publicId).catch((err) => {
          console.error(
            `Failed to delete Cloudinary file ${doc.publicId} after student deletion:`,
            err,
          );
        }),
      ),
  );
};

module.exports = {
  createStudent,
  findStudents,
  getStudentById,
  updateStudent,
  countStudents,
  getStudentStatsBySession,
  deleteStudent,
};
