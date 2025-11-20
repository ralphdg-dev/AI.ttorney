import React, { useMemo, useState } from "react";
import { View, FlatList, Pressable, StatusBar, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "tailwind-react-native-classnames";
import Header from "@/components/Header";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button/";
import Navbar from "@/components/Navbar";
import { SidebarWrapper } from "@/components/AppSidebar";
import Colors from "@/constants/Colors";
import { Bell, MessageSquare, Calendar, ChevronDown, MoreVertical, Trash2, ShieldAlert, AlertTriangle } from "lucide-react-native";
import DropdownMenu from "@/components/common/DropdownMenu";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { LawyerNavbar } from "@/components/lawyer/shared";
import { useRouter } from "expo-router";
import { AuthGuard } from "@/components/AuthGuard";

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications();
  const hasFetched = React.useRef(false);
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inbox filter state
  const [inboxFilter, setInboxFilter] = useState<"all" | "unread" | "read">("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNotificationMenu, setActiveNotificationMenu] = useState<string | null>(null);

  const filteredNotifications = useMemo(() => {
    switch (inboxFilter) {
      case "unread":
        return notifications.filter(n => !n.read);
      case "read":
        return notifications.filter(n => n.read);
      default:
        return notifications;
    }
  }, [notifications, inboxFilter]);

  const renderIcon = (type: string, color: string) => {
    if (type.includes('consultation')) {
      return <Calendar size={18} color={color} strokeWidth={1.7} />;
    } else if (type.includes('reply')) {
      return <MessageSquare size={18} color={color} strokeWidth={1.7} />;
    } else if (type.includes('violation') || type.includes('warning')) {
      return <ShieldAlert size={18} color="#EF4444" strokeWidth={1.7} />;
    }
    return <Bell size={18} color={color} strokeWidth={1.7} />;
  };

  const formatViolationType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatMessage = (message: string) => {
    return message.replace(/_/g, ' ');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleDeleteNotification = async (notificationId: string) => {
    setActiveNotificationMenu(null);
    await deleteNotification(notificationId);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isUnread = !item.read;
    const borderColor = isUnread ? "#BFDBFE" : "#E5E7EB";
    const titleColor = Colors.text.head;
    const subColor = Colors.text.sub;
    const isMenuOpen = activeNotificationMenu === item.id;
    const isViolation = item.type === 'violation_warning';

    return (
      <View style={[tw`rounded-xl mb-3`, { backgroundColor: isUnread ? '#F0F9FF' : '#FFFFFF', padding: 14, borderWidth: 1, borderColor, position: 'relative', zIndex: isMenuOpen ? 100 : 1 }]}>
        <Pressable
          onPress={() => {
            if (isUnread) {
              markAsRead(item.id);
            }
            if (isViolation && item.data) {
              setSelectedViolation(item);
              setShowViolationModal(true);
              return;
            }

            // Navigate to legal article if notification represents a new article
            const isArticleNotif = item.type === 'article_published' || item.type?.includes('article');
            if (isArticleNotif) {
              const articleId = item.data?.article_id || item.data?.articleId || item.data?.id;
              if (articleId) {
                router.push(`/article/${articleId}` as any);
              }
            }
          }}
        >
          <HStack className="items-start">
            <View style={[tw`mr-3`, { marginTop: 2 }]}>
              {renderIcon(item.type, isUnread ? Colors.primary.blue : subColor)}
            </View>
            <View style={tw`flex-1`}>
              <GSText size="sm" bold style={{ color: titleColor }}>{item.title}</GSText>
              <GSText size="sm" className="mt-1" style={{ color: Colors.text.head }}>{formatMessage(item.message)}</GSText>
              <HStack className="items-center mt-2">
                <GSText size="xs" style={{ color: subColor }}>{formatTime(item.created_at)}</GSText>
                {isUnread && (
                  <View style={[tw`ml-2`, { backgroundColor: Colors.primary.blue, height: 6, width: 6, borderRadius: 3 }]} />
                )}
              </HStack>
            </View>
          </HStack>
        </Pressable>

        {/* Three-dot menu button */}
        <View style={{ position: 'absolute', right: 8, top: 8, zIndex: isMenuOpen ? 200 : 10 }}>
          <Pressable
            onPress={() => setActiveNotificationMenu(isMenuOpen ? null : item.id)}
            style={({ pressed }) => [
              tw`p-2 rounded-full`,
              { backgroundColor: pressed ? '#F3F4F6' : 'transparent' }
            ]}
          >
            <MoreVertical size={18} color={Colors.text.sub} strokeWidth={1.7} />
          </Pressable>

          {/* Dropdown menu */}
          <DropdownMenu
            open={isMenuOpen}
            position={{ top: 32, right: 0 }}
            minWidth={180}
            options={[
              {
                key: 'delete',
                label: 'Delete notification',
                icon: <Trash2 size={16} color="#EF4444" strokeWidth={1.7} />,
                textColor: '#EF4444',
                onPress: () => handleDeleteNotification(item.id),
              },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={[tw`flex-1 items-center`, { paddingHorizontal: 24, justifyContent: 'center' }]}> 
      <Bell size={48} color={Colors.primary.blue} strokeWidth={1.5} />
      <GSText size="lg" bold className="mt-4" style={{ color: Colors.text.head, textAlign: 'center' }}>No Notifications Yet</GSText>
      <GSText size="sm" className="mt-2" style={{ color: Colors.text.sub, textAlign: 'center' }}>
        When you get updates, like consultation changes or replies to your posts, they will appear here.
      </GSText>
    </View>
  );

  return (
    <AuthGuard>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
        <Header title="Notifications" showMenu={true} />

        {/* Inbox filter row */}
        <Box className="px-5 pt-6 pb-4" style={{ zIndex: menuOpen ? 100 : 1, position: "relative", elevation: menuOpen ? 12 : 0, overflow: 'visible' }}>
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

      {loading ? (
        <View style={[tw`flex-1 items-center justify-center`]}>
          <ActivityIndicator size="large" color={Colors.primary.blue} />
        </View>
      ) : filteredNotifications.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 80 }}
          style={{ zIndex: 0, elevation: 0 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {user?.role === 'verified_lawyer' ? (
        <LawyerNavbar />
      ) : (
        <Navbar />
      )}
      <SidebarWrapper />

      {/* Violation Details Modal */}
      {showViolationModal && selectedViolation && (
        <Pressable
          onPress={() => setShowViolationModal(false)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              width: '90%',
              maxWidth: 500,
              maxHeight: '80%',
            }}
          >
            <HStack className="items-center mb-4">
              <ShieldAlert size={24} color="#EF4444" strokeWidth={1.7} />
              <GSText size="lg" bold className="ml-2" style={{ color: Colors.text.head }}>
                {selectedViolation.title}
              </GSText>
            </HStack>

            <View style={{ marginBottom: 16 }}>
              <GSText size="sm" bold style={{ color: Colors.text.sub, marginBottom: 8 }}>Violation Type</GSText>
              <GSText size="sm" style={{ color: Colors.text.head }}>
                {selectedViolation.data?.violation_type ? formatViolationType(selectedViolation.data.violation_type) : 'N/A'}
              </GSText>
            </View>

            <View style={{ marginBottom: 16 }}>
              <GSText size="sm" bold style={{ color: Colors.text.sub, marginBottom: 8 }}>Action Taken</GSText>
              <GSText size="sm" style={{ color: Colors.text.head }}>
                {selectedViolation.data?.action_taken ? formatViolationType(selectedViolation.data.action_taken) : 'N/A'}
              </GSText>
            </View>

            <View style={{ marginBottom: 16 }}>
              <GSText size="sm" bold style={{ color: Colors.text.sub, marginBottom: 8 }}>Strike Count</GSText>
              <GSText size="sm" style={{ color: Colors.text.head }}>
                {selectedViolation.data?.strike_count || 0} total strikes
              </GSText>
            </View>

            <View style={{ marginBottom: 20 }}>
              <GSText size="sm" bold style={{ color: Colors.text.sub, marginBottom: 8 }}>Message</GSText>
              <GSText size="sm" style={{ color: Colors.text.head }}>
                {formatMessage(selectedViolation.message)}
              </GSText>
            </View>

            <Button
              size="md"
              onPress={() => setShowViolationModal(false)}
              style={{ backgroundColor: Colors.primary.blue }}
            >
              <ButtonText>Close</ButtonText>
            </Button>
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  </AuthGuard>
  );
}
