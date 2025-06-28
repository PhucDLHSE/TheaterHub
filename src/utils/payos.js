const PayOS = require("@payos/node");

const payOS = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

const confirmWebhook = async () => {
  const webhookUrl = "https://8625-2a09-bac1-7ac0-10-00-246-cc.ngrok-free.app/api/payments/webhook";
  try {
    const result = await payOS.confirmWebhook(webhookUrl);
    console.log("✅ Webhook confirmed:", result);
  } catch (err) {
    console.error("❌ Lỗi xác nhận Webhook:", err?.response?.data || err.message || err);
  }
};

module.exports = {
  payOS,             
  confirmWebhook
};
