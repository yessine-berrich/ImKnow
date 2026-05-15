// hooks/useChat.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService, Conversation, ChatMessage } from '../../services/chat.service';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const useChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [authError, setAuthError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatService.getUserConversations();
      const conversationsArray = response.conversations || [];
      
      // Validate each conversation has required fields
      const validConversations = conversationsArray.filter(conv => {
        const isValid = conv && 
                        conv.conversationId && 
                        conv.otherUser && 
                        conv.otherUser.id;
        
        if (!isValid) {
          console.warn('Invalid conversation filtered out:', conv);
        }
        return isValid;
      });
      
      setConversations(validConversations);
      console.log('Loaded valid conversations:', validConversations.length);
      setAuthError(false);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      if (error.message?.includes('403') || error.message?.includes('401')) {
        setAuthError(true);
      }
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Alias for loadConversations
  const fetchConversations = useCallback(async () => {
    return await loadConversations();
  }, [loadConversations]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (
    userId: number,
    resetMessages: boolean = true,
    pageNum: number = 1
  ) => {
    try {
      setLoading(true);
      
      const validUserId = Number(userId);
      const validPage = Math.max(1, Math.floor(Math.abs(Number(pageNum))) || 1);
      
      if (isNaN(validUserId) || validUserId <= 0) {
        console.error('Invalid userId:', userId);
        return;
      }
      
      console.log(`Loading messages: userId=${validUserId}, page=${validPage}, reset=${resetMessages}`);
      
      const response = await chatService.getConversationHistory(validUserId, validPage);
      
      const newMessages = response.messages || [];
      
      if (resetMessages) {
        setMessages(newMessages);
        setPage(validPage);
      } else {
        setMessages(prev => [...newMessages, ...prev]);
        setPage(validPage);
      }
      
      const limit = 20;
      setHasMore(newMessages.length === limit);
      setTotalMessages(response.pagination?.total || 0);
      
      // Mark messages as read
      if (response.conversationId) {
        await chatService.markMessagesAsRead(response.conversationId);
        setConversations(prev => prev.map(conv => 
          conv.conversationId === response.conversationId
            ? { ...conv, unreadCount: 0 }
            : conv
        ));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (receiverId: number, content: string, parentMessageId?: number) => {
    try {
      setSending(true);
      const response = await chatService.sendMessage(receiverId, content, parentMessageId);
      const newMessage = response.message;
      
      if (newMessage) {
        setMessages(prev => [...prev, newMessage]);
        
        // Update conversation list with last message
        setConversations(prev => {
          const updated = prev.map(conv => {
            if (conv.conversationId === currentConversation?.conversationId) {
              return {
                ...conv,
                lastMessage: {
                  id: newMessage.id,
                  content: newMessage.content,
                  type: newMessage.type,
                  createdAt: newMessage.createdAt,
                  isRead: newMessage.isRead,
                  senderId: newMessage.senderId,
                },
              };
            }
            return conv;
          });
          // Move current conversation to top
          const currentConv = updated.find(c => c.conversationId === currentConversation?.conversationId);
          const others = updated.filter(c => c.conversationId !== currentConversation?.conversationId);
          return currentConv ? [currentConv, ...others] : updated;
        });
        
        scrollToBottom();
      }
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    } finally {
      setSending(false);
    }
  }, [currentConversation]);

  // Send a file
  const sendFile = useCallback(async (receiverId: number, file: File) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is 10 MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    }
    
    try {
      setSending(true);
      const response = await chatService.sendFileMessage(receiverId, file);
      const newMessage = response.message;
      
      if (newMessage) {
        setMessages(prev => [...prev, newMessage]);
        
        setConversations(prev => {
          const updated = prev.map(conv => {
            if (conv.conversationId === currentConversation?.conversationId) {
              return {
                ...conv,
                lastMessage: {
                  id: newMessage.id,
                  content: newMessage.type === 'image' ? '📷 Image' : `📎 ${newMessage.filename || 'File'}`,
                  type: newMessage.type,
                  createdAt: newMessage.createdAt,
                  isRead: newMessage.isRead,
                  senderId: newMessage.senderId,
                },
              };
            }
            return conv;
          });
          const currentConv = updated.find(c => c.conversationId === currentConversation?.conversationId);
          const others = updated.filter(c => c.conversationId !== currentConversation?.conversationId);
          return currentConv ? [currentConv, ...others] : updated;
        });
        
        scrollToBottom();
      }
      return newMessage;
    } catch (error) {
      console.error('Error sending file:', error);
      throw error;
    } finally {
      setSending(false);
    }
  }, [currentConversation]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: number) => {
    try {
      await chatService.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, []);

  // Edit a message
  const editMessage = useCallback(async (messageId: number, content: string) => {
    try {
      const response = await chatService.editMessage(messageId, content);
      const updatedMessage = response.message;
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updatedMessage } : msg
      ));
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }, []);

  // Add reaction
  const addReaction = useCallback(async (messageId: number, emoji: string) => {
    try {
      const response = await chatService.addReaction(messageId, emoji);
      const updatedMessage = response.message;
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, reactions: updatedMessage.reactions } : msg
      ));
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }, []);

  // Remove reaction
  const removeReaction = useCallback(async (messageId: number, emoji: string) => {
    try {
      const response = await chatService.removeReaction(messageId, emoji);
      const updatedMessage = response.message;
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, reactions: updatedMessage.reactions } : msg
      ));
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }, []);

  // Search messages
  const searchMessages = useCallback(async (userId: number, query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    try {
      setIsSearching(true);
      const response = await chatService.searchMessages(userId, query);
      setSearchResults(response.messages || []);
    } catch (error) {
      console.error('Error searching messages:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!currentConversation || !hasMore || loading) return;
    const nextPage = page + 1;
    await loadMessages(currentConversation.otherUser.id, false, nextPage);
  }, [currentConversation, hasMore, loading, page, loadMessages]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Select a conversation
  const selectConversation = useCallback(async (conversation: Conversation) => {
    if (!conversation || !conversation.otherUser || !conversation.otherUser.id) {
      console.error('Invalid conversation selected:', conversation);
      return;
    }
    
    const otherUserId = Number(conversation.otherUser.id);
    if (isNaN(otherUserId) || otherUserId <= 0) {
      console.error('Invalid other user ID:', conversation.otherUser.id);
      return;
    }
    
    console.log('Selecting conversation with user:', otherUserId);
    
    setCurrentConversation(conversation);
    setSearchQuery('');
    setSearchResults([]);
    await loadMessages(otherUserId, true, 1);
  }, [loadMessages]);

  // ✅ Sélectionner une conversation par userId
  const selectConversationByUserId = useCallback(async (userId: number) => {
    if (!userId || isNaN(userId) || userId <= 0) {
      console.error('Invalid user ID:', userId);
      return false;
    }

    console.log('Looking for conversation with user ID:', userId);
    
    // Attendre que les conversations soient chargées
    if (conversations.length === 0) {
      await loadConversations();
    }
    
    // Chercher la conversation dans la liste
    const existingConversation = conversations.find(
      conv => conv.otherUser?.id === userId
    );
    
    if (existingConversation) {
      await selectConversation(existingConversation);
      return true;
    }
    
    console.log('No conversation found for user:', userId);
    return false;
  }, [conversations, selectConversation, loadConversations]);

  // Get unread count for a conversation
  const getUnreadCount = useCallback(async (conversationId: string) => {
    try {
      const response = await chatService.getUnreadCount(conversationId);
      return response.unreadCount;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto-refresh conversations periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (!currentConversation && !authError) {
        loadConversations();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadConversations, currentConversation, authError]);

  // Mark messages as read when conversation changes
  useEffect(() => {
    if (currentConversation && currentConversation.conversationId) {
      const markAsRead = async () => {
        try {
          const response = await chatService.markMessagesAsRead(currentConversation.conversationId);
          if (response.markedAsRead > 0) {
            setConversations(prev => prev.map(conv => 
              conv.conversationId === currentConversation.conversationId
                ? { ...conv, unreadCount: 0 }
                : conv
            ));
          }
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      };
      markAsRead();
    }
  }, [currentConversation]);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    sending,
    hasMore,
    totalMessages,
    searchQuery,
    searchResults,
    isSearching,
    messagesEndRef,
    authError,
    loadConversations,
    fetchConversations,
    loadMessages,
    sendMessage,
    sendFile,
    deleteMessage,
    editMessage,
    addReaction,
    removeReaction,
    searchMessages,
    loadMoreMessages,
    selectConversation,
    selectConversationByUserId,
    getUnreadCount,
    setSearchQuery,
  };
};