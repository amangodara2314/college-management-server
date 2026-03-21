const router = require("express").Router();
const documentController = require("./document.controller");
const { authenticate } = require("../../middleware/auth.middleware");

router.use(authenticate);

// Student documents
router.post("/", documentController.createDocument);
router.post("/bulk", documentController.createDocuments);

// Document types
router.get("/types", documentController.getDocumentTypes);
router.post("/types", documentController.createDocumentType);

module.exports = router;
