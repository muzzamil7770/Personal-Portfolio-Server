const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const aiChatbotController = require('../controllers/aiChatbot.controller');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const dailyIpLimit = require('../middlewares/dailyIpLimit');

/**
 * AI Chatbot Routes
 * Public endpoints for chat interactions
 * Admin endpoints for analytics and management
 */

// Rate limiters for chat
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: {
    success: false,
    message: 'Too many messages, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictChatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 messages per hour
  message: {
    success: false,
    message: 'Hourly message limit reached. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// PUBLIC CHAT ENDPOINTS
// ============================================

/**
 * Send a chat message
 * POST /api/chat
 */
router.post('/', [chatLimiter, strictChatLimiter], aiChatbotController.chat);

/**
 * Clear conversation
 * POST /api/chat/clear
 */
router.post('/clear', chatLimiter, aiChatbotController.clearConversation);

/**
 * Get available commands
 * GET /api/chat/commands
 */
router.get('/commands', aiChatbotController.getCommands);

// ============================================
// ADMIN ENDPOINTS (JWT required)
// ============================================

/**
 * Get all conversations
 * GET /api/chat/conversations
 */
router.get('/conversations', verifyToken, isAdmin, aiChatbotController.getConversations);

/**
 * Get conversation messages
 * GET /api/chat/conversations/:sessionId
 */
router.get('/conversations/:sessionId', verifyToken, isAdmin, aiChatbotController.getConversationMessages);

/**
 * Delete a conversation
 * DELETE /api/chat/conversations/:sessionId
 */
router.delete('/conversations/:sessionId', verifyToken, isAdmin, aiChatbotController.deleteConversation);

/**
 * Get conversation statistics
 * GET /api/chat/conversation-stats
 */
router.get('/conversation-stats', verifyToken, isAdmin, aiChatbotController.getConversationStats);

/**
 * Get AI usage statistics
 * GET /api/chat/stats
 */
router.get('/stats', verifyToken, isAdmin, aiChatbotController.getStats);

module.exports = router;
