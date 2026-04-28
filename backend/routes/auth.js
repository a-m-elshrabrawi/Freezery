const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters', field: 'username' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters', field: 'password' });
    }

    const existing = await query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken', field: 'username' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
      [username.trim(), passwordHash]
    );
    const user = userResult.rows[0];

    // Clone default categories for new user
    const defaultCats = await query('SELECT name, icon FROM categories WHERE user_id IS NULL');
    for (const cat of defaultCats.rows) {
      await query('INSERT INTO categories (user_id, name, icon) VALUES ($1, $2, $3)', [user.id, cat.name, cat.icon]);
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    req.session.userId = user.id;
    req.session.save((saveErr) => {
      if (saveErr) return next(saveErr);
      res.status(201).json({ user: { id: user.id, username: user.username, created_at: user.created_at }, token });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await query('SELECT * FROM users WHERE username = $1', [username.trim()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    req.session.userId = user.id;
    req.session.save((saveErr) => {
      if (saveErr) return next(saveErr);
      res.json({ user: { id: user.id, username: user.username, created_at: user.created_at }, token });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
