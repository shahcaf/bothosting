const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Manual Register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  
  try {
    const pool = req.app.locals.pool;
    // Auto-create table for convenience in development
    const userId = require('crypto').randomUUID();
    const insertRes = await pool.query('INSERT INTO users (id, email, password) VALUES ($1, $2, $3) RETURNING id, email', [userId, email, password]);
    const user = insertRes.rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'fallback', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Email already exists' });
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Database error. Make sure the database file is not locked.' });
  }
});

// Manual Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const pool = req.app.locals.pool;
    const resDb = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = resDb.rows[0];
    if (!user || user.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'fallback', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get user profile
router.get('/profile', (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: 'Not logged in' });
  }
});

// Start Discord auth
router.get('/discord', passport.authenticate('discord'));

// Discord auth callback
router.get('/discord/callback', (req, res, next) => {
    passport.authenticate('discord', (err, user, info) => {
        if (err) return res.status(500).send("OAuth Error: " + err.message);
        if (!user) return res.status(401).send("Authentication failed. " + (info ? JSON.stringify(info) : "Check Client Secret and Redirect URIs."));
        req.logIn(user, (err) => {
            if (err) return res.status(500).send("Login Error: " + err.message);
            next();
        });
    })(req, res, next);
}, (req, res) => {
    // Generate JWT (optional, but good for react frontend)
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_REDIRECT_URI || 'http://localhost:5173/auth/callback';
    res.redirect(`${frontendUrl}?token=${token}`);
});

// Logout
router.get('/logout', (req, res) => {
    req.logout();
    res.json({ message: 'Logged out' });
});

module.exports = router;
