const express = require("express");
const router = express.Router();
const subjectController = require("./subject.controller");
const { authenticate } = require("../../middleware/auth.middleware");

// All routes require authentication
router.use(authenticate);

// Create subject
router.post("/", subjectController.createSubject);

// Get all subjects (with pagination and search)
router.get("/", subjectController.getAllSubjects);

// Get subject by ID
router.get("/:id", subjectController.getSubjectById);

// Update subject
router.put("/:id", subjectController.updateSubject);

// Delete subject
router.delete("/:id", subjectController.deleteSubject);

module.exports = router;
