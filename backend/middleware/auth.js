const jwt = require('jsonwebtoken');
const { query } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-dev-secret';

async function requireAuth(req, res, next) {
  try {
    // Bearer token (mobile / cross-origin)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const result = await query('SELECT id, username, created_at FROM users WHERE id = $1', [decoded.userId]);
      if (result.rows.length === 0) return res.status(401).json({ error: 'Unauthorized' });
      req.user = result.rows[0];
      return next();
    }

    // Session cookie fallback
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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

module.exports = { requireAuth, JWT_SECRET };
