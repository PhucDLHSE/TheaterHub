const express = require("express");
const router = express.Router();
const { createPaymentLink, handlePayOSWebhook } = require("../controllers/paymentController");
const { verifyToken } = require("../middlewares/jwtAuth");

// Tạo link thanh toán
router.post("/create-link", verifyToken, createPaymentLink);

router.post('/webhook', handlePayOSWebhook);

router.get('/webhook', (req, res) => {
  res.status(200).send('Webhook URL verified');
});

module.exports = router;
