const router = require("express").Router();
const sessionController = require("./session.controller");
const { authenticate } = require("../../middleware/auth.middleware");

router.use(authenticate);
router.get("/", sessionController.getSessions);
router.post("/", sessionController.createSession);
router.get("/:id", sessionController.getSessionById);
router.put("/:id", sessionController.updateSession);
router.delete("/:id", sessionController.deleteSession);

module.exports = router;
