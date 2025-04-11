// utils/telegram.js
const axios = require("axios");

/**
 * Send alert to Telegram channel
 * @param {Object} alert - Alert object with project information
 */
async function sendTelegramAlert(alert) {
  try {
    // Skip if Telegram is not configured
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      console.log("Telegram not configured, skipping notification");
      return;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // Format message based on alert type
    let message = `🚨 *MONAD PROJECT ALERT* 🚨\n\n`;

    switch (alert.alertType) {
      case "SCAM":
        message += "⚠️ *POTENTIAL SCAM DETECTED* ⚠️\n\n";
        break;
      case "RUG":
        message += "⚠️ *RUG PULL DETECTED* ⚠️\n\n";
        break;
      case "VERIFIED":
        message += "✅ *PROJECT VERIFIED* ✅\n\n";
        break;
      case "UNVERIFIED":
        message += "❌ *PROJECT UNVERIFIED* ❌\n\n";
        break;
      default:
        message += `*STATUS UPDATE: ${alert.alertType}*\n\n`;
    }

    message += `*Project:* ${alert.project.name}\n`;

    if (alert.project.contractAddress) {
      message += `*Contract:* \`${alert.project.contractAddress}\`\n`;
    }

    message += `*Message:* ${alert.message}\n\n`;

    // Add link to project details on frontend
    if (process.env.FRONTEND_URL) {
      message += `View details: ${process.env.FRONTEND_URL}/projects/${alert.project.id}`;
    }

    // Send message
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    });

    console.log("Telegram alert sent successfully");
  } catch (error) {
    console.error("Error sending Telegram alert:", error);
  }
}

module.exports = {
  sendTelegramAlert,
};
