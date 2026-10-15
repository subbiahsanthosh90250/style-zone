const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

router.post('/login', async (req, res) => {
  const { password } = req.body || {};
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (!hash) {
    return res.status(500).json({ error: 'Server is missing ADMIN_PASSWORD_HASH configuration' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  req.session.isAdmin = true;
  res.json({ authenticated: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ authenticated: false });
  });
});

router.get('/session', (req, res) => {
  res.json({ authenticated: Boolean(req.session && req.session.isAdmin) });
});

module.exports = { router, requireAuth };
