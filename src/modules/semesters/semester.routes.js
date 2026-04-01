// Semester routes

const router = require("express").Router();
const semesterController = require("./semester.controller");
const { authenticate } = require("../../middleware/auth.middleware");

router.use(authenticate);

router.post("/", semesterController.createSemester);
router.get("/", semesterController.getSemesters);
router.get("/:id", semesterController.getSemesterById);
router.put("/:id", semesterController.updateSemester);
router.delete("/:id", semesterController.deleteSemester);

module.exports = router;
