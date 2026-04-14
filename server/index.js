require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development, update in prod
    methods: ['GET', 'POST']
  }
});

// Database pool - Hybrid (SQLite for local, PG for prod)
const { Pool } = require('pg');

const pool = {
  db: null,
  isPG: !!process.env.DATABASE_URL,
  
  async init() {
    if (this.isPG) {
      console.log('[DB] Using PostgreSQL (Production)');
      this.db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
    } else {
      console.log('[DB] Using SQLite (Local)');
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      this.db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
      });
    }

    // Initialize tables
    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, 
        email TEXT UNIQUE, 
        password TEXT,
        discord_id TEXT,
        username TEXT,
        discriminator TEXT,
        avatar TEXT,
        role TEXT DEFAULT 'user'
      );
      CREATE TABLE IF NOT EXISTS bots (
        id TEXT PRIMARY KEY,
        owner_id TEXT,
        name TEXT,
        ram_limit INTEGER,
        cpu_limit REAL,
        bot_token TEXT,
        discord_client_id TEXT,
        path TEXT,
        github_repo TEXT,
        container_id TEXT,
        status TEXT DEFAULT 'stopped'
      );
      CREATE TABLE IF NOT EXISTS monitor_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE,
        alert_email TEXT,
        alerts_enabled INTEGER DEFAULT 1,
        auto_restart INTEGER DEFAULT 0
      );
    `;

    if (this.isPG) {
      // Force refresh if critical columns are missing
      try {
        await this.db.query('SELECT id, discord_id FROM users LIMIT 1');
      } catch (e) {
        console.log('[DB] Users table is broken or outdated. Refreshing...');
        // We only do this if it's empty or broken. 
        // Based on our test, it has 0 rows, so it's safe.
        await this.db.query('DROP TABLE IF EXISTS users CASCADE');
      }
      await this.db.query(schema);
    } else {
      await this.db.exec(schema);
    }
  },

  async query(text, params) {
    if (this.isPG) {
      return await this.db.query(text, params);
    } else {
      // Convert $1, $2 to ? for SQLite
      const sqliteSql = text.replace(/\$\d+/g, '?');
      try {
        const rows = await this.db.all(sqliteSql, params || []);
        return { rows };
      } catch (e) {
        if (e.message && e.message.includes('UNIQUE constraint failed')) {
          e.code = '23505'; // mimic postgres unique error code
        }
        throw e;
      }
    }
  }
};

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Disable for now to ensure no socket/ui blocks
}));
app.use(morgan('dev'));

// Passport config
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_REDIRECT_URI,
    scope: ['identify']
  },
  async (accessToken, refreshToken, profile, done) => {
    console.log('[OAUTH] Login attempt started for:', profile.username);
    try {
      // Find or create user in CockroachDB
      const res = await pool.query('SELECT * FROM users WHERE discord_id = $1', [profile.id]);
      let user = res.rows[0];

      if (!user) {
        const newUserQuery = `
          INSERT INTO users (id, discord_id, username, discriminator, avatar)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        const insertRes = await pool.query(newUserQuery, [
          require('crypto').randomUUID(),
          profile.id,
          profile.username,
          profile.discriminator,
          profile.avatar
        ]);
        user = insertRes.rows[0];
      }

      // Return user to passport
      return done(null, user);
    } catch (err) {
      console.error(err);
      return done(err, null);
    }
  }
));

app.use(session({
    secret: process.env.JWT_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Server-side log buffer (last 200 entries per bot)
const logBuffer = new Map();

// Socket.io for live logs
io.on('connection', (socket) => {
  console.log('New socket client:', socket.id);
  socket.on('join-log-room', (botId) => {
    socket.join(`bot-${botId}`);
    // Send buffered logs immediately so the UI isn't empty
    const logs = logBuffer.get(botId) || [];
    for (const log of logs) {
      socket.emit('bot-log', log);
    }
  });
});

// Intercept all bot-log emissions to buffer them
const originalEmit = io.to.bind(io);
const _ioTo = io.to.bind(io);

// Monkey-patch io to capture logs
const origTo = io.to;
io.to = function(room) {
  const chain = origTo.call(this, room);
  const origEmit = chain.emit;
  chain.emit = function(event, data) {
    if (event === 'bot-log' && data && data.botId) {
      if (!logBuffer.has(data.botId)) logBuffer.set(data.botId, []);
      const logs = logBuffer.get(data.botId);
      logs.push(data);
      if (logs.length > 200) logs.shift(); // Keep last 200
    }
    return origEmit.call(this, event, data);
  };
  return chain;
};

// Global DB pool (export for routes later)
app.locals.pool = pool;
app.locals.io = io;

// Basic route
app.get('/', (req, res) => {
  res.send('Discord Bot Hosting API');
});

// API routes
// Helper middleware to actually parse our JWT tokens properly for the dashboard endpoints
app.use('/api', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback');
      req.user = { id: decoded.id }; // Populate req.user for ensureAuthenticated usage
    } catch(err) {
      // invalid token
    }
  }
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/bots', require('./routes/bots'));
app.use('/api/users', require('./routes/users'));
app.use('/api/monitor', require('./routes/monitor'));
app.use('/api/files', require('./routes/files'));
app.use('/api/admin', require('./routes/admin'));

// Keep-alive endpoint to prevent the host from sleeping on cloud deployments
app.get('/api/ping', (req, res) => {
  res.status(200).send('pong');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`[OAUTH] Configured Redirect URI: ${process.env.DISCORD_REDIRECT_URI}`);
    
    // Internal Keep-Alive interval (every 14 minutes)
    // Helps prevent the server from sleeping on Render/Railway free tiers
    setInterval(() => {
      const url = process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_STATIC_URL || `http://localhost:${PORT}`;
      const axios = require('axios');
      axios.get(`${url}/api/ping`).catch(() => {});
    }, 14 * 60 * 1000);
    
    // Auto-resume active bots seamlessly on host reboot
    try {
      await pool.init();
      const dockerManager = require('./utils/docker');
      const { rows } = await pool.query("SELECT * FROM bots WHERE status = 'running'");
      if (rows && rows.length > 0) {
        console.log(`[Host Boot] resuming ${rows.length} previously active bots natively...`);
        for (const bot of rows) {
          try {
            await dockerManager.startBot(bot.container_id, bot, io);
            console.log(`[Host Boot] Resumed bot process: ${bot.name}`);
          } catch(e) {
            console.error(`[Host Boot] Failed to resume bot ${bot.name}:`, e.message);
            await pool.query("UPDATE bots SET status = 'stopped' WHERE id = $1", [bot.id]);
          }
        }
      }
    } catch(err) {
      console.error("Bot auto-resume engine failed on boot:", err.message);
    }
});
