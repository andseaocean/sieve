import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables');
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || 'там';

  await bot.sendMessage(
    chatId,
    `👋 Привіт${firstName ? `, ${firstName}` : ''}! Я Vamos Hiring Bot.

Мабуть, ти тут для того, щоб подати заявку на одну із наших вакансій.

Натискай кнопку нижче і давай знайомитися!`,
    {
      reply_markup: {
        inline_keyboard: [[
          {
            text: '📝 Подати заявку',
            web_app: {
              url: process.env.NEXT_PUBLIC_APP_URL + '/apply'
            }
          }
        ]]
      }
    }
  );
});

bot.on('polling_error', (error) => {
  console.error('Telegram bot polling error:', error);
});

console.log('🤖 Telegram bot started and listening for messages...');

export default bot;
