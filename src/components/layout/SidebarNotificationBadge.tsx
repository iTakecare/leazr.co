import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarNotificationBadgeProps {
  className?: string;
}

export const SidebarNotificationBadge: React.FC<SidebarNotificationBadgeProps> = ({ 
  className = '' 
}) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [companyId, setCompanyId] = useState<string>('');

  // Get company ID
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
        }
      } catch (error) {
        console.error('Error fetching company ID:', error);
      }
    };

    fetchCompanyId();
  }, [user?.id]);

  // Load initial unread count and subscribe to changes
  useEffect(() => {
    if (!companyId) return;

    const loadUnreadCount = async () => {
      try {
        // Check if company is available first
        const { data: isAvailable } = await supabase.rpc('is_company_chat_available', {
          p_company_id: companyId
        });

        // Count conversations waiting for response only if company is available
        const { count } = await supabase
          .from('chat_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'waiting');

        // Show notification only if agents are available but there are waiting conversations
        setUnreadCount(isAvailable && count ? count : 0);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnreadCount();

    // Subscribe to agent status changes to update notification
    const statusChannel = supabase
      .channel(`sidebar_agent_status_${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_agent_status',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    // Subscribe to new conversations and messages
    const conversationsChannel = supabase
      .channel(`sidebar_conversations_${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    // Also subscribe to new messages for real-time notification updates
    const messagesChannel = supabase
      .channel(`sidebar_messages_${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [companyId]);

  if (unreadCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className={`absolute -top-1 -right-1 ${className}`}
      >
        <Badge 
          className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white border-2 border-background shadow-lg"
        >
          <motion.span
            key={unreadCount}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        </Badge>
      </motion.div>
    </AnimatePresence>
  );
};