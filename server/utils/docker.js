const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { sendCrashAlert } = require('./mailer');

class LocalProcessManager {
  constructor() {
    this.processes = new Map();
  }

  /**
   * Run a command and stream output to logs.
   * Returns a promise that resolves on exit code 0, rejects otherwise.
   */
  runStreamedCommand(command, args, cwd, botId, io, systemMsg) {
    return new Promise((resolve, reject) => {
      if (systemMsg && io) {
        io.to(`bot-${botId}`).emit('bot-log', { botId, message: `[SYSTEM] ${systemMsg}`, timestamp: new Date() });
      }

      const proc = spawn(command, args, {
        cwd,
        shell: true,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
      });

      let stderrBuffer = '';

      proc.stdout.on('data', (data) => {
        if (io) io.to(`bot-${botId}`).emit('bot-log', { botId, message: data.toString(), timestamp: new Date() });
      });

      proc.stderr.on('data', (data) => {
        const msg = data.toString();
        stderrBuffer += msg;
        if (io) io.to(`bot-${botId}`).emit('bot-log', { botId, message: `[DEP] ${msg}`, timestamp: new Date() });
      });

      proc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`'${command}' failed (code ${code}): ${stderrBuffer.slice(-200)}`));
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn '${command}': ${err.message}`));
      });
    });
  }

  /**
   * Clone repo and install dependencies. Smart — skips steps that are already done.
   */
  async createContainer(bot, io) {
    const botDir = path.resolve(bot.path);

    try {
      // Step 1: Clone only if repo isn't already there
      if (!fs.existsSync(path.join(botDir, 'package.json'))) {
        // Clean any partial clone leftovers
        if (fs.existsSync(botDir)) {
          if (io) io.to(`bot-${bot.id}`).emit('bot-log', { botId: bot.id, message: `[SYSTEM] Cleaning broken directory...`, timestamp: new Date() });
          fs.removeSync(botDir);
        }
        
        fs.ensureDirSync(path.dirname(botDir));
        await this.runStreamedCommand('git', ['clone', '--depth', '1', bot.github_repo, botDir], path.dirname(botDir), bot.id, io, `Cloning ${bot.github_repo}...`);
      } else {
        if (io) io.to(`bot-${bot.id}`).emit('bot-log', { botId: bot.id, message: `[SYSTEM] Repository already cloned, skipping...`, timestamp: new Date() });
      }

      // Step 2: Write .env
      if (io) io.to(`bot-${bot.id}`).emit('bot-log', { botId: bot.id, message: `[SYSTEM] Writing .env configuration...`, timestamp: new Date() });
      fs.writeFileSync(path.join(botDir, '.env'), `DISCORD_TOKEN=${bot.bot_token}\nBOT_TOKEN=${bot.bot_token}\nTOKEN=${bot.bot_token}\nCLIENT_ID=${bot.discord_client_id}\nPREFIX=!\n`);

      // Step 3: npm install only if node_modules missing
      if (!fs.existsSync(path.join(botDir, 'node_modules'))) {
        const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        await this.runStreamedCommand(npm, ['install', '--no-audit', '--no-fund'], botDir, bot.id, io, `Installing dependencies...`);
      } else {
        if (io) io.to(`bot-${bot.id}`).emit('bot-log', { botId: bot.id, message: `[SYSTEM] Dependencies already installed, skipping...`, timestamp: new Date() });
      }

      if (io) io.to(`bot-${bot.id}`).emit('bot-log', { botId: bot.id, message: `[SYSTEM] ✓ Setup complete!`, timestamp: new Date() });
      return bot.id;
    } catch (e) {
      console.error("Setup failed:", e.message);
      if (io) io.to(`bot-${bot.id}`).emit('bot-log', { botId: bot.id, message: `[ERROR] Setup failed: ${e.message}`, timestamp: new Date() });
      throw e;
    }
  }

  async startBot(containerId, bot, io, pool) {
    const botDir = path.resolve(bot.path);

    // Auto-setup if needed
    if (!fs.existsSync(path.join(botDir, 'node_modules'))) {
      await this.createContainer(bot, io);
    }

    // Kill any existing process for this bot
    if (this.processes.has(containerId)) {
      try {
        const oldProc = this.processes.get(containerId);
        if (process.platform === 'win32') {
          const { execSync } = require('child_process');
          execSync(`taskkill /pid ${oldProc.pid} /T /F`, { stdio: 'ignore' });
        } else {
          oldProc.kill('SIGTERM');
        }
      } catch (e) {}
      this.processes.delete(containerId);
    }

    // Find entry point
    let startScript = 'index.js';
    if (!fs.existsSync(path.join(botDir, 'index.js')) && fs.existsSync(path.join(botDir, 'main.js'))) {
      startScript = 'main.js';
    }

    if (io) io.to(`bot-${bot.id}`).emit('bot-log', { botId: bot.id, message: `[SYSTEM] Starting: node ${startScript}`, timestamp: new Date() });

    // Give the bot its own PORT so it doesn't conflict with our server on 5000
    const botPort = 3000 + Math.floor(Math.random() * 5000);
    const botEnv = { ...process.env, PORT: String(botPort) };

    const botProc = spawn('node', [startScript], { cwd: botDir, shell: true, env: botEnv });
    this.processes.set(containerId, botProc);

    botProc.stdout.on('data', (data) => {
      if (io) io.to(`bot-${bot.id}`).emit('bot-log', { botId: bot.id, message: data.toString(), timestamp: new Date() });
    });

    botProc.stderr.on('data', (data) => {
      if (io) io.to(`bot-${bot.id}`).emit('bot-log', { botId: bot.id, message: `ERR: ${data.toString()}`, timestamp: new Date() });
    });

    botProc.on('exit', async (code) => {
      this.processes.delete(containerId);
      if (io) io.to(`bot-${bot.id}`).emit('bot-log', { botId: bot.id, message: `[SYSTEM] Process exited with code ${code}`, timestamp: new Date() });
      if (pool) {
        try { 
          await pool.query("UPDATE bots SET status = 'stopped' WHERE id = $1", [bot.id]); 
          
          // Send crash alert if code != 0 and user has alerts enabled
          if (code !== 0) {
            const { rows } = await pool.query('SELECT alert_email, alerts_enabled FROM monitor_settings WHERE user_id = $1', [bot.owner_id]);
            if (rows.length > 0 && rows[0].alerts_enabled && rows[0].alert_email) {
              await sendCrashAlert(rows[0].alert_email, bot.name, code);
            }
          }
        } catch (e) {
          console.error("Failed to handle process exit database/mail logic:", e);
        }
      }
    });

    return true;
  }

  async stopBot(containerId, bot, io) {
    if (this.processes.has(containerId)) {
      const proc = this.processes.get(containerId);
      
      // On Windows, shell:true creates a cmd.exe wrapper.
      // .kill() only kills the wrapper, not the actual node child.
      // We must kill the entire process tree.
      try {
        if (process.platform === 'win32') {
          const { execSync } = require('child_process');
          execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
        } else {
          proc.kill('SIGTERM');
        }
      } catch (e) {
        // Process may already be dead
      }
      
      this.processes.delete(containerId);
      if (io && bot) {
        io.to(`bot-${bot.id}`).emit('bot-log', { botId: bot.id, message: `[SYSTEM] Stopped by user.`, timestamp: new Date() });
      }
    }
    return true;
  }

  async restartBot(containerId, bot, io, pool) {
    await this.stopBot(containerId, bot, io);
    await this.startBot(containerId, bot, io, pool);
    return true;
  }

  async deleteBotContainer(containerId, bot) {
    if (this.processes.has(containerId)) {
      this.processes.get(containerId).kill();
      this.processes.delete(containerId);
    }
    const botDir = path.resolve(bot.path);
    if (fs.existsSync(botDir)) {
      fs.removeSync(botDir);
    }
    return true;
  }
}

module.exports = new LocalProcessManager();
