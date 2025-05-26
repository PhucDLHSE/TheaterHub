const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

function formatPhoneNumber(phone) {
  let cleaned = phone.trim();
  if (cleaned.startsWith('0')) {
    return '+84' + cleaned.slice(1);
  }
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  throw new Error('Số điện thoại không hợp lệ');
}

async function sendOtpSms(phone, otp) {
  const formattedPhone = formatPhoneNumber(phone);
  try {
    const message = await client.messages.create({
      body: `Your OTP code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    console.log('OTP sent successfully, SID:', message.sid);
    return message.sid;
  } catch (error) {
    console.error('Failed to send OTP SMS:', error);
    throw new Error('Gửi OTP thất bại');
  }
}

module.exports = { sendOtpSms, formatPhoneNumber };
