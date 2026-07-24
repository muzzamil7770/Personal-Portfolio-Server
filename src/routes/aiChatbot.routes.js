const express = require('express');
const router = express.Router();
const aiChatbotController = require('../controllers/aiChatbot.controller');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

/**
 * AI Chatbot Routes
 * Public endpoints for chat interactions
 * Admin endpoints for analytics and management
 */

// ============================================
// PUBLIC CHAT ENDPOINTS
// ============================================

/**
 * Send a chat message
 * POST /api/chat
 */
router.post('/', aiChatbotController.chat);

/**
 * Clear conversation
 * POST /api/chat/clear
 */
router.post('/clear', aiChatbotController.clearConversation);

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
