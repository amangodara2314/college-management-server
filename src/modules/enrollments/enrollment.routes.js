// Enrollment routes

const router = require("express").Router();
const enrollmentController = require("./enrollment.controller");
const { authenticate } = require("../../middleware/auth.middleware");

router.use(authenticate);

router.post("/", enrollmentController.createEnrollment);
router.put("/promote/bulk", enrollmentController.promoteStudentsBulk);
router.put("/promote", enrollmentController.promoteStudent);
router.post("/promote-course", enrollmentController.promoteStudentToCourse);
router.post(
  "/promote-course/bulk",
  enrollmentController.promoteStudentsToCourseBulk,
);
router.get("/", enrollmentController.getEnrollments);
router.get("/:id", enrollmentController.getEnrollmentById);
router.patch("/:id/status", enrollmentController.updateEnrollmentStatus);
router.put("/:id", enrollmentController.updateEnrollment);
router.delete("/:id", enrollmentController.deleteEnrollment);

module.exports = router;
