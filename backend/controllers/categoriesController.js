const { query } = require('../db');

async function getCategories(req, res, next) {
  try {
    const result = await query(
      'SELECT * FROM categories WHERE user_id = $1 ORDER BY name ASC',
      [req.user.id]
    );
    res.json({ categories: result.rows });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name, icon } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required', field: 'name' });
    }
    const result = await query(
      'INSERT INTO categories (user_id, name, icon) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name.trim(), icon || '📦']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const { name, icon } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required', field: 'name' });
    }
    const result = await query(
      'UPDATE categories SET name=$1, icon=$2 WHERE id=$3 AND user_id=$4 RETURNING *',
      [name.trim(), icon || '📦', req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const result = await query(
      'DELETE FROM categories WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
