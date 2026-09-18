import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ghazi_enterprise',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Connected to MySQL Database successfully!');
    connection.release();
  })
  .catch(err => {
    console.error('❌ MySQL Connection Failed:', err.message);
  });

export default pool;
