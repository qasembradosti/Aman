import { getApiBaseUrl } from '../utils/apiConfig';

const API_BASE_URL = getApiBaseUrl();

const parseJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Unexpected response format (${response.status})`);
  }

  return response.json();
};

// Create or get conversation
export const createOrGetConversation = async (token, data = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await parseJsonResponse(response);
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create conversation');
    }

    return result;
  } catch (error) {
    console.error('Create conversation error:', error);
    throw error;
  }
};

// Get user's conversations
export const getUserConversations = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/conversations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await parseJsonResponse(response);
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to get conversations');
    }

    return result;
  } catch (error) {
    console.error('Get conversations error:', error);
    throw error;
  }
};

// Get conversation messages
export const getConversationMessages = async (token, conversationId, params = {}) => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/api/conversation/${conversationId}/messages${queryParams ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await parseJsonResponse(response);
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to get messages');
    }

    return result;
  } catch (error) {
    console.error('Get messages error:', error);
    throw error;
  }
};

// Send message
export const sendMessage = async (token, data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await parseJsonResponse(response);
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to send message');
    }

    return result;
  } catch (error) {
    console.error('Send message error:', error);
    throw error;
  }
};

// Get unread message count
export const getUnreadCount = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/unread-count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await parseJsonResponse(response);
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to get unread count');
    }

    return result;
  } catch (error) {
    console.error('Get unread count error:', error);
    throw error;
  }
};

// Close conversation
export const closeConversation = async (token, conversationId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/conversation/${conversationId}/close`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await parseJsonResponse(response);
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to close conversation');
    }

    return result;
  } catch (error) {
    console.error('Close conversation error:', error);
    throw error;
  }
};
