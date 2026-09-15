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
