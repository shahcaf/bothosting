const express = require('express');
const router = express.Router();

// Admin auth middleware
const ensureAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    res.status(403).json({ message: 'Forbidden' });
};

// View all users
router.get('/users', ensureAdmin, async (req, res) => {
    const pool = req.app.locals.pool;
    const { rows } = await pool.query('SELECT * FROM users');
    res.json(rows);
});

// View all bots
router.get('/bots', ensureAdmin, async (req, res) => {
    const pool = req.app.locals.pool;
    const { rows } = await pool.query('SELECT * FROM bots');
    res.json(rows);
});

// Delete any bot
router.delete('/bots/:botId', ensureAdmin, async (req, res) => {
    const { botId } = req.params;
    const pool = req.app.locals.pool;
    await pool.query('DELETE FROM bots WHERE id = $1', [botId]);
    res.json({ message: 'Bot deleted by admin' });
});

module.exports = router;
