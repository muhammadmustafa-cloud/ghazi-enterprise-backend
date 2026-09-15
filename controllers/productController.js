import db from '../config/db.js';

export const getProducts = async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `);

    // Fetch images and bulk pricing for each product
    for (let product of products) {
      const [images] = await db.query('SELECT image_url FROM product_images WHERE product_id = ?', [product.id]);
      const [pricing] = await db.query('SELECT min_qty as minQty, price FROM bulk_pricing WHERE product_id = ? ORDER BY min_qty ASC', [product.id]);
      
      product.images = images.map(img => img.image_url);
      product.bulkPricing = pricing;
      product.category = product.category_id;
      product.condition = product.condition_status;
      delete product.category_id;
      delete product.condition_status;
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

export const createProduct = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id, name, category, price, dimensions, ply, material, condition, stock, description } = req.body;
    
    let customizable = false;
    if (req.body.customizable === 'true' || req.body.customizable === true) {
      customizable = true;
    }

    let bulkPricing = [];
    if (req.body.bulkPricing) {
      try {
        bulkPricing = typeof req.body.bulkPricing === 'string' ? JSON.parse(req.body.bulkPricing) : req.body.bulkPricing;
      } catch (e) {
        console.error('Error parsing bulkPricing:', e);
      }
    }

    // Get image URLs from uploaded files OR from body if passed as array
    let images = [];
    if (req.files && req.files.length > 0) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      images = req.files.map(file => `${baseUrl}/uploads/${file.filename}`);
    } else if (req.body.images) {
      images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO products (id, category_id, name, price, dimensions, ply, material, condition_status, stock, description, customizable) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, category, name, price, dimensions, ply, material, condition, stock, description, customizable]
    );

    if (images && images.length > 0) {
      for (let img of images) {
        await connection.query('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [id, img]);
      }
    }

    if (bulkPricing && bulkPricing.length > 0) {
      for (let tier of bulkPricing) {
        await connection.query('INSERT INTO bulk_pricing (product_id, min_qty, price) VALUES (?, ?, ?)', [id, tier.minQty, tier.price]);
      }
    }

    await connection.commit();
    res.status(201).json({ message: 'Product created successfully', images });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Error creating product', error: error.message });
  } finally {
    connection.release();
  }
};
