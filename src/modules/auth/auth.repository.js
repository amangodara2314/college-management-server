const prisma = require("../../config/prisma");

const findByEmail = async (email) => {
  return await prisma.admin.findUnique({
    where: { email },
  });
};


const findById = async (id) => {
  return await prisma.admin.findUnique({
    where: { id },
  });
};

const create = async (data) => {
  return await prisma.admin.create({
    data,
  });
};

const updatePassword = async (id, hashedPassword) => {
  return await prisma.admin.update({
    where: { id },
    data: { password: hashedPassword },
  });
};

module.exports = {
  findByEmail,
  findById,
  create,
  updatePassword,
};
