import '../lib/telegram/bot';

process.on('SIGINT', () => {
  console.log('\n🛑 Telegram bot stopped');
  process.exit(0);
});
