// Student routes
const express = require("express");
const studentController = require("./student.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const upload = require("../../middleware/upload.middleware");
const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  upload.fields([
    { name: "documents", maxCount: 10 },
    { name: "documents[]", maxCount: 10 },
    { name: "files", maxCount: 10 },
  ]),
  studentController.createStudent,
);
router.get("/", studentController.findStudents);
router.get(
  "/stats/session/:sessionId",
  studentController.getStudentStatsBySession,
);
router.put("/:id", studentController.updateStudent);
router.get("/:id", studentController.getStudentById);
router.delete("/:id", studentController.deleteStudent);

module.exports = router;
