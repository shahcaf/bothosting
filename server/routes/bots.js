const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const dockerManager = require('../utils/docker');

// Auth middleware (to be implemented more robustly)
const ensureAuthenticated = (req, res, next) => {
    if (req.user) return next();
    res.status(401).json({ message: 'Unauthorized' });
};

// Storage setup for bot uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/zips/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Folder for temporary uploads
fs.ensureDirSync('uploads/zips/');
fs.ensureDirSync('bots/');

// List user bots
router.get('/', ensureAuthenticated, async (req, res) => {
  const pool = req.app.locals.pool;
  const { rows } = await pool.query('SELECT * FROM bots WHERE owner_id = $1', [req.user.id]);
  res.json(rows);
});

// Get a single bot
router.get('/:botId', ensureAuthenticated, async (req, res) => {
  const { botId } = req.params;
  const pool = req.app.locals.pool;
  try {
    const { rows } = await pool.query('SELECT * FROM bots WHERE id = $1 AND owner_id = $2', [botId, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create Bot metadata
router.post('/create', ensureAuthenticated, async (req, res) => {
  const { name, ram_limit, cpu_limit, bot_token, githubRepo, clientId } = req.body;
  const pool = req.app.locals.pool;

  const botPath = path.join('bots', `${req.user.id}-${Date.now()}`);
  fs.ensureDirSync(botPath);

  const botId = require('crypto').randomUUID();
  try {
    const { rows } = await pool.query(
      'INSERT INTO bots (id, owner_id, name, ram_limit, cpu_limit, bot_token, discord_client_id, path, github_repo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [botId, req.user.id, name, ram_limit || 512, cpu_limit || 0.5, bot_token, clientId, botPath, githubRepo]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create bot instance' });
  }
});

// Upload bot files (Zip)
router.post('/upload/:botId', ensureAuthenticated, upload.single('botFile'), async (req, res) => {
  const { botId } = req.params;
  const pool = req.app.locals.pool;

  // Verify ownership
  const { rows } = await pool.query('SELECT * FROM bots WHERE id = $1 AND owner_id = $2', [botId, req.user.id]);
  if (rows.length === 0) return res.status(403).json({ message: 'Bot not found or unauthorized' });

  const bot = rows[0];
  const zipPath = req.file.path;
  const zip = new AdmZip(zipPath);

  // Extract to bot path
  zip.extractAllTo(bot.path, true);

  // Cleanup zip
  fs.unlinkSync(zipPath);

  res.json({ message: 'Files uploaded and extracted successfully' });
});

// Bot actions: start, stop, restart, delete
router.post('/action', ensureAuthenticated, async (req, res) => {
  const { botId, action } = req.body;
  const pool = req.app.locals.pool;
  const io = req.app.locals.io;

  const { rows } = await pool.query('SELECT * FROM bots WHERE id = $1 AND owner_id = $2', [botId, req.user.id]);
  if (rows.length === 0) return res.status(403).json({ message: 'Bot not found' });

  const bot = rows[0];

  try {
    switch (action) {
      case 'start':
        // If container doesnt exist, create it in background
        if (!bot.container_id) {
          const containerId = bot.id; 
          await pool.query('UPDATE bots SET container_id = $1, status = $2 WHERE id = $3', [containerId, 'starting', bot.id]);
          
          // Trigger background setup
          (async () => {
            try {
              await dockerManager.createContainer(bot, io);
              await dockerManager.startBot(containerId, bot, io, pool);
              await pool.query('UPDATE bots SET status = $1 WHERE id = $2', ['running', bot.id]);
            } catch (err) {
              console.error("Background start failed:", err);
              await pool.query('UPDATE bots SET status = $1 WHERE id = $2', ['stopped', bot.id]);
            }
          })();
        } else {
          await pool.query('UPDATE bots SET status = $1 WHERE id = $2', ['starting', bot.id]);
          // Trigger background start
          (async () => {
             try {
               await dockerManager.startBot(bot.container_id, bot, io, pool);
               await pool.query('UPDATE bots SET status = $1 WHERE id = $2', ['running', bot.id]);
             } catch (err) {
               console.error("Background start failed:", err);
               await pool.query('UPDATE bots SET status = $1 WHERE id = $2', ['stopped', bot.id]);
             }
          })();
        }
        return res.json({ message: 'Bot starting in background...', status: 'starting' });

      case 'stop':
        if (bot.container_id) {
            await dockerManager.stopBot(bot.container_id, bot, io);
            await pool.query('UPDATE bots SET status = $1 WHERE id = $2', ['stopped', bot.id]);
        }
        return res.json({ message: 'Bot stopped', status: 'stopped' });

      case 'restart':
        await pool.query('UPDATE bots SET status = $1 WHERE id = $2', ['starting', bot.id]);
        
        // Trigger background restart
        (async () => {
          try {
            if (bot.container_id) {
              await dockerManager.stopBot(bot.container_id, bot, io);
            }
            const containerIdForRestart = bot.container_id || bot.id;
            await dockerManager.startBot(containerIdForRestart, bot, io, pool);
            await pool.query('UPDATE bots SET container_id = $1, status = $2 WHERE id = $3', [containerIdForRestart, 'running', bot.id]);
          } catch (err) {
            console.error("Background restart failed:", err);
            await pool.query('UPDATE bots SET status = $1 WHERE id = $2', ['stopped', bot.id]);
          }
        })();
        
        return res.json({ message: 'Bot restarting in background...', status: 'starting' });

      case 'delete':
        if (bot.container_id) {
            await dockerManager.deleteBotContainer(bot.container_id, bot);
        }
        await pool.query('DELETE FROM bots WHERE id = $1', [bot.id]);
        return res.json({ message: 'Bot deleted' });

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Action failed', error: err.message });
  }
});

// Get container resource stats
router.get('/stats/:botId', ensureAuthenticated, async (req, res) => {
    const { botId } = req.params;
    const pool = req.app.locals.pool;

    const { rows } = await pool.query('SELECT * FROM bots WHERE id = $1 AND owner_id = $2', [botId, req.user.id]);
    if (rows.length === 0 || !rows[0].container_id) return res.status(404).json({ message: 'Not found or not running' });

    const stats = await dockerManager.getStats(rows[0].container_id);
    res.json(stats);
});

module.exports = router;
