import db from '../config/db.js';

const shapeProduct = (product, images, pricing) => {
  product.images = images.map((img) => img.image_url);
  product.bulkPricing = pricing.map((t) => ({ minQty: t.minQty, price: Number(t.price) }));
  product.category = product.category_id;
  product.condition = product.condition_status;
  product.price = Number(product.price);
  product.stock = Number(product.stock);
  product.customizable = Boolean(product.customizable);
  delete product.category_id;
  delete product.condition_status;
  return product;
};

const loadProductExtras = async (product) => {
  const [images] = await db.query('SELECT image_url FROM product_images WHERE product_id = ?', [product.id]);
  const [pricing] = await db.query(
    'SELECT min_qty as minQty, price FROM bulk_pricing WHERE product_id = ? ORDER BY min_qty ASC',
    [product.id]
  );
  return shapeProduct(product, images, pricing);
};

export const getProducts = async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `);

    for (let i = 0; i < products.length; i++) {
      products[i] = await loadProductExtras(products[i]);
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ message: 'Product not found' });
    res.json(await loadProductExtras(rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
};

const parseProductBody = (req) => {
  const { id, name, category, price, dimensions, ply, material, condition, stock, description } = req.body;

  let customizable = req.body.customizable === 'true' || req.body.customizable === true;

  let bulkPricing = [];
  if (req.body.bulkPricing) {
    try {
      bulkPricing = typeof req.body.bulkPricing === 'string' ? JSON.parse(req.body.bulkPricing) : req.body.bulkPricing;
    } catch { /* ignore */ }
  }

  let images = [];
  if (req.files?.length > 0) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    images = req.files.map((file) => `${baseUrl}/uploads/${file.filename}`);
  } else if (req.body.images) {
    images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
  }

  return { id, name, category, price, dimensions, ply, material, condition, stock, description, customizable, bulkPricing, images };
};

export const createProduct = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id, name, category, price, dimensions, ply, material, condition, stock, description, customizable, bulkPricing, images } = parseProductBody(req);

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO products (id, category_id, name, price, dimensions, ply, material, condition_status, stock, description, customizable) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, category, name, price, dimensions, ply, material, condition, stock, description, customizable]
    );

    for (const img of images) {
      await connection.query('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [id, img]);
    }

    for (const tier of bulkPricing) {
      await connection.query('INSERT INTO bulk_pricing (product_id, min_qty, price) VALUES (?, ?, ?)', [id, tier.minQty, tier.price]);
    }

    await connection.commit();
    res.status(201).json({ message: 'Product created successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Error creating product', error: error.message });
  } finally {
    connection.release();
  }
};

export const updateProduct = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const productId = req.params.id;
    const { name, category, price, dimensions, ply, material, condition, stock, description, customizable, bulkPricing, images } = parseProductBody(req);

    await connection.beginTransaction();

    await connection.query(
      `UPDATE products SET category_id=?, name=?, price=?, dimensions=?, ply=?, material=?, condition_status=?, stock=?, description=?, customizable=?
       WHERE id=?`,
      [category, name, price, dimensions, ply, material, condition, stock, description, customizable, productId]
    );

    await connection.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
    await connection.query('DELETE FROM bulk_pricing WHERE product_id = ?', [productId]);

    for (const img of images) {
      await connection.query('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [productId, img]);
    }

    for (const tier of bulkPricing) {
      await connection.query('INSERT INTO bulk_pricing (product_id, min_qty, price) VALUES (?, ?, ?)', [productId, tier.minQty, tier.price]);
    }

    await connection.commit();
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Error updating product', error: error.message });
  } finally {
    connection.release();
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
};
