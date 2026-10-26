const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { requireAuth } = require('../src/middleware');

module.exports = (loginLimiter) => {
  const router = express.Router();

  router.get('/login', (req, res) => {
    if (req.session?.userId) return res.redirect('/dashboard');
    res.render('login', { error: null });
  });

  router.post('/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).render('login', { error: 'Username atau password salah.' });
    }
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    res.redirect('/dashboard');
  });

  router.post('/logout', requireAuth, (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
  });

  return router;
};