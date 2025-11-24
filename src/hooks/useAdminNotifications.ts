import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface AdminNotification {
  id: string;
  company_id: string;
  offer_id: string | null;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  read_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useAdminNotifications = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: user.id
        })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString(), read_by: user.id }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('admin_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: user.id
        })
        .in('id', unreadIds);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: user.id
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('admin_notifications_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          console.log('New notification received:', payload);
          const newNotification = payload.new as AdminNotification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
};
