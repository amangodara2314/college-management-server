const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const { authenticate } = require("../../middleware/auth.middleware");

// Public routes
router.post("/login", authController.login);

// Protected routes
router.get("/profile", authenticate, authController.getProfile);
router.put("/change-password", authenticate, authController.changePassword);

module.exports = router;
