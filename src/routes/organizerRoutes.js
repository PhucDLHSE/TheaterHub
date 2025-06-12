const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const { createOrganizer, updateOrganizer } = require("../controllers/organizerController");

router.post("/", upload.single("logo"), createOrganizer);
router.put("/:id", upload.single("logo"), updateOrganizer);

module.exports = router;
