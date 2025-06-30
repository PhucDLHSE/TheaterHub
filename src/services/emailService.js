const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

// ✅ Gửi email xác thực tài khoản
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

// ✅ Gửi email đặt lại mật khẩu
const sendResetPasswordEmail = async (toEmail, otpCode) => {
    const mailOptions = {
        from: `"TheaterHub" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: 'Yêu cầu đặt lại mật khẩu - TheaterHub',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #FF5722; text-align: center;">🔐 TheaterHub - Đặt lại mật khẩu</h2>
                <p>Xin chào,</p>
                <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                <p>Vui lòng sử dụng mã OTP bên dưới để đặt lại mật khẩu mới:</p>

                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">
                        ${otpCode}
                    </span>
                </div>

                <p style="font-size: 14px;">Mã OTP có hiệu lực trong 10 phút.</p>
                <hr style="margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email đặt lại mật khẩu đã gửi tới: ${toEmail}`);
        return true;
    } catch (error) {
        console.error(`❌ Lỗi gửi email đặt lại mật khẩu:`, error);
        return false;
    }
};

// ✅ Gửi email vé sau khi thanh toán
const sendTicketEmail = async (toEmail, ticketInfo) => {
    const {
        name,               // Tên người mua
        eventTitle,         // Tiêu đề sự kiện
        eventTime,          // Chuỗi: "19:30 - 10/07/2025"
        location,           // Tên địa điểm
        seats,              // Mảng: ['Hàng A - Ghế 05', ...]
        totalAmount,        // Chuỗi: "1.200.000đ"
        ticketCode          // Mã vé (dùng tạo QR)
    } = ticketInfo;

    const qrImage = `https://api.qrserver.com/v1/create-qr-code/?data=THEATERHUB-${ticketCode}&size=200x200`;

    const seatListHtml = seats.map(seat => `<li>${seat}</li>`).join("");

    const mailOptions = {
        from: `"TheaterHub" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: `🎟 Vé của bạn - ${eventTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px 30px; border-radius: 10px;">
                <h2 style="color: #3F51B5; text-align: center;">🎭 TheaterHub - Xác nhận đặt vé</h2>
                <p>Xin chào <strong>${name}</strong>,</p>
                <p>Cảm ơn bạn đã đặt vé trên nền tảng TheaterHub!</p>

                <div style="margin: 20px 0; line-height: 1.6;">
                    <p><strong>Sự kiện:</strong> ${eventTitle}</p>
                    <p><strong>Thời gian:</strong> ${eventTime}</p>
                    <p><strong>Địa điểm:</strong> ${location}</p>
                    <p><strong>Ghế của bạn:</strong></p>
                    <ul>${seatListHtml}</ul>
                    <p><strong>Tổng tiền:</strong> ${totalAmount}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <img src="${qrImage}" alt="QR Code" />
                    <p style="margin-top: 10px;">Mã vé: <strong>${ticketCode}</strong></p>
                </div>

                <p>Vui lòng mang email này hoặc mã QR khi đến sự kiện để được hỗ trợ check-in nhanh chóng.</p>

                <div style="font-size: 12px; color: #777; text-align: center; margin-top: 40px;">
                    Nếu có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email: theaterhubservices@gmail.com
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Đã gửi email vé đến: ${toEmail}`);
        return true;
    } catch (err) {
        console.error(`❌ Lỗi gửi email vé:`, err);
        return false;
    }
};


module.exports = {
    sendVerificationEmail,
    sendResetPasswordEmail,
    sendTicketEmail
};
