const express = require('express');
const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
  if (req.user) return next();
  res.status(401).json({ message: 'Unauthorized' });
};

// Get monitor settings
router.get('/settings', ensureAuthenticated, async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const { rows } = await pool.query('SELECT * FROM monitor_settings WHERE user_id = $1', [req.user.id]);
    if (rows.length === 0) {
      // Return defaults
      return res.json({ alert_email: '', alerts_enabled: true, auto_restart: false });
    }
    res.json({
      alert_email: rows[0].alert_email || '',
      alerts_enabled: !!rows[0].alerts_enabled,
      auto_restart: !!rows[0].auto_restart
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get settings' });
  }
});

// Update monitor settings
router.post('/settings', ensureAuthenticated, async (req, res) => {
  const { alert_email, alerts_enabled, auto_restart } = req.body;
  const pool = req.app.locals.pool;
  try {
    // Upsert
    const existing = await pool.query('SELECT * FROM monitor_settings WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE monitor_settings SET alert_email = $1, alerts_enabled = $2, auto_restart = $3 WHERE user_id = $4',
        [alert_email, alerts_enabled ? 1 : 0, auto_restart ? 1 : 0, req.user.id]
      );
    } else {
      await pool.query(
        'INSERT INTO monitor_settings (user_id, alert_email, alerts_enabled, auto_restart) VALUES ($1, $2, $3, $4)',
        [req.user.id, alert_email, alerts_enabled ? 1 : 0, auto_restart ? 1 : 0]
      );
    }
    res.json({ message: 'Settings saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save settings' });
  }
});

// Get all bots with their current status for monitoring
router.get('/status', ensureAuthenticated, async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const { rows } = await pool.query('SELECT id, name, status, github_repo FROM bots WHERE owner_id = $1', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get status' });
  }
});

module.exports = router;
