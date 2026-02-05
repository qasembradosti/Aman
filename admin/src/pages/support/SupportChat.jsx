import React, { useState, useEffect, useRef } from 'react';
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
import axios from 'axios';
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
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Setup Socket.IO connection
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
      console.log('Admin Socket.IO connected');
      // Join admin chat room to receive all new messages
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
      
      // Update conversations list to show new message
      loadConversations();
      
      // If this conversation is currently open, add message to chat
      if (selectedConversation?.id === conversation_id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    // Listen for new messages in current conversation
    socket.on('new_message', (message) => {
      console.log('New message in conversation:', message);
      if (selectedConversation?.id === message.conversation_id) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedConversation]);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 30000); // Refresh every 30s instead of 10s since we have real-time
    return () => clearInterval(interval);
  }, [statusFilter]);

  const loadConversations = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/conversations?status=${statusFilter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setConversations(response.data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${API_BASE_URL}/api/conversation/${conversationId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      setSending(true);
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/message`,
        {
          conversation_id: selectedConversation.id,
          message: messageText,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setMessages((prev) => [...prev, response.data.message]);
        loadConversations();
        toast.success('Message sent');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleEndChat = async () => {
    if (!selectedConversation) return;

    if (!window.confirm('Are you sure you want to end this chat conversation?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.patch(
        `${API_BASE_URL}/api/conversation/${selectedConversation.id}/close`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success('Chat conversation ended');
        setSelectedConversation((prev) => ({ ...prev, status: 'closed' }));
        loadConversations();
      }
    } catch (error) {
      console.error('Failed to end chat:', error);
      toast.error('Failed to end chat');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                      onClick={handleEndChat}
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
                      disabled={sending}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                    >
                      {sending ? (
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
