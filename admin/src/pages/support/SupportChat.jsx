import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Send,
  Search,
  User,
  ShoppingBag,
  RefreshCw,
  Clock,
  MessageCircle,
  Loader2,
  XCircle,
} from 'lucide-react';
import io from 'socket.io-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  appendMessage,
  closeConversation,
  fetchAdminConversations,
  fetchConversationMessages,
  sendAdminMessage,
  setSelectedConversationId,
  upsertConversation,
} from '../../store/slices/supportChatSlice';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Helper function to format dates
const formatDate = (date) => {
  const d = new Date(date);
  const month = d.toLocaleString('en', { month: 'short' });
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${month} ${day}, ${hours}:${minutes}`;
};

const formatTime = (date) => {
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function SupportChat() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    conversations,
    messagesByConversationId,
    selectedConversationId,
    loadingConversations,
    loadingMessages,
    sendingMessage,
  } = useSelector((state) => state.supportChat);
  const [newMessage, setNewMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEndChatDialog, setShowEndChatDialog] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const selectedConversation = useMemo(
    () => conversations.find((conv) => conv.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const messages = selectedConversationId
    ? messagesByConversationId[selectedConversationId] || []
    : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Setup Socket.IO connection
  const loadConversations = useCallback(async () => {
    try {
      await dispatch(fetchAdminConversations(statusFilter)).unwrap();
    } catch (error) {
      console.error('Failed to load conversations:', error);
      const message = String(error || '').toLowerCase();
      if (message.includes('access denied')) {
        toast.error('Access denied');
        navigate('/');
      }
    }
  }, [dispatch, navigate, statusFilter]);

  const loadMessages = useCallback(
    async (conversationId) => {
      try {
        await dispatch(fetchConversationMessages(conversationId)).unwrap();
      } catch (error) {
        console.error('Failed to load messages:', error);
        toast.error('Failed to load messages');
      }
    },
    [dispatch]
  );

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    // Connect to Socket.IO server
    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_admin_chat', (response) => {
        if (response.success) {
          console.log('Joined admin chat room');
        }
      });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Listen for new user messages
    socket.on('new_user_message', ({ conversation_id, message, conversation }) => {
      console.log('New user message received:', message);
      if (conversation) {
        dispatch(upsertConversation(conversation));
      }
      if (message?.id) {
        dispatch(appendMessage({ conversationId: conversation_id, message }));
      }
      loadConversations();
    });

    // Listen for new messages in current conversation
    socket.on('new_message', (message) => {
      console.log('New message in conversation:', message);
      if (message?.id) {
        dispatch(appendMessage({ conversationId: message.conversation_id, message }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch, loadConversations]);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 30000); // Refresh every 30s instead of 10s since we have real-time
    return () => clearInterval(interval);
  }, [loadConversations, statusFilter]);

  const handleSelectConversation = (conversation) => {
    dispatch(setSelectedConversationId(conversation.id));
    loadMessages(conversation.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await dispatch(
        sendAdminMessage({
          conversationId: selectedConversation.id,
          message: messageText,
        })
      ).unwrap();
      loadConversations();
      toast.success('Message sent');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setNewMessage(messageText);
    }
  };

  const handleEndChatClick = () => {
    if (!selectedConversation) return;
    setShowEndChatDialog(true);
  };

  const handleConfirmEndChat = async () => {
    if (!selectedConversation) return;

    try {
      await dispatch(closeConversation(selectedConversation.id)).unwrap();
      toast.success('Chat conversation ended');
      loadConversations();
    } catch (error) {
      console.error('Failed to end chat:', error);
      toast.error('Failed to end chat');
    } finally {
      setShowEndChatDialog(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'closed':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadingConversations) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AlertDialog open={showEndChatDialog} onOpenChange={setShowEndChatDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end this chat conversation? This will mark the ticket as closed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEndChat} className="bg-red-600 hover:bg-red-700">
              End Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Support Chat</h1>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadConversations}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`p-4 border-b cursor-pointer transition-colors ${
                  selectedConversation?.id === conv.id
                    ? 'bg-blue-50 border-l-4 border-l-blue-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">
                        {conv.first_name} {conv.last_name}
                      </p>
                      <p className="text-xs text-gray-500">@{conv.username}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(conv.status)}`}>
                      {conv.status}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-1 truncate">{conv.subject}</p>

                {conv.order_id && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <ShoppingBag className="w-3 h-3" />
                    <span>Order #{conv.order_id}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(conv.updated_at)}</span>
                </div>
              </div>
            ))}

            {filteredConversations.length === 0 && (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No conversations found</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {selectedConversation.first_name} {selectedConversation.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">@{selectedConversation.username}</p>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full border ${getStatusColor(selectedConversation.status)}`}>
                    {selectedConversation.status}
                  </span>
                  {selectedConversation.status !== 'closed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEndChatClick}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      End Chat
                    </Button>
                  )}
                </div>
                {selectedConversation.order_id && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Related to Order #{selectedConversation.order_id}</span>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                {loadingMessages && messages.length === 0 && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  </div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender_type === 'user'
                          ? 'bg-white border border-gray-200'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender_type === 'user' ? 'text-gray-400' : 'text-blue-100'
                        }`}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t bg-white">
                {selectedConversation.status === 'closed' ? (
                  <div className="text-center py-2 text-gray-500">
                    <p className="text-sm">This conversation has been closed</p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={sendingMessage}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      {sendingMessage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
