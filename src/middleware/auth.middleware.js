const { verifyToken } = require("../utils/jwt");
const { errorResponse } = require("../utils/apiResponse");

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, "Authentication token is required", 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return errorResponse(res, "Invalid or expired token", 401);
    }

    // Attach admin data to request
    req.admin = decoded;
    next();
  } catch (error) {
    return errorResponse(res, "Authentication failed", 401);
  }
};

module.exports = {
  authenticate,
};
