const nodemailer = require('nodemailer');

// Create a reusable transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL || '',
    pass: process.env.SMTP_PASSWORD || ''
  }
});

/**
 * Send a crash alert email
 */
async function sendCrashAlert(toEmail, botName, exitCode) {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.log('[Monitor] SMTP not configured, skipping email alert.');
    return;
  }

  const mailOptions = {
    from: `"BotHost Monitor" <${process.env.SMTP_EMAIL}>`,
    to: toEmail,
    subject: `⚠️ Bot "${botName}" has crashed!`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b;">
        <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">⚠️ Bot Crash Alert</h1>
        </div>
        <div style="padding: 32px; color: #e2e8f0;">
          <p style="font-size: 16px; margin-bottom: 8px;">Your bot <strong style="color: #818cf8;">"${botName}"</strong> has stopped running.</p>
          <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0; color: #94a3b8;">Exit Code: <strong style="color: #ef4444;">${exitCode}</strong></p>
            <p style="margin: 8px 0 0; color: #94a3b8;">Time: <strong style="color: #f8fafc;">${new Date().toLocaleString()}</strong></p>
          </div>
          <p style="color: #94a3b8; font-size: 14px;">Log into your <a href="http://localhost:5173/dashboard" style="color: #818cf8;">BotHost Dashboard</a> to check logs and restart.</p>
        </div>
        <div style="background: #1e293b; padding: 16px; text-align: center;">
          <p style="margin: 0; color: #475569; font-size: 12px;">BotHost Monitoring System</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Monitor] Crash alert sent to ${toEmail} for bot "${botName}"`);
  } catch (err) {
    console.error('[Monitor] Failed to send email:', err.message);
  }
}

module.exports = { sendCrashAlert };
