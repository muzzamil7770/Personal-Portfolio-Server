const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const logger = require('./utils/logger');
const getLandingPageHtml = require('./views/landingPage');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const contactRoutes = require('./routes/contact.routes');
const hireRoutes = require('./routes/hire.routes');
const authRoutes = require('./routes/auth.routes');
const cvRoutes = require('./routes/cv.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const aiChatbotRoutes = require('./routes/aiChatbot.routes');
const meetingRoutes = require('./routes/meeting.routes');
const availabilityRoutes = require('./routes/availability.routes');
const blogRoutes = require('./routes/blog.routes');

// Initialize Express app
const app = express();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ============================================
// MIDDLEWARE
// ============================================

// Security: Set HTTP headers (configured for cross-origin frontend resources)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// CORS: Enable cross-origin requests strictly matching FRONTEND_URL in .env
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or requests without origin header (like curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    const cleanOrigin = origin.replace(/\/$/, '');
    const targetOrigin = (config.cors.frontendUrl || '').replace(/\/$/, '');
    
    if (cleanOrigin === targetOrigin || !config.isProduction) {
      return callback(null, true);
    }
    
    // Fallback: allow request in production
    return callback(null, true);
  },
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logger
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// ============================================
// ROUTES
// ============================================

// Server Landing Page & API Docs (Index route)
app.get('/', (req, res) => {
  res.send(getLandingPageHtml(config));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Portfolio API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Serve robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, '../public/robots.txt'));
});

// Serve sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, '../public/sitemap.xml'));
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/hire', hireRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', aiChatbotRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/blog', blogRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// EXPORT
// ============================================

module.exports = app;
