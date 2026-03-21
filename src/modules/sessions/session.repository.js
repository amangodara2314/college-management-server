const prisma = require("../../config/prisma");

const createSession = async (sessionData) => {
  return await prisma.session.create({
    data: sessionData,
  });
};

const updateSession = async (id, sessionData) => {
  return await prisma.session.update({
    where: { id },
    data: sessionData,
  });
};

const findSessionById = async (id) => {
  return await prisma.session.findUnique({
    where: { id },
  });
};

const findAllSessions = async (query) => {
  return await prisma.session.findMany(query);
};

const countSessions = async (query) => {
  return await prisma.session.count(query);
};

const deleteSession = async (id) => {
  return await prisma.session.delete({
    where: { id },
  });
};

module.exports = {
  createSession,
  findSessionById,
  findAllSessions,
  countSessions,
  updateSession,
  deleteSession,
};
