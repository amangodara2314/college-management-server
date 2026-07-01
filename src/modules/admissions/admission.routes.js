// Admission routes

const router = require("express").Router();
const admissionController = require("./admission.controller");
const { authenticate } = require("../../middleware/auth.middleware");

router.use(authenticate);

// Create admission
router.post("/", admissionController.createAdmission);
router.get("/", admissionController.getAdmissions);
router.get("/:id", admissionController.getAdmissionById);
router.put("/:id", admissionController.updateAdmission);
router.put("/:id/subjects", admissionController.updateStudentSubjects);
router.delete("/:id", admissionController.deleteAdmission);

module.exports = router;
