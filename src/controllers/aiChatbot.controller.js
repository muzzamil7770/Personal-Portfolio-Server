const aiChatbotService = require('../services/aiChatbot.service');
const conversationStorage = require('../services/conversationStorage.service');
const logger = require('../utils/logger');

/**
 * AI Chatbot Controller
 * Handles chat requests, conversation management, and analytics
 */
class AIChatbotController {
  /**
   * Handle chat message
   * POST /api/chat
   */
  async chat(req, res) {
    try {
      const { message, sessionId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Message is required and must be a string'
        });
      }

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      // Get or create conversation
      const conversation = aiChatbotService.getConversation(sessionId);
      
      // Check message length limit (prevent abuse)
      if (message.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Message too long. Please keep it under 2000 characters.'
        });
      }

      // Check conversation message limit (prevent runaway conversations)
      if (conversation.messageCount >= 50) {
        // Clear old conversation and start fresh
        aiChatbotService.clearConversation(sessionId);
        conversation.messages = [];
        conversation.messageCount = 0;
      }

      // Build conversation history (last 10 messages for context)
      const conversationHistory = conversation.messages.slice(-10).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Add user message to conversation
      conversation.messages.push({
        sender: 'user',
        text: message,
        timestamp: new Date().toISOString()
      });
      conversation.messageCount++;

      // Get AI response
      const response = await aiChatbotService.chat(sessionId, message, conversationHistory);

      // Add AI response to conversation
      if (response.success) {
        conversation.messages.push({
          sender: 'ai',
          text: response.text,
          timestamp: response.timestamp,
          provider: response.provider,
          command: response.command
        });
      }

      // Save conversation to Firebase
      conversationStorage.saveConversation(
        sessionId,
        conversation.messages,
        {
          startTime: conversation.createdAt,
          userAgent: req.headers['user-agent'] || '',
          ipAddress: req.ip || req.connection.remoteAddress || '',
        }
      ).catch(err => logger.error('Failed to save conversation:', err.message));

      // Log the interaction
      logger.info(`Chat message processed | Session: ${sessionId.slice(0, 8)}... | Provider: ${response.provider} | Command: ${response.command || 'none'}`);

      return res.status(200).json({
        success: true,
        data: {
          text: response.text,
          provider: response.provider,
          command: response.command,
          timestamp: response.timestamp,
          sessionId: sessionId,
          messageCount: conversation.messageCount
        }
      });

    } catch (error) {
      logger.error('Chat controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process chat message',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Clear conversation
   * POST /api/chat/clear
   */
  async clearConversation(req, res) {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      const result = aiChatbotService.clearConversation(sessionId);
      
      logger.info(`Conversation cleared | Session: ${sessionId.slice(0, 8)}...`);

      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Clear conversation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to clear conversation'
      });
    }
  }

  /**
   * Get all conversations (admin only)
   * GET /api/chat/conversations
   */
  async getConversations(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      
      const result = await conversationStorage.getConversations(limit, offset);
      
      return res.status(200).json(result);

    } catch (error) {
      logger.error('Get conversations error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversations'
      });
    }
  }

  /**
   * Get conversation messages (admin only)
   * GET /api/chat/conversations/:sessionId
   */
  async getConversationMessages(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      const result = await conversationStorage.getConversationMessages(sessionId);
      
      return res.status(200).json(result);

    } catch (error) {
      logger.error('Get conversation messages error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversation messages'
      });
    }
  }

  /**
   * Delete a conversation (admin only)
   * DELETE /api/chat/conversations/:sessionId
   */
  async deleteConversation(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      const result = await conversationStorage.deleteConversation(sessionId);
      
      return res.status(200).json(result);

    } catch (error) {
      logger.error('Delete conversation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete conversation'
      });
    }
  }

  /**
   * Get conversation statistics (admin only)
   * GET /api/chat/conversation-stats
   */
  async getConversationStats(req, res) {
    try {
      const result = await conversationStorage.getConversationStats();
      
      return res.status(200).json(result);

    } catch (error) {
      logger.error('Get conversation stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversation statistics'
      });
    }
  }

  /**
   * Get AI usage statistics (admin only)
   * GET /api/chat/stats
   */
  async getStats(req, res) {
    try {
      const stats = aiChatbotService.getStats();
      
      return res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Get stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics'
      });
    }
  }

  /**
   * Get available commands
   * GET /api/chat/commands
   */
  async getCommands(req, res) {
    try {
      const commands = aiChatbotService.knowledgeBase.portfolio.commands;
      
      return res.status(200).json({
        success: true,
        data: {
          commands: commands,
          totalCommands: Object.keys(commands).length
        }
      });

    } catch (error) {
      logger.error('Get commands error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve commands'
      });
    }
  }
}

module.exports = new AIChatbotController();
