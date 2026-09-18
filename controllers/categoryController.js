import db from '../config/db.js';

export const getCategories = async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { id, name, image } = req.body;
    await db.query('INSERT INTO categories (id, name, image) VALUES (?, ?, ?)', [id, name, image]);
    res.status(201).json({ message: 'Category created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const [products] = await db.query('SELECT id FROM products WHERE category_id = ? LIMIT 1', [req.params.id]);
    if (products.length > 0) {
      return res.status(400).json({ message: 'Cannot delete category with existing products' });
    }

    const [result] = await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
};
