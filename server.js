const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { initFirebase } = require('./src/utils/firebase');
const FirebaseLogTransport = require('./src/utils/firebaseLogTransport');
const http = require('http');
const { initSocket } = require('./src/socket');

// Initialize Firebase before starting server
initFirebase();

// Attach Firebase log transport after Firebase is ready
logger.add(new FirebaseLogTransport({ level: 'info' }));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start the server
server.listen(config.port, () => {
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
  if (logger) logger.error('Unhandled Rejection:', err);
  else console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  if (logger) logger.error('Uncaught Exception:', err);
  else console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  if (logger) logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  if (logger) logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
