import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/config/supabase';
import { NetworkConfig } from '@/utils/networkConfig';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
  read_at: string | null;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const hasInitialized = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!session?.access_token || !user?.id) return;

    try {
      setLoading(true);
      const apiUrl = NetworkConfig.getApiUrl();
      const response = await fetch(`${apiUrl}/api/notifications/?limit=50`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Remove duplicates by ID before setting state
        const notificationList = (data.data || []) as Notification[];
        const uniqueNotifications = Array.from(
          new Map(notificationList.map((n: Notification) => [n.id, n])).values()
        );
        setNotifications(uniqueNotifications);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, user?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!session?.access_token) return;

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || notification.read) return;

    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const apiUrl = NetworkConfig.getApiUrl();
      await fetch(`${apiUrl}/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
      );
      setUnreadCount(prev => prev + 1);
    }
  }, [session?.access_token, notifications]);

  const markAllAsRead = useCallback(async () => {
    if (!session?.access_token || unreadCount === 0) return;

    const previousNotifications = notifications;
    const previousCount = unreadCount;

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const apiUrl = NetworkConfig.getApiUrl();
      await fetch(`${apiUrl}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      setNotifications(previousNotifications);
      setUnreadCount(previousCount);
    }
  }, [session?.access_token, notifications, unreadCount]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!session?.access_token) return;

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (!notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      const apiUrl = NetworkConfig.getApiUrl();
      await fetch(`${apiUrl}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setNotifications(prev => [notification, ...prev]);
      if (!notification.read) {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [session?.access_token, notifications]);

  useEffect(() => {
    if (!session?.access_token || !user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      hasInitialized.current = false;
      return;
    }

    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchNotifications();
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log('📬 Real-time notification event:', payload.eventType, payload.new?.id);
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            // Prevent duplicates - only add if not already in list
            setNotifications(prev => {
              const exists = prev.some(n => n.id === newNotification.id);
              if (exists) {
                console.log('⚠️ Duplicate notification prevented:', newNotification.id);
                return prev;
              }
              console.log('✅ New notification added:', newNotification.id);
              return [newNotification, ...prev];
            });
            setUnreadCount(prev => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev =>
              prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
            );
            const wasUnread = payload.old?.read === false;
            const isNowRead = payload.new?.read === true;
            if (wasUnread && isNowRead) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => {
              const deleted = prev.find(n => n.id === payload.old.id);
              if (deleted && !deleted.read) {
                setUnreadCount(count => Math.max(0, count - 1));
              }
              return prev.filter(n => n.id !== payload.old.id);
            });
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, user?.id]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
