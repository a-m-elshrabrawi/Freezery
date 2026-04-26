const { query } = require('../db');

async function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await query('SELECT id, username, created_at FROM users WHERE id = $1', [req.session.userId]);
    if (result.rows.length === 0) {
      req.session.destroy();
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
