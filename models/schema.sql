-- Create Database
CREATE DATABASE IF NOT EXISTS ghazi_enterprise;
USE ghazi_enterprise;

-- Create Users Table (for Admin authentication)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer', 'admin') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY, -- e.g., 'new-box', 'pizza-cake'
    name VARCHAR(100) NOT NULL,
    image VARCHAR(255) NOT NULL
);

-- Create Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY, -- e.g., 'nb-001'
    category_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    dimensions VARCHAR(100),
    ply VARCHAR(50),
    material VARCHAR(100),
    condition_status VARCHAR(50), -- Renamed from condition which is reserved in some SQL
    stock INT DEFAULT 0,
    description TEXT,
    customizable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Create Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create Bulk Pricing Table
CREATE TABLE IF NOT EXISTS bulk_pricing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    min_qty INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Insert Default Admin (Password is: admin123)
INSERT IGNORE INTO users (name, email, password_hash, role) 
VALUES ('Admin Ghazi', 'admin@ghazienterprise.com', '$2b$10$xRmmPfcsK1v84MA3MWzbBu1UOMjkPszIn1q6LpnToJsOHMgwIQLhy', 'admin');

-- Insert Initial Categories
INSERT IGNORE INTO categories (id, name, image) VALUES 
('new-box', 'New Carton Boxes', '/new-boxes.png'),
('old-box', 'Used Carton Boxes', '/used-boxes.png'),
('tape', 'Packaging Tape', '/tape.png'),
('shrink-roll', 'Shrink Roll', '/shrink-roll.jpg'),
('bubble-wrap', 'Bubble Wrap', '/bubble-wrap.jpg'),
('pizza-cake', 'Pizza & Cake Box', 'https://images.unsplash.com/photo-1579227114347-15d08fc37cae?w=800&q=80');
