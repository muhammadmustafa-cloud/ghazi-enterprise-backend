import bcrypt from 'bcryptjs';
import db from './db.js';
import { seedProducts } from './seedProducts.js';

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

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(20) PRIMARY KEY,
      status ENUM('pending', 'confirmed', 'delivered', 'cancelled') DEFAULT 'pending',
      customer_first_name VARCHAR(100) NOT NULL,
      customer_last_name VARCHAR(100),
      customer_phone VARCHAR(50) NOT NULL,
      customer_address TEXT,
      customer_city VARCHAR(100),
      delivery_type VARCHAR(20) DEFAULT 'standard',
      payment_method VARCHAR(20) DEFAULT 'cod',
      subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
      delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
      total DECIMAL(10, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(20) NOT NULL,
      product_id VARCHAR(50),
      product_name VARCHAR(255) NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
      is_custom BOOLEAN DEFAULT FALSE,
      custom_details JSON,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  const adminPasswordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  await db.query(
    `INSERT IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
    [
      process.env.ADMIN_NAME || 'Admin Ghazi',
      process.env.ADMIN_EMAIL || 'admin@ghazienterprise.com',
      adminPasswordHash,
      'admin',
    ]
  );

  for (const category of defaultCategories) {
    await db.query(
      `INSERT IGNORE INTO categories (id, name, image) VALUES (?, ?, ?)`,
      category
    );
  }

  const [countRows] = await db.query('SELECT COUNT(*) as count FROM products');
  if (Number(countRows[0].count) === 0) {
    for (const product of seedProducts) {
      await db.query(
        `INSERT INTO products (id, category_id, name, price, dimensions, ply, material, condition_status, stock, description, customizable)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id, product.category, product.name, product.price,
          product.dimensions, product.ply, product.material, product.condition,
          product.stock, product.description, product.customizable,
        ]
      );
      for (const img of product.images) {
        await db.query('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [product.id, img]);
      }
      for (const tier of product.bulkPricing || []) {
        await db.query('INSERT INTO bulk_pricing (product_id, min_qty, price) VALUES (?, ?, ?)', [product.id, tier.minQty, tier.price]);
      }
    }
    console.log(`📦 Seeded ${seedProducts.length} products`);
  }
};
