import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Platform, ActivityIndicator } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';
import { ChatHistoryService, Conversation } from '../../services/chatHistoryService';
import { MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react-native';
import { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/modal';
import { Button, ButtonText } from '../ui/button/index';
import { Heading } from '../ui/heading';

interface ChatHistorySidebarProps {
  userId?: string;
  sessionToken?: string;
  currentConversationId: string;
  onConversationSelect: (conversationId: string) => void;
  onNewChat: () => void;
}

const SIDEBAR_WIDTH = 280;
const SIDEBAR_POSITION = 'right'; // 'left' or 'right'

export interface ChatHistorySidebarRef {
  refreshConversations: () => Promise<void>;
  addNewConversation: (conversationId: string, title: string) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
}

const ChatHistorySidebar = forwardRef<ChatHistorySidebarRef, ChatHistorySidebarProps>((
  {
    userId,
    sessionToken,
    currentConversationId,
    onConversationSelect,
    onNewChat,
  },
  ref
) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [slideAnim] = useState(
    new Animated.Value(SIDEBAR_POSITION === 'right' ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH)
  );

  // Load conversations immediately when component mounts and when userId/sessionToken change
  useEffect(() => {
    if (userId && sessionToken) {
      console.log('🔄 ChatHistorySidebar: Auto-loading conversations on mount/change');
      loadConversations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, sessionToken]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : (SIDEBAR_POSITION === 'right' ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH),
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isOpen, slideAnim]);

  const loadConversations = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const convos = await ChatHistoryService.getConversationsList(userId, false, sessionToken);
      setConversations(convos);
      console.log('✅ Loaded', convos.length, 'conversations');
    } catch (err) {
      console.error('❌ Error loading conversations:', err);
      setError('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  }, [userId, sessionToken]);

  // Expose methods to parent component (industry-standard pattern)
  useImperativeHandle(ref, () => ({
    // Full refresh (use sparingly - only when necessary)
    refreshConversations: async () => {
      console.log('🔄 Sidebar: refreshConversations called');
      await loadConversations();
    },
    
    // Optimistic update: Add new conversation to list without API call
    addNewConversation: (conversationId: string, title: string) => {
      console.log('➕ Sidebar: addNewConversation called', { conversationId, title });
      const newConversation: Conversation = {
        id: conversationId,
        title: title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        message_count: 1,
        preview: '',
        is_archived: false,
        language: 'en'
      };
      
      // Add to top of list (most recent first)
      setConversations(prev => {
        console.log('   Previous conversations count:', prev.length);
        const updated = [newConversation, ...prev];
        console.log('   New conversations count:', updated.length);
        return updated;
      });
      console.log('✅ Optimistically added conversation:', conversationId);
    },
    
    // Optimistic update: Update conversation title without API call
    updateConversationTitle: (conversationId: string, title: string) => {
      console.log('✏️ Sidebar: updateConversationTitle called', { conversationId, title });
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, title, updated_at: new Date().toISOString() }
            : conv
        )
      );
      console.log('✅ Optimistically updated title:', conversationId);
    },
  }), [loadConversations]);

  const handleNewChat = async () => {
    await onNewChat();
    // Don't reload conversations - new chat will appear when first message is sent
    // This prevents unnecessary API calls and matches ChatGPT behavior
  };

  const handleSelectConversation = (conversationId: string) => {
    onConversationSelect(conversationId);
    setIsOpen(false);
  };

  const handleDeleteConversation = async (conversationId: string, e: any) => {
    e.stopPropagation();
    
    // Show GlueStack UI confirmation modal
    setConversationToDelete(conversationId);
    setShowDeleteModal(true);
  };
  
  const confirmDelete = async () => {
    if (conversationToDelete) {
      setShowDeleteModal(false);
      await performDelete(conversationToDelete);
      setConversationToDelete(null);
    }
  };
  
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };
  
  const performDelete = async (conversationId: string) => {
    try {
      setDeletingId(conversationId);
      setError(null);
      
      // Optimistic update: Remove from UI immediately
      const previousConversations = [...conversations];
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      // Call API to delete
      const success = await ChatHistoryService.deleteConversation(conversationId, userId, sessionToken);
      
      if (!success) {
        // Rollback on failure
        setConversations(previousConversations);
        setError('Failed to delete conversation');
        return;
      }
      
      console.log('✅ Deleted conversation:', conversationId);
      
      // If deleted conversation was the current one, start a new chat
      if (conversationId === currentConversationId) {
        console.log('🔄 Deleted current conversation, starting new chat');
        await onNewChat();
      }
      
      // Reload to ensure sync with backend
      await loadConversations();
      
    } catch (err) {
      console.error('❌ Error deleting conversation:', err);
      setError('Failed to delete conversation');
      // Reload to restore correct state
      await loadConversations();
    } finally {
      setDeletingId(null);
    }
  };

  const groupConversationsByDate = () => {
    const groups: { [key: string]: Conversation[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      'Previous 30 Days': [],
      Older: [],
    };

    // Get current time in Manila timezone (UTC+8)
    const now = new Date();
    const manilaOffset = 8 * 60; // Manila is UTC+8
    const localOffset = now.getTimezoneOffset(); // Local offset in minutes (negative for ahead of UTC)
    const offsetDiff = manilaOffset + localOffset; // Difference to Manila time
    const nowManila = new Date(now.getTime() + offsetDiff * 60 * 1000);
    
    // Get start of today in Manila time
    const todayManila = new Date(nowManila.getFullYear(), nowManila.getMonth(), nowManila.getDate());

    conversations.forEach((conv) => {
      // Convert UTC timestamp to Manila time
      const dateUTC = new Date(conv.updated_at);
      const dateManila = new Date(dateUTC.getTime() + offsetDiff * 60 * 1000);
      
      // Calculate difference in days from start of today (Manila time)
      const diffTime = todayManila.getTime() - new Date(dateManila.getFullYear(), dateManila.getMonth(), dateManila.getDate()).getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        groups.Today.push(conv);
      } else if (diffDays === 1) {
        groups.Yesterday.push(conv);
      } else if (diffDays < 7) {
        groups['Previous 7 Days'].push(conv);
      } else if (diffDays < 30) {
        groups['Previous 30 Days'].push(conv);
      } else {
        groups.Older.push(conv);
      }
    });

    return groups;
  };

  const groupedConversations = groupConversationsByDate();

  return (
    <>
      {/* Toggle Button */}
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        style={[
          tw`absolute top-4 z-50 p-2 rounded-full`,
          {
            right: isOpen ? SIDEBAR_WIDTH + 8 : 8,
            backgroundColor: Colors.background.secondary,
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }
              : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }),
          },
        ]}
      >
        {isOpen ? (
          <ChevronRight size={24} color={Colors.text.primary} />
        ) : (
          <ChevronLeft size={24} color={Colors.text.primary} />
        )}
      </TouchableOpacity>

      {/* Overlay */}
      {isOpen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
          style={[
            tw`absolute inset-0 z-40`,
            { backgroundColor: 'rgba(0, 0, 0, 0.3)' },
          ]}
        />
      )}

      {/* Sidebar */}
      <Animated.View
        style={[
          tw`absolute top-0 bottom-0 z-50`,
          {
            right: 0,
            width: SIDEBAR_WIDTH,
            backgroundColor: Colors.background.primary,
            transform: [{ translateX: slideAnim }],
            ...(Platform.OS === 'web'
              ? { boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)' }
              : {
                  shadowColor: '#000',
                  shadowOffset: { width: -2, height: 0 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 5,
                }),
          },
        ]}
      >
        {/* Header */}
        <View
          style={[
            tw`px-4 py-4 border-b`,
            { borderBottomColor: Colors.border.light },
          ]}
        >
          <TouchableOpacity
            onPress={handleNewChat}
            disabled={isLoading}
            style={[
              tw`flex-row items-center justify-center py-3 px-4 rounded-lg`,
              { 
                backgroundColor: isLoading ? Colors.secondary.lightGray : Colors.primary.blue,
                opacity: isLoading ? 0.6 : 1
              },
            ]}
          >
            <Plus size={20} color="#fff" style={tw`mr-2`} />
            <Text style={tw`text-white font-semibold text-base`}>New Chat</Text>
          </TouchableOpacity>
          
          {/* Error message */}
          {error && (
            <View style={[tw`mt-3 p-2 rounded-lg flex-row items-center`, { backgroundColor: Colors.status.error + '15' }]}>
              <AlertCircle size={16} color={Colors.status.error} style={tw`mr-2`} />
              <Text style={[tw`text-xs flex-1`, { color: Colors.status.error }]}>{error}</Text>
            </View>
          )}
        </View>

        {/* Conversations List */}
        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`pb-4`}
        >
          {/* Loading skeleton - shows while loading */}
          {isLoading && conversations.length === 0 && (
            <View style={tw`mt-4`}>
              <Text
                style={[
                  tw`px-4 py-2 text-xs font-semibold`,
                  { color: Colors.text.tertiary },
                ]}
              >
                Recent
              </Text>
              {/* Skeleton items - fill entire sidebar */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((i) => (
                <View
                  key={i}
                  style={[
                    tw`px-4 py-3 mx-2 rounded-lg mb-2`,
                    { backgroundColor: Colors.secondary.lightGray, opacity: 0.5 }
                  ]}
                >
                  <View style={tw`flex-row items-center mb-1`}>
                    <View
                      style={[
                        tw`w-4 h-4 rounded mr-2`,
                        { backgroundColor: Colors.border.medium }
                      ]}
                    />
                    <View
                      style={[
                        tw`h-3 rounded flex-1`,
                        { backgroundColor: Colors.border.medium }
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
          {Object.entries(groupedConversations).map(([group, convos]) => {
            if (convos.length === 0) return null;

            return (
              <View key={group} style={tw`mt-4`}>
                <Text
                  style={[
                    tw`px-4 py-2 text-xs font-semibold`,
                    { color: Colors.text.tertiary },
                  ]}
                >
                  {group}
                </Text>
                {convos.map((conv) => (
                  <TouchableOpacity
                    key={conv.id}
                    onPress={() => handleSelectConversation(conv.id)}
                    style={[
                      tw`px-4 py-3 mx-2 rounded-lg flex-row items-center justify-between`,
                      currentConversationId === conv.id && {
                        backgroundColor: Colors.secondary.lightGray,
                      },
                    ]}
                  >
                    <View style={tw`flex-1 mr-2`}>
                      <View style={tw`flex-row items-center mb-1`}>
                        <MessageSquare
                          size={16}
                          color={Colors.text.secondary}
                          style={tw`mr-2`}
                        />
                        <Text
                          style={[
                            tw`text-sm font-medium flex-1`,
                            { color: Colors.text.primary },
                          ]}
                          numberOfLines={1}
                        >
                          {conv.title}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => handleDeleteConversation(conv.id, e)}
                      disabled={deletingId === conv.id}
                      style={[tw`p-1`, { opacity: deletingId === conv.id ? 0.5 : 1 }]}
                    >
                      {deletingId === conv.id ? (
                        <ActivityIndicator size="small" color={Colors.text.tertiary} />
                      ) : (
                        <Trash2 size={16} color={Colors.status.error} />
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}

          {!isLoading && conversations.length === 0 && (
            <View style={tw`px-4 py-8 items-center`}>
              <MessageSquare size={48} color={Colors.text.tertiary} />
              <Text
                style={[
                  tw`text-center mt-4 text-sm`,
                  { color: Colors.text.tertiary },
                ]}
              >
                No conversations yet.{'\n'}Start a new chat!
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={cancelDelete} size="md">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <View style={tw`flex-row items-center`}>
              <AlertTriangle size={24} color={Colors.status.error} style={tw`mr-2`} />
              <Heading size="lg">Delete Conversation</Heading>
            </View>
          </ModalHeader>
          <ModalBody>
            <Text style={[tw`text-base`, { color: Colors.text.primary }]}>
              This action cannot be undone. All messages in this conversation will be permanently deleted.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              action="secondary"
              onPress={cancelDelete}
              style={tw`mr-3`}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button
              action="negative"
              onPress={confirmDelete}
            >
              <ButtonText>Delete</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
});

ChatHistorySidebar.displayName = 'ChatHistorySidebar';

export default ChatHistorySidebar;
