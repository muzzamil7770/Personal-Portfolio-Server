const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { initFirebase } = require('./src/utils/firebase');

// Initialize Firebase before starting server
initFirebase();

// Start the server
app.listen(config.port, () => {
  logger.info(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🚀 Portfolio Backend Server Started                   ║
║                                                        ║
║   Port: ${config.port}${' '.repeat(45 - String(config.port).length)}║
║   Environment: ${config.nodeEnv}${' '.repeat(39 - config.nodeEnv.length)}║
║   Time: ${new Date().toLocaleString()}${' '.repeat(38 - new Date().toLocaleString().length)}║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
