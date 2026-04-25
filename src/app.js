const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const contactRoutes = require('./routes/contact.routes');
const hireRoutes = require('./routes/hire.routes');
const authRoutes = require('./routes/auth.routes');
const cvRoutes = require('./routes/cv.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const aiChatbotRoutes = require('./routes/aiChatbot.routes');
const meetingRoutes = require('./routes/meeting.routes');
const availabilityRoutes = require('./routes/availability.routes');

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

// Security: Set HTTP headers
app.use(helmet());

// CORS: Enable cross-origin requests from Angular frontend
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
// RATE LIMITING
// ============================================

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 150 * 60 * 1000, // 15 minutes
  max: 1001, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const authHeader = req.headers.authorization;
    const isAnalyticsHeartbeat = req.path === '/api/analytics/heartbeat';
    const isAnalyticsLive = req.path === '/api/analytics/live';
    return authHeader && authHeader.startsWith('Bearer ') || isAnalyticsHeartbeat || isAnalyticsLive;
  }
});

// Strict rate limiter for PUBLIC email form submissions only
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 public email submissions per hour
  message: {
    success: false,
    message: 'Too many email requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for authenticated admin requests
  skip: (req) => {
    const authHeader = req.headers.authorization;
    return authHeader && authHeader.startsWith('Bearer ');
  }
});

// Apply general rate limiter
app.use('/api', generalLimiter);

// Apply strict rate limiter to PUBLIC email submissions only
// Admin routes (GET/PUT/DELETE) are excluded via the skip function above
app.post('/api/contact', emailLimiter);
app.post('/api/hire', emailLimiter);

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Portfolio API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
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
