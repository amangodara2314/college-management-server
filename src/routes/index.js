const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("../modules/auth/auth.routes");
const studentRoutes = require("../modules/students/student.routes");
const sessionRoutes = require("../modules/sessions/session.routes");
const courseRoutes = require("../modules/courses/course.routes");
const subjectRoutes = require("../modules/subjects/subject.routes");
const admissionRoutes = require("../modules/admissions/admission.routes");
const documentRoutes = require("../modules/documents/document.routes");
// const enrollmentRoutes = require("../modules/enrollments/enrollment.routes");
// const feeRoutes = require("../modules/fees/fee.routes");
// const examRoutes = require("../modules/exams/exam.routes");
// const resultRoutes = require("../modules/results/result.routes");

// Register routes
router.use("/auth", authRoutes);
router.use("/student", studentRoutes);
router.use("/session", sessionRoutes);
router.use("/course", courseRoutes);
router.use("/subject", subjectRoutes);
router.use("/admission", admissionRoutes);
router.use("/document", documentRoutes);
// router.use("/enrollments", enrollmentRoutes);
// router.use("/fees", feeRoutes);
// router.use("/exams", examRoutes);
// router.use("/results", resultRoutes);

// Health check route
router.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

module.exports = router;
