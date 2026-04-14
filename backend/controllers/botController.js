const fs = require('fs');
const path = require('path');
const db = require('../db');
const { startBot, stopBot, deleteBotProcess, getBotStatus } = require('../pm2-manager');

const createBot = async (req, res) => {
  const { name, code } = req.body;
  const userId = req.user.id;

  try {
    const result = await db.query(
      'INSERT INTO bots (user_id, name) VALUES ($1, $2) RETURNING id, name, status',
      [userId, name]
    );
    const newBot = result.rows[0];

    // Create bot directory and files
    const botDir = path.join(__dirname, '../../bots', newBot.id.toString());
    fs.mkdirSync(botDir, { recursive: true });
    
    // Write a simple index.js
    const defaultCode = code || `console.log("Bot started!");\n// require('discord.js');`;
    fs.writeFileSync(path.join(botDir, 'index.js'), defaultCode);
    
    // Create a default package.json
    const pkg = {
      name: `bot-${newBot.id}`,
      version: "1.0.0",
      main: "index.js",
      dependencies: {
        "discord.js": "^14.13.0",
        "dotenv": "^16.3.1"
      }
    };
    fs.writeFileSync(path.join(botDir, 'package.json'), JSON.stringify(pkg, null, 2));

    res.status(201).json(newBot);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBots = async (req, res) => {
  const userId = req.user.id;

  try {
    const bots = await db.query('SELECT * FROM bots WHERE user_id = $1', [userId]);
    res.json(bots.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const toggleBot = async (req, res, action) => {
  const botId = req.params.id;
  const userId = req.user.id;

  try {
    // Validate ownership
    const botCheck = await db.query('SELECT * FROM bots WHERE id = $1 AND user_id = $2', [botId, userId]);
    if (botCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Bot not found or unauthorized' });
    }

    const scriptPath = path.join(__dirname, '../../bots', botId, 'index.js');
    
    if (action === 'start') {
      await startBot(botId, scriptPath);
      await db.query(`UPDATE bots SET status = 'running' WHERE id = $1`, [botId]);
    } else {
      await stopBot(botId);
      await db.query(`UPDATE bots SET status = 'stopped' WHERE id = $1`, [botId]);
    }

    res.json({ message: \`Bot \${action}ed successfully\` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error managing bot process' });
  }
};

const startBotAction = (req, res) => toggleBot(req, res, 'start');
const stopBotAction = (req, res) => toggleBot(req, res, 'stop');

const getBotLogs = async (req, res) => {
  const botId = req.params.id;
  const userId = req.user.id;

  try {
    const botCheck = await db.query('SELECT * FROM bots WHERE id = $1 AND user_id = $2', [botId, userId]);
    if (botCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Bot not found or unauthorized' });
    }

    const logs = await db.query('SELECT * FROM logs WHERE bot_id = $1 ORDER BY timestamp DESC LIMIT 100', [botId]);
    
    res.json(logs.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteBot = async (req, res) => {
    const botId = req.params.id;
    const userId = req.user.id;

    try {
        const botCheck = await db.query('SELECT * FROM bots WHERE id = $1 AND user_id = $2', [botId, userId]);
        if (botCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Bot not found' });
        }

        await deleteBotProcess(botId);
        await db.query('DELETE FROM bots WHERE id = $1', [botId]);
        
        const botDir = path.join(__dirname, '../../bots', botId);
        if (fs.existsSync(botDir)) {
             fs.rmSync(botDir, { recursive: true, force: true });
        }

        res.json({ message: 'Bot deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = { createBot, getBots, startBotAction, stopBotAction, getBotLogs, deleteBot };
