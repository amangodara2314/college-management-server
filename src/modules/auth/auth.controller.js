const authService = require("./auth.service");
const { successResponse, errorResponse } = require("../../utils/apiResponse");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, "Email and password are required", 400);
    }

    const result = await authService.login(email, password);
    return successResponse(res, result, "Login successful");
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

const getProfile = async (req, res) => {
  try {
    const admin = await authService.getAdminById(req.admin.id);
    return successResponse(res, admin, "Profile retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(
        res,
        "Current password and new password are required",
        400,
      );
    }

    await authService.changePassword(
      req.admin.id,
      currentPassword,
      newPassword,
    );
    return successResponse(res, null, "Password changed successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  login,
  getProfile,
  changePassword,
};
