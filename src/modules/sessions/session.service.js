const sessionRepository = require("./session.repository");

const createSession = async (data) => {
  const session = await sessionRepository.createSession(data);
  return session;
};

const updateSession = async (id, data) => {
  const session = await sessionRepository.updateSession(id, data);
  return session;
};

const getSessions = async (query) => {
  const { where } = query;
  const [sessions, totalCount] = await Promise.all([
    sessionRepository.findAllSessions(query),
    sessionRepository.countSessions({ where }),
  ]);
  return { sessions, totalCount };
};

const getSessionById = async (id) => {
  const session = await sessionRepository.findSessionById(id);
  return session;
};

const deleteSession = async (id) => {
  await sessionRepository.deleteSession(id);
};

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
};
