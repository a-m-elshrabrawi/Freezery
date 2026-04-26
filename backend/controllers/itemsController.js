const { query } = require('../db');

async function getItems(req, res, next) {
  try {
    const { search, category, status, sort = 'updated_at', order = 'desc', limit, offset = 0 } = req.query;
    const validSorts = ['name', 'quantity', 'updated_at', 'expiry_date', 'created_at'];
    const validOrders = ['asc', 'desc'];
    const sortCol = validSorts.includes(sort) ? sort : 'updated_at';
    const sortOrder = validOrders.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';

    const conditions = ['i.user_id = $1'];
    const params = [req.user.id];
    let idx = 2;

    if (search) {
      conditions.push(`i.name ILIKE $${idx}`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      conditions.push(`i.category_id = $${idx}`);
      params.push(parseInt(category, 10));
      idx++;
    }
    if (status) {
      conditions.push(`i.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const whereClause = conditions.join(' AND ');
    let sql = `
      SELECT i.*, c.name AS category_name, c.icon AS category_icon
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE ${whereClause}
      ORDER BY i.${sortCol} ${sortOrder}
    `;

    if (limit) {
      sql += ` LIMIT $${idx} OFFSET $${idx + 1}`;
      params.push(parseInt(limit, 10), parseInt(offset, 10));
    }

    const result = await query(sql, params);
    res.json({ items: result.rows, total: result.rowCount });
  } catch (err) {
    next(err);
  }
}

async function getItem(req, res, next) {
  try {
    const result = await query(
      `SELECT i.*, c.name AS category_name, c.icon AS category_icon
       FROM items i LEFT JOIN categories c ON i.category_id = c.id
       WHERE i.id = $1 AND i.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function createItem(req, res, next) {
  try {
    const { name, category_id, quantity, unit, min_quantity, location, purchase_date, expiry_date, purchase_price, description, notes } = req.body;
    const result = await query(
      `INSERT INTO items (user_id, category_id, name, description, quantity, unit, min_quantity, location, purchase_date, expiry_date, purchase_price, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [req.user.id, category_id || null, name.trim(), description || null, parseInt(quantity, 10), unit || 'units', parseInt(min_quantity || 1, 10), location || null, purchase_date || null, expiry_date || null, purchase_price || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const { name, category_id, quantity, unit, min_quantity, location, purchase_date, expiry_date, purchase_price, description, notes } = req.body;
    const existing = await query('SELECT id FROM items WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Item not found' });

    const result = await query(
      `UPDATE items SET name=$1, category_id=$2, quantity=$3, unit=$4, min_quantity=$5, location=$6,
       purchase_date=$7, expiry_date=$8, purchase_price=$9, description=$10, notes=$11
       WHERE id=$12 AND user_id=$13 RETURNING *`,
      [name.trim(), category_id || null, parseInt(quantity, 10), unit || 'units', parseInt(min_quantity || 1, 10), location || null, purchase_date || null, expiry_date || null, purchase_price || null, description || null, notes || null, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    const result = await query('DELETE FROM items WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function getItemsSummary(req, res, next) {
  try {
    const result = await query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'low') AS low_stock,
        COUNT(*) FILTER (WHERE status = 'out') AS out_of_stock,
        COUNT(*) FILTER (WHERE status = 'expired') AS expired
       FROM items WHERE user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { getItems, getItem, createItem, updateItem, deleteItem, getItemsSummary };
