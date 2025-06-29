const PayOS = require("@payos/node");

const payOS = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

const confirmWebhook = async () => {
  const webhookUrl = `${process.env.WEBHOOKS_URL}/api/payments/webhook`;
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
