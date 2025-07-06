import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';

interface PersistentChatState {
  conversationId: string | null;
  visitorInfo: { name: string; email?: string } | null;
  messages: ChatMessage[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface PersistentChatHook extends PersistentChatState {
  initializeChat: (companyId: string, visitorName: string, visitorEmail?: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  reconnect: () => Promise<void>;
  clearChat: () => void;
  playNotificationSound: () => void;
}

const STORAGE_KEY = 'public_chat_session';
// Generate a simple beep sound using Web Audio API
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

export const usePersistentChat = (): PersistentChatHook => {
  const [state, setState] = useState<PersistentChatState>({
    conversationId: null,
    visitorInfo: null,
    messages: [],
    isConnected: false,
    isLoading: false,
    error: null
  });

  const [wsRef, setWsRef] = useState<WebSocket | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);

  // Load persisted state on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setState(prev => ({
          ...prev,
          conversationId: parsed.conversationId,
          visitorInfo: parsed.visitorInfo,
          messages: parsed.messages || []
        }));
        
        // If we have a conversation, load fresh messages
        if (parsed.conversationId) {
          loadMessages(parsed.conversationId);
        }
      } catch (error) {
        console.error('Error loading chat state:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (state.conversationId && state.visitorInfo) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        conversationId: state.conversationId,
        visitorInfo: state.visitorInfo,
        messages: state.messages
      }));
    }
  }, [state.conversationId, state.visitorInfo, state.messages]);

  const playNotificationSound = useCallback(() => {
    generateNotificationSound();
  }, []);

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
      
      // Set up realtime subscription
      setupRealtimeSubscription(conversationId);
      
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  const setupRealtimeSubscription = useCallback((conversationId: string) => {
    // Clean up existing subscription
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
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
          console.log('📨 New message from Realtime:', payload.new);
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

            // Play notification if message is from agent
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

    setRealtimeChannel(channel);
  }, [realtimeChannel, playNotificationSound]);

  const connectWebSocket = useCallback((conversationId: string, companyId: string, visitorId: string) => {
    if (wsRef?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = `wss://cifbetjefyfocafanlhv.functions.supabase.co/webrtc-signaling`;
      console.log('🔗 Connecting to WebRTC signaling server:', wsUrl);
      
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebRTC signaling connected successfully');
        setState(prev => ({ ...prev, isConnected: true, error: null }));
        
        // Join conversation
        ws.send(JSON.stringify({
          type: 'join',
          conversationId,
          companyId,
          visitorId,
          data: {
            visitorName: state.visitorInfo?.name,
            visitorEmail: state.visitorInfo?.email
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message' && data.conversationId && data.message) {
            const newMessage: ChatMessage = {
              id: data.messageId || crypto.randomUUID(),
              conversation_id: data.conversationId,
              sender_type: data.senderType,
              sender_name: data.senderName,
              message: data.message,
              message_type: 'text',
              created_at: data.timestamp || new Date().toISOString()
            };

            setState(prev => {
              const messageExists = prev.messages.some(msg => 
                msg.id === newMessage.id || 
                (msg.message === newMessage.message && 
                 msg.sender_name === newMessage.sender_name &&
                 Math.abs(new Date(msg.created_at!).getTime() - new Date(newMessage.created_at!).getTime()) < 1000)
              );
              
              if (messageExists) {
                return prev;
              }

              // Play notification if message is from agent
              if (newMessage.sender_type === 'agent') {
                playNotificationSound();
              }

              return {
                ...prev,
                messages: [...prev.messages, newMessage]
              };
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('❌ WebRTC signaling disconnected');
        setState(prev => ({ ...prev, isConnected: false }));
        
        // Auto-reconnect after 3 seconds
        setTimeout(() => {
          if (state.conversationId) {
            connectWebSocket(state.conversationId, companyId, visitorId);
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('🚨 WebRTC signaling error:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Erreur de connexion au chat',
          isConnected: false
        }));
      };

      setWsRef(ws);
    } catch (error) {
      console.error('Error connecting to WebRTC signaling:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Impossible de se connecter au chat'
      }));
    }
  }, [wsRef, state.visitorInfo, state.conversationId, playNotificationSound]);

const initializeChat = useCallback(async (companyId: string, visitorName: string, visitorEmail?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // First check if company is available for chat
      const { data: isAvailable, error: availabilityError } = await supabase.rpc('is_company_chat_available', {
        p_company_id: companyId
      });

      if (availabilityError) {
        console.error('Error checking availability:', availabilityError);
      }

      let conversationId = state.conversationId;
      
      // Check if we already have a conversation for this visitor
      if (!conversationId) {
        const visitorId = crypto.randomUUID();
        conversationId = crypto.randomUUID();
        
        // Create conversation in database
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
          isConnected: isAvailable || false
        }));

        // Connect to WebSocket if available
        if (isAvailable) {
          connectWebSocket(conversationId, companyId, visitorId);
        }
        
        // Load messages
        await loadMessages(conversationId);
      } else {
        // Reconnect to existing conversation
        const visitorId = crypto.randomUUID(); // This should ideally be persisted too
        if (isAvailable) {
          connectWebSocket(conversationId, companyId, visitorId);
        }
      }

      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error initializing chat:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur lors de l\'initialisation du chat',
        isLoading: false 
      }));
    }
  }, [state.conversationId, connectWebSocket, loadMessages]);

  const sendMessage = useCallback(async (message: string) => {
    if (!state.conversationId || !state.visitorInfo) {
      setState(prev => ({ ...prev, error: 'Chat non initialisé' }));
      return;
    }

    try {
      // Try WebSocket first
      if (wsRef && wsRef.readyState === WebSocket.OPEN) {
        wsRef.send(JSON.stringify({
          type: 'message',
          conversationId: state.conversationId,
          message,
          senderName: state.visitorInfo.name,
          senderType: 'visitor'
        }));
      } else {
        // Fallback: Save directly to database
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
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setState(prev => ({ ...prev, error: 'Erreur lors de l\'envoi du message' }));
    }
  }, [state.conversationId, state.visitorInfo, wsRef]);

  const reconnect = useCallback(async () => {
    if (state.conversationId && state.visitorInfo) {
      // This would need the company ID and visitor ID to be persisted too
      // For now, just reload messages
      await loadMessages(state.conversationId);
    }
  }, [state.conversationId, state.visitorInfo, loadMessages]);

  const clearChat = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    if (wsRef) {
      wsRef.close();
      setWsRef(null);
    }
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      setRealtimeChannel(null);
    }
    setState({
      conversationId: null,
      visitorInfo: null,
      messages: [],
      isConnected: false,
      isLoading: false,
      error: null
    });
  }, [wsRef, realtimeChannel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef) {
        wsRef.close();
      }
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [wsRef, realtimeChannel]);

  return {
    ...state,
    initializeChat,
    sendMessage,
    reconnect,
    clearChat,
    playNotificationSound
  };
};