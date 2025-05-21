const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function testDatabaseConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('Kết nối MySQL thành công');
    
    const [tables] = await connection.query(`
      SELECT TABLE_NAME FROM information_schema.tables 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
    `, [process.env.DB_NAME]);
    
    if (tables.length === 0) {
      console.warn('Cảnh báo: Bảng "users" không tồn tại trong database');
      console.log('Hãy đảm bảo bảng users có các trường: user_id, name, email, google_id, role');
    } else {
      console.log('Đã tìm thấy bảng users trong database');
      
      // Kiểm tra cấu trúc bảng
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME FROM information_schema.columns 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
      `, [process.env.DB_NAME]);
      
      const columnNames = columns.map(col => col.COLUMN_NAME);
      console.log('Các trường trong bảng users:', columnNames.join(', '));
      
      // Kiểm tra các trường cần thiết
      const requiredColumns = ['user_id', 'name', 'email', 'google_id', 'role'];
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.warn(`Cảnh báo: Bảng users thiếu các trường quan trọng: ${missingColumns.join(', ')}`);
      } else {
        console.log('Cấu trúc bảng users phù hợp cho xác thực Google OAuth');
      }
    }
    
    // Đóng kết nối
    await connection.end();
    console.log('Đã đóng kết nối');
    
  } catch (error) {
    console.error('Lỗi kiểm tra cơ sở dữ liệu:', error);
    process.exit(1);
  }
}

// Chạy hàm kiểm tra
testDatabaseConnection();