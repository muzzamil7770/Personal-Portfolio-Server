const { getFirestore } = require('../utils/firebase');
const logger = require('../utils/logger');

/**
 * Firebase Conversation Storage Service
 * Stores all chat conversations in Firestore for persistence
 */
class ConversationStorageService {
  constructor() {
    this.collection = 'chat_conversations';
    this.messagesCollection = 'chat_messages';
  }

  /**
   * Save a complete conversation session
   */
  async saveConversation(sessionId, messages, metadata = {}) {
    const db = getFirestore();
    if (!db) {
      logger.warn('⚠️  Skipping conversation save - Firebase not available');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const admin = require('firebase-admin');
      const conversationRef = db.collection(this.collection).doc(sessionId);
      
      const conversationData = {
        sessionId,
        messageCount: messages.length,
        startTime: metadata.startTime || new Date().toISOString(),
        lastActive: new Date().toISOString(),
        userAgent: metadata.userAgent || '',
        ipAddress: metadata.ipAddress || '',
        status: 'active',
        updatedAt: new Date().toISOString(),
      };

      await conversationRef.set(conversationData, { merge: true });

      const batch = db.batch();
      messages.forEach((msg, index) => {
        const messageRef = db.collection(this.messagesCollection).doc(`${sessionId}_${index}`);
        batch.set(messageRef, {
          sessionId,
          sender: msg.sender,
          text: msg.text,
          timestamp: msg.timestamp || new Date().toISOString(),
          provider: msg.provider || null,
          command: msg.command || null,
          messageIndex: index,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      });

      await batch.commit();
      logger.info(`💬 Conversation saved: ${sessionId} (${messages.length} messages)`);
      return { success: true, sessionId };
    } catch (error) {
      logger.error('Error saving conversation:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save a single message to a conversation
   */
  async saveMessage(sessionId, message, messageIndex) {
    const db = getFirestore();
    if (!db) return { success: false, error: 'Firebase not initialized' };

    try {
      const admin = require('firebase-admin');
      const messageRef = db.collection(this.messagesCollection).doc(`${sessionId}_${messageIndex}`);
      await messageRef.set({
        sessionId,
        sender: message.sender,
        text: message.text,
        timestamp: message.timestamp || new Date().toISOString(),
        provider: message.provider || null,
        command: message.command || null,
        messageIndex,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      const conversationRef = db.collection(this.collection).doc(sessionId);
      await conversationRef.update({
        lastActive: new Date().toISOString(),
        messageCount: admin.firestore.FieldValue.increment(1),
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      logger.error('Error saving message:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all conversations (for admin)
   */
  async getConversations(limit = 50, offset = 0) {
    const db = getFirestore();
    if (!db) return { success: false, error: 'Firebase not initialized', conversations: [] };

    try {
      const snapshot = await db.collection(this.collection).orderBy('lastActive', 'desc').limit(limit).offset(offset).get();
      const conversations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, conversations };
    } catch (error) {
      logger.error('Error fetching conversations:', error.message);
      return { success: false, error: error.message, conversations: [] };
    }
  }

  /**
   * Get messages for a specific conversation
   */
  async getConversationMessages(sessionId) {
    const db = getFirestore();
    if (!db) return { success: false, error: 'Firebase not initialized', messages: [] };

    try {
      const snapshot = await db.collection(this.messagesCollection).where('sessionId', '==', sessionId).orderBy('messageIndex', 'asc').get();
      const messages = snapshot.docs.map(doc => doc.data());
      return { success: true, messages };
    } catch (error) {
      logger.error('Error fetching conversation messages:', error.message);
      return { success: false, error: error.message, messages: [] };
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats() {
    const db = getFirestore();
    if (!db) {
      return { success: false, error: 'Firebase not initialized', stats: { totalConversations: 0, totalMessages: 0, activeConversations: 0, avgMessagesPerConversation: 0 } };
    }

    try {
      const conversationsSnapshot = await db.collection(this.collection).get();
      const messagesSnapshot = await db.collection(this.messagesCollection).count().get();

      const totalConversations = conversationsSnapshot.size;
      const totalMessages = messagesSnapshot.data().count;
      let activeConversations = 0;
      
      conversationsSnapshot.forEach(doc => {
        const data = doc.data();
        const lastActive = new Date(data.lastActive);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (lastActive > oneHourAgo) activeConversations++;
      });

      return {
        success: true,
        stats: {
          totalConversations,
          totalMessages,
          activeConversations,
          avgMessagesPerConversation: totalConversations > 0 ? (totalMessages / totalConversations).toFixed(1) : 0,
        }
      };
    } catch (error) {
      logger.error('Error fetching conversation stats:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a conversation and its messages
   */
  async deleteConversation(sessionId) {
    const db = getFirestore();
    if (!db) return { success: false, error: 'Firebase not initialized' };

    try {
      const messagesSnapshot = await db.collection(this.messagesCollection).where('sessionId', '==', sessionId).get();
      const batch = db.batch();
      messagesSnapshot.forEach(doc => batch.delete(doc.ref));
      
      const conversationRef = db.collection(this.collection).doc(sessionId);
      batch.delete(conversationRef);
      
      await batch.commit();
      logger.info(`🗑️ Conversation deleted: ${sessionId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting conversation:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old conversations (older than specified hours)
   */
  async cleanupOldConversations(hoursOld = 24) {
    const db = getFirestore();
    if (!db) return { success: false, error: 'Firebase not initialized' };

    try {
      const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
      const snapshot = await db.collection(this.collection).where('lastActive', '<', cutoffTime.toISOString()).get();
      
      const batch = db.batch();
      let deletedCount = 0;

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      if (deletedCount > 0) {
        const messagesSnapshot = await db.collection(this.messagesCollection).where('createdAt', '<', cutoffTime.toISOString()).get();
        messagesSnapshot.forEach(doc => batch.delete(doc.ref));
      }

      await batch.commit();
      logger.info(`🧹 Cleaned up ${deletedCount} old conversations`);
      return { success: true, deletedCount };
    } catch (error) {
      logger.error('Error cleaning up conversations:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ConversationStorageService();
