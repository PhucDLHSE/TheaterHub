const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
const dotenv = require('dotenv');
const whitelist = require('./roleWhitelist');

module.exports = function (passport) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    console.error('CẢNH BÁO: Thiếu các biến môi trường cho Google OAuth. Hãy kiểm tra file .env');
  }

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const name = profile.displayName;
      const avatar = profile.photos[0]?.value || null;

      let role = 'customer';
      if (whitelist.admins.includes(email)) role = 'admin';
      else if (whitelist.staff.includes(email)) role = 'staff';

      const [rows] = await pool.query('SELECT * FROM users WHERE google_id = ?', [profile.id]);

      if (rows.length > 0) {
        const user = rows[0];

        if (user.email !== email || user.name !== name || user.role !== role || user.avatar !== avatar) {
          await pool.query(
            'UPDATE users SET name = ?, email = ?, role = ?, avatar = ? WHERE user_id = ?',
            [name, email, role, avatar, user.user_id]
          );
          user.name = name;
          user.email = email;
          user.role = role;
          user.avatar = avatar;
        }

        user.statusType = 'existingGoogle';
        return done(null, user);
      } else {
        const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUsers.length > 0) {
          const user = existingUsers[0];

          if (user.provider === 'local') {
            const message = `Email ${email} đã đăng ký bằng email/password, không thể đăng nhập Google.`;
            return done(null, false, { message });
          }

          await pool.query(
            'UPDATE users SET google_id = ?, role = ?, avatar = ? WHERE user_id = ?',
            [profile.id, role, avatar, user.user_id]
          );

          const updatedUser = {
            ...user,
            google_id: profile.id,
            role,
            avatar,
            statusType: 'linkedExisting'
          };
          return done(null, updatedUser);

        } else {
          const [result] = await pool.query(
            'INSERT INTO users (name, email, google_id, role, avatar, provider) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, profile.id, role, avatar, 'google']
          );

          const newUser = {
            user_id: result.insertId,
            name,
            email,
            google_id: profile.id,
            role,
            avatar,
            statusType: 'newGoogle'
          };

          return done(null, newUser);
        }
      }
    } catch (err) {
      console.error('Lỗi xác thực Google:', err);
      return done(err, null);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.user_id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [id]);
      if (rows.length > 0) {
        done(null, rows[0]);
      } else {
        done(null, false);
      }
    } catch (err) {
      console.error('Lỗi deserialize user:', err);
      done(err, null);
    }
  });
};
