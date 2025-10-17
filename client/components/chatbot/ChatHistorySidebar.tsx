import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Platform } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';
import { ChatHistoryService, Conversation } from '../../services/chatHistoryService';
import { MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface ChatHistorySidebarProps {
  userId?: string;
  currentConversationId: string;
  onConversationSelect: (conversationId: string) => void;
  onNewChat: () => void;
}

const SIDEBAR_WIDTH = 280;
const SIDEBAR_POSITION = 'right'; // 'left' or 'right'

export default function ChatHistorySidebar({
  userId,
  currentConversationId,
  onConversationSelect,
  onNewChat,
}: ChatHistorySidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [slideAnim] = useState(
    new Animated.Value(SIDEBAR_POSITION === 'right' ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH)
  );

  useEffect(() => {
    loadConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : (SIDEBAR_POSITION === 'right' ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH),
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isOpen, slideAnim]);

  const loadConversations = async () => {
    const convos = await ChatHistoryService.getConversationsList(userId);
    setConversations(convos);
  };

  const handleNewChat = async () => {
    await onNewChat();
    await loadConversations();
  };

  const handleSelectConversation = (conversationId: string) => {
    onConversationSelect(conversationId);
    setIsOpen(false);
  };

  const handleDeleteConversation = async (conversationId: string, e: any) => {
    e.stopPropagation();
    await ChatHistoryService.deleteConversation(conversationId, userId);
    await loadConversations();
  };

  const groupConversationsByDate = () => {
    const groups: { [key: string]: Conversation[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      'Previous 30 Days': [],
      Older: [],
    };

    const now = new Date();
    conversations.forEach((conv) => {
      const date = new Date(conv.updated_at);
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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
            style={[
              tw`flex-row items-center justify-center py-3 px-4 rounded-lg`,
              { backgroundColor: Colors.primary.blue },
            ]}
          >
            <Plus size={20} color="#fff" style={tw`mr-2`} />
            <Text style={tw`text-white font-semibold text-base`}>New Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Conversations List */}
        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`pb-4`}
        >
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
                      {conv.preview && (
                        <Text
                          style={[
                            tw`text-xs ml-6`,
                            { color: Colors.text.tertiary },
                          ]}
                          numberOfLines={1}
                        >
                          {conv.preview}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={(e) => handleDeleteConversation(conv.id, e)}
                      style={tw`p-1`}
                    >
                      <Trash2 size={16} color={Colors.text.tertiary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}

          {conversations.length === 0 && (
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
    </>
  );
}
