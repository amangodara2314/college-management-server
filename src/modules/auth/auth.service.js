const authRepository = require("./auth.repository");
const { hashPassword, comparePassword } = require("../../utils/password");
const { generateToken } = require("../../utils/jwt");

const login = async (email, password) => {
  // Find admin by email
  const admin = await authRepository.findByEmail(email);

  if (!admin) {
    throw new Error("Invalid email or password");
  }

  // Verify password
  const isValidPassword = await comparePassword(password, admin.password);

  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }

  // Generate JWT token
  const token = generateToken({
    id: admin.id,
    email: admin.email,
    name: admin.name,
  });

  // Return admin data without password
  const { password: _, ...adminData } = admin;

  return {
    admin: adminData,
    token,
  };
};

const getAdminById = async (id) => {
  const admin = await authRepository.findById(id);

  if (!admin) {
    throw new Error("Admin not found");
  }

  // Remove password from response
  const { password: _, ...adminData } = admin;
  return adminData;
};

const changePassword = async (id, currentPassword, newPassword) => {
  const admin = await authRepository.findById(id);

  if (!admin) {
    throw new Error("Admin not found");
  }

  // Verify current password
  const isValidPassword = await comparePassword(
    currentPassword,
    admin.password,
  );

  if (!isValidPassword) {
    throw new Error("Current password is incorrect");
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await authRepository.updatePassword(id, hashedPassword);
};

module.exports = {
  login,
  getAdminById,
  changePassword,
};
