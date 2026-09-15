import bcrypt from 'bcryptjs';
import db from './db.js';

const defaultCategories = [
  ['new-box', 'New Carton Boxes', '/new-boxes.png'],
  ['old-box', 'Used Carton Boxes', '/used-boxes.png'],
  ['tape', 'Packaging Tape', '/tape.png'],
  ['shrink-roll', 'Shrink Roll', '/shrink-roll.jpg'],
  ['bubble-wrap', 'Bubble Wrap', '/bubble-wrap.jpg'],
  ['pizza-cake', 'Pizza & Cake Box', 'https://images.unsplash.com/photo-1579227114347-15d08fc37cae?w=800&q=80'],
];

export const initDb = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('customer', 'admin') DEFAULT 'customer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      image VARCHAR(255) NOT NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      category_id VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      dimensions VARCHAR(100),
      ply VARCHAR(50),
      material VARCHAR(100),
      condition_status VARCHAR(50),
      stock INT DEFAULT 0,
      description TEXT,
      customizable BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL,
      image_url VARCHAR(255) NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS bulk_pricing (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL,
      min_qty INT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await db.query(
    `INSERT IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
    ['Admin Ghazi', 'admin@ghazienterprise.com', adminPasswordHash, 'admin']
  );

  for (const category of defaultCategories) {
    await db.query(
      `INSERT IGNORE INTO categories (id, name, image) VALUES (?, ?, ?)`,
      category
    );
  }
};
