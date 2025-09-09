import React, { useMemo, useRef, useState } from "react";
import { View, FlatList } from "react-native";
import tw from "tailwind-react-native-classnames";
import Header from "@/components/Header";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Colors from "@/constants/Colors";
import { Bell, MessageSquare, Calendar, CheckCircle } from "lucide-react-native";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string; // ISO or human-readable
  type: "consultation" | "reply" | "system";
  unread?: boolean;
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    () => [
      {
        id: "n1",
        title: "Consultation Approved",
        body: "Your consultation booking for Atty. Joaquin has been approved for Sep 20, 3:00 PM.",
        createdAt: "2h ago",
        type: "consultation",
        unread: true,
      },
      {
        id: "n2",
        title: "New Reply",
        body: "Atty. Dela Cruz replied to your post in Legal Q&A.",
        createdAt: "5h ago",
        type: "reply",
        unread: true,
      },
      {
        id: "n3",
        title: "System Update",
        body: "We added new Family Law guides to help you navigate annulment and custody.",
        createdAt: "Yesterday",
        type: "system",
        unread: false,
      },
    ]
  );

  const unreadCount = useMemo(() => notifications.filter(n => n.unread).length, [notifications]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const renderIcon = (type: NotificationItem["type"], color: string) => {
    switch (type) {
      case "consultation":
        return <Calendar size={18} color={color} strokeWidth={1.7} />;
      case "reply":
        return <MessageSquare size={18} color={color} strokeWidth={1.7} />;
      default:
        return <Bell size={18} color={color} strokeWidth={1.7} />;
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const borderColor = item.unread ? Colors.primary.blue : "#E5E7EB";
    const titleColor = item.unread ? Colors.text.head : Colors.text.head;
    const subColor = Colors.text.sub;

    return (
      <View style={[tw`bg-white rounded-xl mb-3`, { padding: 14, borderWidth: 1, borderColor }]}> 
        <HStack className="items-start">
          <View style={[tw`mr-3`, { marginTop: 2 }]}>
            {renderIcon(item.type, item.unread ? Colors.primary.blue : subColor)}
          </View>
          <View style={tw`flex-1`}>
            <GSText size="sm" bold style={{ color: titleColor }}>{item.title}</GSText>
            <GSText size="sm" className="mt-1" style={{ color: Colors.text.head }}>{item.body}</GSText>
            <HStack className="items-center mt-2">
              <GSText size="xs" style={{ color: subColor }}>{item.createdAt}</GSText>
              {item.unread && (
                <View style={[tw`ml-2`, { backgroundColor: Colors.primary.blue, height: 6, width: 6, borderRadius: 3 }]} />
              )}
            </HStack>
          </View>
          {!item.unread && (
            <CheckCircle size={16} color={subColor} strokeWidth={1.7} />
          )}
        </HStack>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={[tw`flex-1 items-center justify-center`, { paddingHorizontal: 24 }]}> 
      <Bell size={40} color={Colors.primary.blue} strokeWidth={1.5} />
      <GSText size="lg" bold className="mt-4" style={{ color: Colors.text.head }}>No Notifications Yet</GSText>
      <GSText size="sm" className="mt-2 text-center" style={{ color: Colors.text.sub }}>
        When you get updates, like consultation changes or replies to your posts, they will appear here.
      </GSText>
    </View>
  );

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Header title="Notifications" showMenu={true} />

      <Box className="px-6 pt-4 pb-2">
        <HStack className="items-center justify-between">
          <GSText size="sm" style={{ color: Colors.text.sub }}>
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </GSText>
          {unreadCount > 0 && (
            <Button size="sm" variant="link" onPress={markAllAsRead}>
              <ButtonText>Mark all as read</ButtonText>
            </Button>
          )}
        </HStack>
      </Box>

      {notifications.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Navbar activeTab="learn" />
    </View>
  );
}
