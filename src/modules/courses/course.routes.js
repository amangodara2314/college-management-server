const router = require("express").Router();

const courseController = require("./course.controller");
const { authenticate } = require("../../middleware/auth.middleware");

router.use(authenticate);

router.post("/", courseController.createCourse);
router.get("/", courseController.findCourses);
router.get("/:id", courseController.findCourseById);
router.put("/:id", courseController.updateCourse);

module.exports = router;
