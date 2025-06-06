const jwt = require("jsonwebtoken");

const googleCallback = (req, res) => {
	try {
		const user = req.user;

		const payload = {
			user_id: user.user_id,
			avatar: user.avatar,
			name: user.name,
			email: user.email,
			role: user.role,
			phone: user.phone || null,
		};

		const token = jwt.sign(payload, process.env.JWT_SECRET, {
			expiresIn: "7d",
		});

		let message = "Đăng nhập Google thành công";

		if (user.statusType === "linkedExisting") {
			message =
				"Đăng nhập Google thành công, đã liên kết với tài khoản email cũ";
		} else if (user.statusType === "newGoogle") {
			message = "Đăng nhập Google thành công, tài khoản mới đã được tạo";
		} else if (user.statusType === "existingGoogle") {
			message = "Đăng nhập Google thành công, chào mừng trở lại!";
		}

		const encodedUser = encodeURIComponent(JSON.stringify(payload)); // Encode the user payload (JSON string) for safe URL transmission
		const encodedMessage = encodeURIComponent(message); // Encode the success message for safe URL transmission

		const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"; // Use environment variable for frontend URL, default to localhost:3000 if not set
		const redirectUrl = `${frontendUrl}?success=true&token=${token}&user=${encodedUser}&message=${encodedMessage}`;

		res.redirect(redirectUrl);
	} catch (error) {
		console.error("❌ Lỗi trong googleCallback:", error);
		res.status(500).json({
			success: false,
			message: "Lỗi server khi xử lý callback Google",
			error: error.message || error,
		});
	}
};

const loginFailed = (req, res) => {
	res.status(401).json({
		success: false,
		message: "Đăng nhập thất bại",
		error: req.query.error || "Lỗi xác thực không xác định",
		errorDescription:
			req.query.error_description ||
			"Vui lòng thử lại hoặc liên hệ quản trị viên",
	});
};

const getStatus = (req, res) => {
	if (req.user) {
		return res.json({
			isAuthenticated: true,
			user: {
				id: req.user.user_id,
				name: req.user.name,
				email: req.user.email,
				role: req.user.role,
			},
		});
	}
	res.status(401).json({ isAuthenticated: false });
};

const logout = (req, res) => {
	res.json({
		success: true,
		message: "Đăng xuất thành công (xóa token phía client)",
	});
};

const getProfile = (req, res) => {
	res.json({
		success: true,
		user: {
			id: req.user.user_id,
			name: req.user.name,
			email: req.user.email,
			role: req.user.role,
			google_id: req.user.google_id,
			avatar: req.user.avatar,
		},
	});
};

const getAdminDashboard = (req, res) => {
	res.json({
		success: true,
		message: "Chào mừng đến trang quản trị",
		user: {
			id: req.user.user_id,
			name: req.user.name,
			role: req.user.role,
		},
	});
};

module.exports = {
	googleCallback,
	loginFailed,
	logout,
	getStatus,
	getProfile,
	getAdminDashboard,
};
