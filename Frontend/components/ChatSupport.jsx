import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text as RNText,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import io from "socket.io-client";
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";
import { useSelector, useDispatch } from "react-redux";
import { setActiveConversation, clearActiveConversation } from "../store/slices/chatSlice";
import { createOrGetConversation, sendMessage as sendMessageAPI } from "../services/chatService";
import { getApiBaseUrl } from "../utils/apiConfig";

const API_BASE_URL = getApiBaseUrl();

const Text = ({ style, ...props }) => {
  const { fontFamily } = useLanguage();
  return (
    <RNText
      style={[
        fontFamily?.regular ? { fontFamily: fontFamily.regular } : {},
        style,
      ]}
      {...props}
    />
  );
};

export default function ChatSupport({ visible, onClose, orderId = null }) {
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [conversationStatus, setConversationStatus] = useState("open");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const socketRef = useRef(null);

  // Socket.IO connection setup
  useEffect(() => {
    if (!visible || !token || !conversationId) return;

    // Connect to Socket.IO
    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected');
      // Join conversation room
      socket.emit('join_conversation', conversationId, (response) => {
        if (response.success) {
          console.log('Joined conversation:', conversationId);
        } else {
          console.error('Failed to join conversation:', response.error);
        }
      });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Listen for new messages
    socket.on('new_message', (newMessage) => {
      console.log('New message received:', newMessage);
      
      // Only add if it's from support (not our own message)
      if (newMessage.sender_type !== 'user') {
        const formattedMessage = {
          id: newMessage.id,
          text: newMessage.message,
          sender: 'support',
          timestamp: new Date(newMessage.created_at).toLocaleTimeString([], { 
            hour: "2-digit", 
            minute: "2-digit" 
          }),
        };
        
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, formattedMessage];
        });
        scrollToBottom();
      }
    });

    return () => {
      if (conversationId) {
        socket.emit('leave_conversation', conversationId);
      }
      socket.disconnect();
    };
  }, [visible, token, conversationId]);

  // Load conversation when chat opens
  useEffect(() => {
    if (visible && token) {
      loadConversation();
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
      setConversationId(null);
      setConversationStatus("open");
      setMessages([]);
    }
  }, [visible, orderId, token]);

  const loadConversation = async () => {
    try {
      setLoading(true);
      const data = {
        order_id: orderId || undefined,
        subject: orderId ? `Order #${orderId} Support` : 'General Support',
      };
      
      const result = await createOrGetConversation(token, data);
      
      if (result.success) {
        setConversationId(result.conversation.id);
        // Set active conversation in Redux
        dispatch(setActiveConversation(result.conversation.id));
        // Set conversation status
        setConversationStatus(result.conversation.status || "open");
        
        // Load existing messages
        if (result.messages && result.messages.length > 0) {
          const formattedMessages = result.messages.map(msg => ({
            id: msg.id,
            text: msg.message,
            sender: msg.sender_type === 'user' ? 'user' : 'support',
            timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }));
          setMessages(formattedMessages);
        } else {
          // Add welcome message if no existing messages
          const welcomeMessage = {
            id: Date.now(),
            text: orderId
              ? `${t("hello") || "Hello"} ${user?.first_name || ""}! ${t("howCanWeHelp") || "How can we help you with order"} #${orderId}?`
              : `${t("hello") || "Hello"} ${user?.first_name || ""}! ${t("howCanWeHelp") || "How can we help you today?"}`,
            sender: "support",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages([welcomeMessage]);
        }
        
        scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      Alert.alert(t("error") || "Error", error.message || "Failed to load chat");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (message.trim() && conversationId && !sending && conversationStatus !== "closed") {
      const messageText = message.trim();
      const tempId = Date.now();
      
      // Add message to UI immediately
      const userMessage = {
        id: tempId,
        text: messageText,
        sender: "user",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setMessage("");
      scrollToBottom();

      try {
        setSending(true);
        
        // Send to backend
        const result = await sendMessageAPI(token, {
          conversation_id: conversationId,
          message: messageText,
        });

        if (result.success) {
          // Update message with real ID from server
          setMessages((prev) => 
            prev.map(msg => 
              msg.id === tempId ? { ...msg, id: result.message.id } : msg
            )
          );
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        Alert.alert(t("error") || "Error", error.message || "Failed to send message");
        
        // Remove failed message from UI
        setMessages((prev) => prev.filter(msg => msg.id !== tempId));
      } finally {
        setSending(false);
      }
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleClose = () => {
    setMessages([]);
    setMessage("");
    // Clear active conversation from Redux
    dispatch(clearActiveConversation());
    onClose();
  };

  const handleStartNewChat = async () => {
    try {
      setLoading(true);
      // Create a new conversation by passing force_new flag
      const data = {
        order_id: orderId || undefined,
        subject: orderId ? `Order #${orderId} Support` : 'General Support',
        force_new: true, // Force create new conversation
      };
      
      const result = await createOrGetConversation(token, data);
      
      if (result.success) {
        setConversationId(result.conversation.id);
        dispatch(setActiveConversation(result.conversation.id));
        setConversationStatus(result.conversation.status || "open");
        
        // Add welcome message for new chat
        const welcomeMessage = {
          id: Date.now(),
          text: orderId
            ? `${t("hello") || "Hello"} ${user?.first_name || ""}! ${t("howCanWeHelp") || "How can we help you with order"} #${orderId}?`
            : `${t("hello") || "Hello"} ${user?.first_name || ""}! ${t("howCanWeHelp") || "How can we help you today?"}`,
          sender: "support",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages([welcomeMessage]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to start new chat:', error);
      Alert.alert(t("error") || "Error", error.message || "Failed to start new chat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View
          style={[
            styles.chatContainer,
            { backgroundColor: theme.colors.background, opacity: fadeAnim },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: theme.colors.primary,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", flex: 1 }}>
              <View style={styles.avatarContainer}>
                <Ionicons name="headset" size={24} color="#fff" />
              </View>
              <View style={{ marginHorizontal: 12 }}>
                <Text style={styles.headerTitle}>
                  {t("liveSupport") || "Live Support"}
                </Text>
                <View style={styles.statusContainer}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>
                    {t("online") || "Online"}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={scrollToBottom}
          >
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageWrapper,
                  {
                    alignItems: msg.sender === "user" ? (isRTL ? "flex-start" : "flex-end") : (isRTL ? "flex-end" : "flex-start"),
                  },
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    msg.sender === "user"
                      ? {
                          backgroundColor: theme.colors.primary,
                          borderBottomRightRadius: isRTL ? 16 : 4,
                          borderBottomLeftRadius: isRTL ? 4 : 16,
                        }
                      : {
                          backgroundColor: theme.colors.card,
                          borderBottomLeftRadius: isRTL ? 16 : 4,
                          borderBottomRightRadius: isRTL ? 4 : 16,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      {
                        color: msg.sender === "user" ? "#fff" : theme.colors.text,
                        textAlign: isRTL ? "right" : "left",
                      },
                    ]}
                  >
                    {msg.text}
                  </Text>
                  <Text
                    style={[
                      styles.timestamp,
                      {
                        color: msg.sender === "user" ? "rgba(255,255,255,0.7)" : theme.colors.textSecondary,
                        textAlign: isRTL ? "left" : "right",
                      },
                    ]}
                  >
                    {msg.timestamp}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Input */}
          {conversationStatus === "closed" ? (
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.card,
                  borderTopColor: theme.colors.border,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 20,
                },
              ]}
            >
              <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginBottom: 12 }}>
                {t("conversationClosed") || "This conversation has been closed"}
              </Text>
              <TouchableOpacity
                style={[
                  styles.newChatButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleStartNewChat}
                disabled={loading}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.newChatButtonText}>
                  {t("startNewChat") || "Start New Chat"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.card,
                  borderTopColor: theme.colors.border,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                placeholder={t("typeMessage") || "Type a message..."}
                placeholderTextColor={theme.colors.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: message.trim() ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={handleSend}
                disabled={!message.trim()}
              >
                <Ionicons
                  name={isRTL ? "send" : "send"}
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  chatContainer: {
    height: "80%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ade80",
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  messagesContent: {
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  newChatButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
