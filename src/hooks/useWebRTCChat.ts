import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, ChatConversation, ChatState } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';

interface WebRTCChatHook {
  messages: Record<string, ChatMessage[]>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connect: (conversationId: string, visitorName?: string, visitorEmail?: string) => void;
  disconnect: () => void;
  sendMessage: (conversationId: string, message: string, senderName: string, senderType: 'visitor' | 'agent') => void;
  sendTyping: (conversationId: string, senderName: string, senderType: 'visitor' | 'agent') => void;
  createConversation: (visitorName: string, visitorEmail?: string) => Promise<string | null>;
  loadMessages: (conversationId: string) => Promise<void>;
  onNotification?: (notification: any) => void;
}

export const useWebRTCChat = (
  companyId: string, 
  visitorId?: string, 
  agentId?: string
): WebRTCChatHook => {
  const [state, setState] = useState<ChatState>({
    conversations: [],
    messages: {},
    currentConversation: null,
    isConnected: false,
    isLoading: false,
    error: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [visitorInfo, setVisitorInfo] = useState<{name?: string, email?: string}>({});
  const [onNotificationCallback, setOnNotificationCallback] = useState<((notification: any) => void) | undefined>();

  const connect = useCallback((conversationId: string, visitorName?: string, visitorEmail?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use the new WebRTC signaling server
      const wsUrl = `wss://cifbetjefyfocafanlhv.functions.supabase.co/webrtc-signaling`;
      console.log('Connecting to WebRTC signaling server:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebRTC signaling connected');
        setState(prev => ({ ...prev, isConnected: true, isLoading: false }));
        
        // Join conversation
        wsRef.current?.send(JSON.stringify({
          type: 'join',
          conversationId,
          companyId,
          visitorId,
          agentId,
          data: {
            visitorName: visitorName || visitorInfo.name,
            visitorEmail: visitorEmail || visitorInfo.email
          }
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebRTC signaling disconnected');
        setState(prev => ({ ...prev, isConnected: false }));
        
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) {
            connect(conversationId, visitorName, visitorEmail);
          }
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebRTC signaling error:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Erreur de connexion au chat',
          isLoading: false,
          isConnected: false
        }));
      };

    } catch (error) {
      console.error('Error connecting to WebRTC signaling:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Impossible de se connecter au chat',
        isLoading: false 
      }));
    }
  }, [companyId, visitorId, agentId, visitorInfo]);

  const handleMessage = (data: any) => {
    switch (data.type) {
      case 'joined':
        console.log('Successfully joined conversation:', data.conversationId);
        break;

      case 'message':
        if (data.conversationId && data.message) {
          const newMessage: ChatMessage = {
            id: data.messageId,
            conversation_id: data.conversationId,
            sender_type: data.senderType,
            sender_name: data.senderName,
            message: data.message,
            message_type: 'text',
            created_at: data.timestamp
          };

          setState(prev => ({
            ...prev,
            messages: {
              ...prev.messages,
              [data.conversationId]: [
                ...(prev.messages[data.conversationId] || []),
                newMessage
              ]
            }
          }));
        }
        break;

      case 'typing':
        // Handle typing indicator
        console.log(`${data.senderName} is typing...`);
        break;

      case 'notification':
        // Handle admin notifications
        if (onNotificationCallback && data.notification) {
          onNotificationCallback(data.notification);
        }
        break;

      case 'new-visitor':
      case 'new-message':
        // Handle admin notifications for new visitors/messages
        if (onNotificationCallback) {
          onNotificationCallback(data);
        }
        break;

      case 'error':
        setState(prev => ({ ...prev, error: data.message || 'Erreur inconnue' }));
        break;
    }
  };

  const sendMessage = useCallback((conversationId: string, message: string, senderName: string, senderType: 'visitor' | 'agent') => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setState(prev => ({ ...prev, error: 'Connexion non établie' }));
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'message',
      conversationId,
      message,
      senderName,
      senderType,
      agentId: senderType === 'agent' ? agentId : undefined
    }));
  }, [agentId]);

  const sendTyping = useCallback((conversationId: string, senderName: string, senderType: 'visitor' | 'agent') => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: 'typing',
      conversationId,
      senderName,
      senderType
    }));
  }, []);

  const createConversation = useCallback(async (visitorName: string, visitorEmail?: string) => {
    setVisitorInfo({ name: visitorName, email: visitorEmail });
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const conversationId = crypto.randomUUID();
      
      // Create conversation in database
      const { error } = await supabase
        .from('chat_conversations')
        .insert({
          id: conversationId,
          company_id: companyId,
          visitor_id: visitorId,
          visitor_name: visitorName,
          visitor_email: visitorEmail,
          status: 'waiting'
        });

      if (error) {
        console.error('Error creating conversation:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Erreur lors de la création de la conversation',
          isLoading: false 
        }));
        return null;
      }

      // Connect to the conversation
      connect(conversationId, visitorName, visitorEmail);
      
      return conversationId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur lors de la création de la conversation',
        isLoading: false 
      }));
      return null;
    }
  }, [companyId, visitorId, connect]);

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

      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [conversationId]: messages || []
        }
      }));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    messages: state.messages,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    connect,
    disconnect,
    sendMessage,
    sendTyping,
    createConversation,
    loadMessages,
    onNotification: setOnNotificationCallback
  };
};