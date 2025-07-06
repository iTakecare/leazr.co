import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage, ChatConversation } from '@/types/chat';

interface SimpleChatState {
  conversationId: string | null;
  visitorInfo: { name: string; email?: string } | null;
  messages: ChatMessage[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface SimpleChatHook extends SimpleChatState {
  initializeChat: (companyId: string, visitorName: string, visitorEmail?: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
  playNotificationSound: () => void;
}

// Generate notification sound
const generateNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Web Audio API not available:', error);
  }
};

export const useSimpleChat = (): SimpleChatHook => {
  const [state, setState] = useState<SimpleChatState>({
    conversationId: null,
    visitorInfo: null,
    messages: [],
    isConnected: false,
    isLoading: false,
    error: null
  });

  const realtimeChannelRef = useRef<any>(null);
  const agentStatusChannelRef = useRef<any>(null);

  const playNotificationSound = useCallback(() => {
    generateNotificationSound();
  }, []);

  // Check if any agent is available for the company
  const checkAgentAvailability = useCallback(async (companyId: string) => {
    try {
      const { data: isAvailable, error } = await supabase.rpc('is_company_chat_available', {
        p_company_id: companyId
      });

      if (error) {
        console.error('Error checking agent availability:', error);
        return false;
      }

      return isAvailable || false;
    } catch (error) {
      console.error('Error checking agent availability:', error);
      return false;
    }
  }, []);

  // Set up agent status monitoring
  const setupAgentStatusMonitoring = useCallback((companyId: string) => {
    if (agentStatusChannelRef.current) {
      supabase.removeChannel(agentStatusChannelRef.current);
    }

    const channel = supabase
      .channel(`agent_status_${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_agent_status',
          filter: `company_id=eq.${companyId}`
        },
        async () => {
          console.log('🟢 Agent status changed, checking availability...');
          const isAvailable = await checkAgentAvailability(companyId);
          setState(prev => ({ ...prev, isConnected: isAvailable }));
        }
      )
      .subscribe();

    agentStatusChannelRef.current = channel;
  }, [checkAgentAvailability]);

  // Load messages from database
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setState(prev => ({ ...prev, messages: messages || [] }));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  // Set up realtime subscription for messages
  const setupRealtimeSubscription = useCallback((conversationId: string) => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase
      .channel(`chat_messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('📨 New message received:', payload.new);
          const newMessage = payload.new as ChatMessage;
          
          setState(prev => {
            // Avoid duplicates
            const messageExists = prev.messages.some(msg => 
              msg.id === newMessage.id || 
              (msg.message === newMessage.message && 
               msg.sender_name === newMessage.sender_name &&
               Math.abs(new Date(msg.created_at!).getTime() - new Date(newMessage.created_at!).getTime()) < 1000)
            );
            
            if (messageExists) {
              return prev;
            }

            // Play sound if message is from agent
            if (newMessage.sender_type === 'agent') {
              playNotificationSound();
            }

            return {
              ...prev,
              messages: [...prev.messages, newMessage]
            };
          });
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
  }, [playNotificationSound]);

  // Initialize chat
  const initializeChat = useCallback(async (companyId: string, visitorName: string, visitorEmail?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check agent availability
      const isAvailable = await checkAgentAvailability(companyId);
      
      // Create conversation
      const conversationId = crypto.randomUUID();
      const visitorId = crypto.randomUUID();

      const { error } = await supabase
        .from('chat_conversations')
        .insert({
          id: conversationId,
          company_id: companyId,
          visitor_id: visitorId,
          visitor_name: visitorName,
          visitor_email: visitorEmail,
          status: isAvailable ? 'waiting' : 'offline_queue'
        });

      if (error) {
        throw error;
      }

      setState(prev => ({
        ...prev,
        conversationId,
        visitorInfo: { name: visitorName, email: visitorEmail },
        isConnected: isAvailable,
        isLoading: false
      }));

      // Set up subscriptions
      setupRealtimeSubscription(conversationId);
      setupAgentStatusMonitoring(companyId);

      // Load existing messages
      await loadMessages(conversationId);

    } catch (error) {
      console.error('Error initializing chat:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur lors de l\'initialisation du chat',
        isLoading: false 
      }));
    }
  }, [checkAgentAvailability, setupRealtimeSubscription, setupAgentStatusMonitoring, loadMessages]);

  // Send message
  const sendMessage = useCallback(async (message: string) => {
    if (!state.conversationId || !state.visitorInfo) {
      setState(prev => ({ ...prev, error: 'Chat non initialisé' }));
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: state.conversationId,
          sender_type: 'visitor',
          sender_name: state.visitorInfo.name,
          message,
          message_type: 'text'
        });

      if (error) {
        throw error;
      }

      setState(prev => ({ ...prev, error: null }));
    } catch (error) {
      console.error('Error sending message:', error);
      setState(prev => ({ ...prev, error: 'Erreur lors de l\'envoi du message' }));
    }
  }, [state.conversationId, state.visitorInfo]);

  // Clear chat
  const clearChat = useCallback(() => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    if (agentStatusChannelRef.current) {
      supabase.removeChannel(agentStatusChannelRef.current);
      agentStatusChannelRef.current = null;
    }
    
    setState({
      conversationId: null,
      visitorInfo: null,
      messages: [],
      isConnected: false,
      isLoading: false,
      error: null
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
      if (agentStatusChannelRef.current) {
        supabase.removeChannel(agentStatusChannelRef.current);
      }
    };
  }, []);

  return {
    ...state,
    initializeChat,
    sendMessage,
    clearChat,
    playNotificationSound
  };
};