import Chat from '../models/chat.js';
import User from '../models/user.js';
import Order from '../models/order.js';

// Create or get conversation
export const createOrGetConversation = async (req, res) => {
  try {
    const { order_id, subject, force_new } = req.body;
    const userId = req.user.userId || req.user.id; // Support both userId and id

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    let conversation;

    // If force_new is true, always create a new conversation
    if (force_new) {
      conversation = await Chat.createConversation({
        user_id: userId,
        order_id: order_id || null,
        subject: subject || 'General Support',
        status: 'open',
      });
    } else {
      // Check if conversation already exists
      conversation = await Chat.getConversationByUserAndOrder(userId, order_id || null);

      if (!conversation) {
        // Create new conversation
        conversation = await Chat.createConversation({
          user_id: userId,
          order_id: order_id || null,
          subject: subject || 'General Support',
          status: 'open',
        });
      }
    }

    // Get messages for this conversation
    const messages = await Chat.getConversationMessages(conversation.id);

    res.json({
      success: true,
      conversation,
      messages,
    });
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create or get conversation',
      error: error.message,
    });
  }
};

// Get user's conversations
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const conversations = await Chat.getUserConversations(userId);

    res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error('Error getting user conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message,
    });
  }
};

// Get conversation messages
export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId || req.user.id;
    const userRole = req.user.role;
    const { limit = 100, offset = 0 } = req.query;

    // Verify user owns this conversation OR is an admin
    const conversation = await Chat.getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Allow access if user owns conversation or is superadmin
    if (conversation.user_id !== userId && userRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to conversation',
      });
    }

    const messages = await Chat.getConversationMessages(conversationId, parseInt(limit), parseInt(offset));

    // Only mark messages as read for regular users, not admins viewing
    if (conversation.user_id === userId) {
      await Chat.markMessagesAsRead(conversationId, userId);
    }

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message,
    });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { conversation_id, message } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
    }

    // Verify user owns this conversation
    const conversation = await Chat.getConversationById(conversation_id);
    if (!conversation || conversation.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to conversation',
      });
    }

    // Create message
    const newMessage = await Chat.createMessage({
      conversation_id,
      sender_id: userId,
      sender_type: 'user',
      message: message.trim(),
      is_read: false,
    });

    // Emit socket event for real-time update
    if (req.io) {
      req.io.to(`conversation_${conversation_id}`).emit('new_message', newMessage);
      req.io.to('admin_chat').emit('new_user_message', {
        conversation_id,
        message: newMessage,
        conversation,
      });
    }

    res.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

// Get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const count = await Chat.getUnreadCount(userId);

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message,
    });
  }
};

// Close conversation
export const closeConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId || req.user.id;

    // Verify user owns this conversation
    const conversation = await Chat.getConversationById(conversationId);
    if (!conversation || conversation.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to conversation',
      });
    }

    await Chat.updateConversation(conversationId, { status: 'closed' });

    res.json({
      success: true,
      message: 'Conversation closed successfully',
    });
  } catch (error) {
    console.error('Error closing conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close conversation',
      error: error.message,
    });
  }
};

// Admin: Get all conversations
export const getAdminConversations = async (req, res) => {
  try {
    const { status = 'all', limit = 50, offset = 0 } = req.query;
    const conversations = await Chat.getAdminConversations(status, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error('Error getting admin conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message,
    });
  }
};

// Admin: Send message
export const sendAdminMessage = async (req, res) => {
  try {
    const { conversation_id, message } = req.body;
    const adminId = req.user.userId || req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
    }

    // Verify conversation exists
    const conversation = await Chat.getConversationById(conversation_id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Create message
    const newMessage = await Chat.createMessage({
      conversation_id,
      sender_id: adminId,
      sender_type: 'support',
      message: message.trim(),
      is_read: false,
    });

    // Update conversation status to active if closed
    if (conversation.status === 'closed') {
      await Chat.updateConversation(conversation_id, { status: 'open' });
    }

    // Emit socket event for real-time update
    if (req.io) {
      req.io.to(`conversation_${conversation_id}`).emit('new_message', newMessage);
      req.io.to(`user_${conversation.user_id}`).emit('new_support_message', {
        conversation_id,
        message: newMessage,
      });
    }

    res.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error('Error sending admin message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};
