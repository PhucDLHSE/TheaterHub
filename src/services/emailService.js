const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

const sendVerificationEmail = async (toEmail, verificationCode) => {
    const mailOptions = {
        from: `"TheaterHub" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: 'Xác thực tài khoản của bạn tại TheaterHub',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #4CAF50; text-align: center;">🎭 TheaterHub - Xác thực tài khoản</h2>
                <p>Xin chào,</p>
                <p>Cảm ơn bạn đã đăng ký tài khoản tại TheaterHub!</p>
                <p>Để hoàn tất quá trình đăng ký, vui lòng nhập mã xác thực bên dưới vào hệ thống:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">
                        ${verificationCode}
                    </span>
                </div>
                
                <p style="font-size: 14px;">Lưu ý: Mã xác thực có hiệu lực trong 24 giờ.</p>
                <hr style="margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">Nếu bạn không yêu cầu đăng ký tài khoản, vui lòng bỏ qua email này.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email xác thực đã gửi tới: ${toEmail}`);
        return true;
    } catch (error) {
        console.error(`❌ Lỗi gửi email xác thực:`, error);
        return false;
    }
};



module.exports = { sendVerificationEmail };
