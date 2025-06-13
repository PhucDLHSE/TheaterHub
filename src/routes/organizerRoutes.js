const express = require("express");
const router = express.Router();
const {upload} = require("../middlewares/uploadMiddleware");
const { verifyToken, ensureStaff, ensureOwner } = require('../middlewares/jwtAuth');
const { createOrganizer, updateOrganizer,getAllOrganizers, getOrganizerById, deleteOrganizer } = require("../controllers/organizerController");

router.post("/", upload.single("logo"), verifyToken, ensureStaff, createOrganizer);
router.put("/:id", upload.single("logo"), verifyToken, ensureStaff, updateOrganizer);
router.get("/", getAllOrganizers);
router.get("/:id", getOrganizerById);
router.delete("/:id", verifyToken, ensureStaff, deleteOrganizer);

module.exports = router;
