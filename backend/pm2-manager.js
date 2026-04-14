const pm2 = require('pm2');
const path = require('path');

const connectPM2 = () => {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

const startBot = async (botId, scriptPath) => {
  await connectPM2();
  return new Promise((resolve, reject) => {
    pm2.start({
      script: scriptPath,
      name: `bot-${botId}`,
      autorestart: true,
      watch: false,
      max_memory_restart: '100M',
    }, (err, apps) => {
      pm2.disconnect();
      if (err) return reject(err);
      resolve(apps);
    });
  });
};

const stopBot = async (botId) => {
  await connectPM2();
  return new Promise((resolve, reject) => {
    pm2.stop(`bot-${botId}`, (err, apps) => {
      pm2.disconnect();
      if (err) return reject(err);
      resolve(apps);
    });
  });
};

const deleteBotProcess = async (botId) => {
  await connectPM2();
  return new Promise((resolve, reject) => {
    pm2.delete(`bot-${botId}`, (err, apps) => {
      pm2.disconnect();
      if (err && err.message !== 'process or namespace not found') return reject(err);
      resolve();
    });
  });
};

const getBotStatus = async (botId) => {
  await connectPM2();
  return new Promise((resolve, reject) => {
    pm2.describe(`bot-${botId}`, (err, desc) => {
      pm2.disconnect();
      if (err) return reject(err);
      if (desc && desc.length > 0) {
        resolve(desc[0].pm2_env.status);
      } else {
        resolve('stopped');
      }
    });
  });
};

module.exports = { startBot, stopBot, deleteBotProcess, getBotStatus };
