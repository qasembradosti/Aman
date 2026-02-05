import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeConversationId: null,
  unreadCount: 0,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveConversation: (state, action) => {
      state.activeConversationId = action.payload;
    },
    clearActiveConversation: (state) => {
      state.activeConversationId = null;
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    },
    clearUnreadCount: (state) => {
      state.unreadCount = 0;
    },
  },
});

export const {
  setActiveConversation,
  clearActiveConversation,
  setUnreadCount,
  incrementUnreadCount,
  clearUnreadCount,
} = chatSlice.actions;

export default chatSlice.reducer;
