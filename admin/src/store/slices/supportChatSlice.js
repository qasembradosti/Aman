import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchAdminConversations = createAsyncThunk(
  'supportChat/fetchAdminConversations',
  async (status = 'all', { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/conversations?status=${status}`);
      const payload = response.data;

      if (payload?.success === false) {
        throw new Error(payload.message || 'Failed to load conversations');
      }

      const conversations = payload?.conversations ?? payload?.data ?? payload;

      return {
        status,
        conversations: Array.isArray(conversations) ? conversations : [],
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to load conversations'
      );
    }
  }
);

export const fetchConversationMessages = createAsyncThunk(
  'supportChat/fetchConversationMessages',
  async (conversationId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/conversation/${conversationId}/messages`);
      const payload = response.data;

      if (payload?.success === false) {
        throw new Error(payload.message || 'Failed to load messages');
      }

      const messages = payload?.messages ?? payload?.data ?? payload;

      return {
        conversationId,
        messages: Array.isArray(messages) ? messages : [],
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to load messages'
      );
    }
  }
);

export const sendAdminMessage = createAsyncThunk(
  'supportChat/sendAdminMessage',
  async ({ conversationId, message }, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/message', {
        conversation_id: conversationId,
        message,
      });
      const payload = response.data;

      if (payload?.success === false) {
        throw new Error(payload.message || 'Failed to send message');
      }

      return {
        conversationId,
        message: payload?.message ?? payload?.data ?? payload,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to send message'
      );
    }
  }
);

export const closeConversation = createAsyncThunk(
  'supportChat/closeConversation',
  async (conversationId, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/conversation/${conversationId}/close`);
      const payload = response.data;

      if (payload?.success === false) {
        throw new Error(payload.message || 'Failed to close conversation');
      }

      return { conversationId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to close conversation'
      );
    }
  }
);

const supportChatSlice = createSlice({
  name: 'supportChat',
  initialState: {
    conversations: [],
    messagesByConversationId: {},
    selectedConversationId: null,
    loadingConversations: false,
    loadingMessages: false,
    sendingMessage: false,
    error: null,
  },
  reducers: {
    setSelectedConversationId: (state, action) => {
      state.selectedConversationId = action.payload;
    },
    upsertConversation: (state, action) => {
      const conversation = action.payload;
      if (!conversation?.id) return;

      const index = state.conversations.findIndex((item) => item.id === conversation.id);
      if (index === -1) {
        state.conversations.unshift(conversation);
      } else {
        state.conversations[index] = { ...state.conversations[index], ...conversation };
      }
    },
    appendMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      if (!conversationId || !message?.id) return;

      if (!state.messagesByConversationId[conversationId]) {
        state.messagesByConversationId[conversationId] = [];
      }

      const exists = state.messagesByConversationId[conversationId].some(
        (item) => item.id === message.id
      );

      if (!exists) {
        state.messagesByConversationId[conversationId].push(message);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminConversations.pending, (state) => {
        state.loadingConversations = true;
        state.error = null;
      })
      .addCase(fetchAdminConversations.fulfilled, (state, action) => {
        state.loadingConversations = false;
        state.conversations = action.payload.conversations;
      })
      .addCase(fetchAdminConversations.rejected, (state, action) => {
        state.loadingConversations = false;
        state.error = action.payload;
      })
      .addCase(fetchConversationMessages.pending, (state) => {
        state.loadingMessages = true;
        state.error = null;
      })
      .addCase(fetchConversationMessages.fulfilled, (state, action) => {
        state.loadingMessages = false;
        state.messagesByConversationId[action.payload.conversationId] = action.payload.messages;
      })
      .addCase(fetchConversationMessages.rejected, (state, action) => {
        state.loadingMessages = false;
        state.error = action.payload;
      })
      .addCase(sendAdminMessage.pending, (state) => {
        state.sendingMessage = true;
        state.error = null;
      })
      .addCase(sendAdminMessage.fulfilled, (state, action) => {
        state.sendingMessage = false;
        const { conversationId, message } = action.payload;
        if (!conversationId || !message?.id) return;

        if (!state.messagesByConversationId[conversationId]) {
          state.messagesByConversationId[conversationId] = [];
        }

        state.messagesByConversationId[conversationId].push(message);
      })
      .addCase(sendAdminMessage.rejected, (state, action) => {
        state.sendingMessage = false;
        state.error = action.payload;
      })
      .addCase(closeConversation.fulfilled, (state, action) => {
        const { conversationId } = action.payload;
        const index = state.conversations.findIndex((item) => item.id === conversationId);
        if (index !== -1) {
          state.conversations[index] = {
            ...state.conversations[index],
            status: 'closed',
          };
        }
      })
      .addCase(closeConversation.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  setSelectedConversationId,
  upsertConversation,
  appendMessage,
} = supportChatSlice.actions;

export default supportChatSlice.reducer;
