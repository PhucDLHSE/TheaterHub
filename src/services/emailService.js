const nodemailer = require('nodemailer');
const pool = require('../config/db'); 

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

// ✅ Gửi email vé đã đặt thành công
const sendTicketEmail = async (orderId) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
                u.name AS user_name,
                u.email,
                e.title AS event_title,
                DATE_FORMAT(s.start_time, '%H:%i - %d/%m/%Y') AS event_time,
                l.name AS location_name,
                CONCAT('Hàng ', se.seat_row, ' - Ghế ', LPAD(se.seat_number, 2, '0')) AS seat_label,
                o.total_amount
            FROM ticket_orders o
            JOIN users u ON o.user_id = u.user_id
            JOIN tickets t ON o.order_id = t.order_id
            LEFT JOIN seats se ON t.seat_id = se.seat_id
            JOIN showtimes s ON t.showtime_id = s.showtime_id
            JOIN events e ON o.event_id = e.event_id
            JOIN locations l ON s.location_id = l.location_id
            WHERE o.order_id = ?`,
            [orderId]
        );

        if (!rows || rows.length === 0) {
            console.warn('❌ Không tìm thấy thông tin đơn hàng hoặc vé');
            return false;
        }

        const {
            user_name,
            email,
            event_title,
            event_time,
            location_name,
            total_amount
        } = rows[0];

        const seats = rows.map(r => r.seat_label).filter(Boolean); // tránh null
        const seatInfo = seats.length > 0 ? `<strong>Ghế:</strong> ${seats.join(', ')}<br>` : '';

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #2196F3; text-align: center;">🎟 Vé của bạn đã được xác nhận!</h2>
                <p>Xin chào <strong>${user_name}</strong>,</p>
                <p>Bạn đã đặt vé thành công cho sự kiện <strong>${event_title}</strong>.</p>
                <p>
                    <strong>Thời gian:</strong> ${event_time}<br>
                    <strong>Địa điểm:</strong> ${location_name}<br>
                    ${seatInfo}
                    <strong>Tổng tiền:</strong> ${Number(total_amount).toLocaleString()} VNĐ
                </p>
                <p>Cảm ơn bạn đã sử dụng dịch vụ TheaterHub. Chúc bạn có trải nghiệm tuyệt vời tại sự kiện!</p>
            </div>
        `;

        await transporter.sendMail({
            from: `"TheaterHub" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: `🎭 Vé sự kiện "${event_title}" của bạn`,
            html,
        });

        console.log(`✅ Email vé đã gửi tới: ${email} (orderId: ${orderId})`);
        return true;
    } catch (error) {
        console.error(`❌ Lỗi gửi email vé cho orderId = ${orderId}:`, error);
        return false;
    }
};

module.exports = { sendTicketEmail };



module.exports = {
    sendVerificationEmail,
    sendResetPasswordEmail,
    sendTicketEmail
};
