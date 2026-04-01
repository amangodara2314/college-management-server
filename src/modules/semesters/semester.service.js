// Semester service

const sessionRepository = require("../sessions/session.repository");
const semesterRepository = require("./semester.repository");

const createSemester = async (data) => {
  const session = await sessionRepository.findSessionById(data.sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  const existingSemester = await semesterRepository.findBySessionAndNumber(
    data.sessionId,
    data.number,
  );

  if (existingSemester) {
    throw new Error("Semester number already exists in this session");
  }

  return await semesterRepository.createSemester({
    sessionId: data.sessionId,
    number: data.number,
    startDate: data.startDate,
    endDate: data.endDate,
  });
};

const getSemesters = async (query) => {
  const { where } = query;

  const [semesters, totalCount] = await Promise.all([
    semesterRepository.findSemesters(query),
    semesterRepository.countSemesters({ where }),
  ]);

  return { semesters, totalCount };
};

const getSemesterById = async (id) => {
  return await semesterRepository.findSemesterById(id);
};

const updateSemester = async (id, data) => {
  const existingSemester = await semesterRepository.findSemesterById(id);

  if (!existingSemester) {
    throw new Error("Semester not found");
  }

  const payload = {};

  if (typeof data.number !== "undefined") {
    const duplicate = await semesterRepository.findBySessionAndNumber(
      existingSemester.sessionId,
      data.number,
    );

    if (duplicate && duplicate.id !== id) {
      throw new Error("Semester number already exists in this session");
    }

    payload.number = data.number;
  }

  if (typeof data.startDate !== "undefined") {
    payload.startDate = data.startDate;
  }

  if (typeof data.endDate !== "undefined") {
    payload.endDate = data.endDate;
  }

  return await semesterRepository.updateSemester(id, payload);
};

const deleteSemester = async (id) => {
  return await semesterRepository.deleteSemester(id);
};

module.exports = {
  createSemester,
  getSemesters,
  getSemesterById,
  updateSemester,
  deleteSemester,
};
