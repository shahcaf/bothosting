const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');

const ensureAuthenticated = (req, res, next) => {
  if (req.user) return next();
  res.status(401).json({ message: 'Unauthorized' });
};

// Get file tree for a bot
router.get('/list/:botId', ensureAuthenticated, async (req, res) => {
  const { botId } = req.params;
  const pool = req.app.locals.pool;

  try {
    const { rows } = await pool.query('SELECT path FROM bots WHERE id = $1 AND owner_id = $2', [botId, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Bot not found' });

    const botPath = path.resolve(rows[0].path);
    
    // Simple recursive file listing (limited to prevent overflow)
    const getFiles = (dir, relative = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let files = [];
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const relPath = path.join(relative, entry.name);
        if (entry.isDirectory()) {
          files.push({ name: entry.name, path: relPath, type: 'dir', children: getFiles(path.join(dir, entry.name), relPath) });
        } else {
          files.push({ name: entry.name, path: relPath, type: 'file' });
        }
      }
      return files;
    };

    const fileTree = getFiles(botPath);
    res.json(fileTree);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to list files' });
  }
});

// Read file content
router.get('/read/:botId', ensureAuthenticated, async (req, res) => {
  const { botId } = req.params;
  const { filePath } = req.query; // relative path
  const pool = req.app.locals.pool;

  try {
    const { rows } = await pool.query('SELECT path FROM bots WHERE id = $1 AND owner_id = $2', [botId, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Bot not found' });

    const fullPath = path.join(path.resolve(rows[0].path), filePath);
    
    // Security check: ensure path is within bot directory
    if (!fullPath.startsWith(path.resolve(rows[0].path))) {
       return res.status(403).json({ message: 'Access denied' });
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to read file' });
  }
});

// Save file content
router.post('/save/:botId', ensureAuthenticated, async (req, res) => {
  const { botId } = req.params;
  const { filePath, content } = req.body;
  const pool = req.app.locals.pool;

  try {
    const { rows } = await pool.query('SELECT path FROM bots WHERE id = $1 AND owner_id = $2', [botId, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Bot not found' });

    const fullPath = path.join(path.resolve(rows[0].path), filePath);
    
    // Security check
    if (!fullPath.startsWith(path.resolve(rows[0].path))) {
       return res.status(403).json({ message: 'Access denied' });
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    res.json({ message: 'File saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save file' });
  }
});

module.exports = router;
