import React, { useMemo, useState } from "react";
import { View, FlatList, Pressable } from "react-native";
import tw from "tailwind-react-native-classnames";
import Header from "@/components/Header";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button/";
import Navbar from "@/components/Navbar";
import Colors from "@/constants/Colors";
import { Bell, MessageSquare, Calendar, CheckCircle, ChevronRight, ChevronDown } from "lucide-react-native";
import DropdownMenu from "@/components/common/DropdownMenu";

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

  // Inbox filter state
  const [inboxFilter, setInboxFilter] = useState<"all" | "unread" | "read">("all");
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredNotifications = useMemo(() => {
    switch (inboxFilter) {
      case "unread":
        return notifications.filter(n => n.unread);
      case "read":
        return notifications.filter(n => !n.unread);
      default:
        return notifications;
    }
  }, [notifications, inboxFilter]);

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
    // Use a lighter blue for unread borders to soften the outline
    const borderColor = item.unread ? "#BFDBFE" : "#E5E7EB"; // unread: blue-200, read: gray-200
    const titleColor = item.unread ? Colors.text.head : Colors.text.head;
    const subColor = Colors.text.sub;

    return (
      <View style={[tw`rounded-xl mb-3`, { backgroundColor: item.unread ? '#F0F9FF' : '#FFFFFF', padding: 14, borderWidth: 1, borderColor, position: 'relative' }]}> 
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
        {/* Chevron indicator (design only) */}
        <View style={{ position: 'absolute', right: 12, bottom: 10 }}>
          <ChevronRight size={18} color={Colors.text.sub} strokeWidth={1.7} />
        </View>
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
    <View style={[tw`flex-1 bg-gray-50`, { position: "relative" }]}>
      <Header title="Notifications" showMenu={true} />

      {/* Inbox filter row */}
      <Box className="px-6 pt-4 pb-2" style={{ zIndex: menuOpen ? 100 : 1, position: "relative", elevation: menuOpen ? 12 : 0, overflow: 'visible' }}>
        <HStack className="items-center justify-between">
          <View style={{ position: "relative", flex: 1, zIndex: menuOpen ? 200 : 1 }}>
            <Pressable onPress={() => setMenuOpen(v => !v)} style={({ pressed }) => [tw`flex-row items-center`, { opacity: pressed ? 0.6 : 1 }]}>
              <GSText size="sm" bold style={{ color: Colors.text.head }}>
                {`INBOX (${inboxFilter.toUpperCase()})`}
              </GSText>
              <View style={tw`ml-1`}>
                <ChevronDown size={16} color={Colors.text.head} />
              </View>
            </Pressable>

            <DropdownMenu
              open={menuOpen}
              position={{ top: 28, left: 0 }}
              minWidth={220}
              options={([
                { key: 'all', label: 'INBOX (ALL)' },
                { key: 'unread', label: 'INBOX (UNREAD)' },
                { key: 'read', label: 'INBOX (READ)' },
              ] as const).map(opt => ({
                key: opt.key,
                label: opt.label,
                bold: inboxFilter === (opt.key as 'all'|'unread'|'read'),
                onPress: () => { setInboxFilter(opt.key as 'all'|'unread'|'read'); setMenuOpen(false); },
              }))}
            />
          </View>

          <View>
            {unreadCount > 0 && (
              <Button size="sm" variant="link" onPress={markAllAsRead}>
                <ButtonText>Mark all as read</ButtonText>
              </Button>
            )}
          </View>
        </HStack>
      </Box>

      {/* Backdrop overlay to ensure dropdown sits above list and to close on outside press */}
      {menuOpen && (
        <Pressable
          onPress={() => setMenuOpen(false)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
        />
      )}

      {filteredNotifications.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 80 }}
          style={{ zIndex: 0, elevation: 0 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Navbar activeTab="learn" />
    </View>
  );
}
