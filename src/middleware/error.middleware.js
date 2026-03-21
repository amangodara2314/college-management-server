/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Express next function
 */
const errorMiddleware = (err, req, res, next) => {
  console.error("Error:", err);

  // Default error status and message
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Prisma specific errors
  if (err.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry. This record already exists.",
      error: process.env.NODE_ENV === "development" ? err.meta : undefined,
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found.",
    });
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.errors,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  // Generic error response
  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

module.exports = errorMiddleware;
