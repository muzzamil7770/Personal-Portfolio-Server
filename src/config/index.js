const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10),
  nodeEnv: process.env.NODE_ENV,

  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM
  },

  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  },

  ai: {
    // Primary: Google Gemini
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL,
    
    // Fallback: OpenRouter
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    openRouterModel: process.env.OPENROUTER_MODEL ,
    
    // Local Backup: Ollama
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    ollamaModel: process.env.OLLAMA_MODEL ,
    
    // Generation settings
    maxTokens: parseInt(process.env.AI_MAX_TOKENS, 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE),
    topP: parseFloat(process.env.AI_TOP_P) ,
    topK: parseInt(process.env.AI_TOP_K, 10) ,
    
    // Site info for OpenRouter
    siteUrl: process.env.FRONTEND_URL,
  }
};

module.exports = config;
