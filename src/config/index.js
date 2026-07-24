const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Helper to parse comma-separated origin strings into a sanitized array from process.env
const parseOrigins = (...sources) => {
  const origins = new Set();
  sources.forEach((src) => {
    if (!src) return;
    src.split(',').forEach((url) => {
      const trimmed = url.trim().replace(/\/$/, '');
      if (trimmed) origins.add(trimmed);
    });
  });
  return Array.from(origins);
};

const config = {
  port: parseInt(process.env.PORT, 10),
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === 'production',

  // Authentication & Security
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '8h'
  },
  admin: {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD
  },

  // CORS Configuration (Strictly from process.env)
  cors: {
    frontendUrl: process.env.FRONTEND_URL,
    allowedOrigins: parseOrigins(
      process.env.FRONTEND_URL,
      process.env.ADDITIONAL_ALLOWED_ORIGINS
    ),
    credentials: true
  },

  // Email Configuration (Strictly from process.env)
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM
  },

  // Firebase Credentials (Strictly from process.env)
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
    databaseUrl: process.env.FIREBASE_DATABASE_URL
  },

  // AI Chatbot Settings (Strictly from process.env)
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL,
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    openRouterModel: process.env.OPENROUTER_MODEL,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    ollamaModel: process.env.OLLAMA_MODEL,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS, 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE),
    topP: parseFloat(process.env.AI_TOP_P),
    topK: parseInt(process.env.AI_TOP_K, 10),
    siteUrl: process.env.FRONTEND_URL
  }
};

module.exports = config;
