import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { ChatMessage, ChatConversation, ChatState } from '@/types/chat'

export const useChatRealtime = (companyId: string, visitorId?: string, agentId?: string) => {
  const [state, setState] = useState<ChatState>({
    conversations: [],
    messages: {},
    currentConversation: null,
    isConnected: false,
    isLoading: false,
    error: null
  })

  const conversationChannelRef = useRef<any>(null)
  const messagesChannelRef = useRef<any>(null)

  const connect = useCallback(async (conversationId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Subscribe to conversation changes
      conversationChannelRef.current = supabase
        .channel(`conversation_${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_conversations',
            filter: `id=eq.${conversationId}`
          },
          (payload) => {
            console.log('Conversation updated:', payload)
            if (payload.eventType === 'UPDATE') {
              setState(prev => ({
                ...prev,
                currentConversation: payload.new as ChatConversation
              }))
            }
          }
        )
        .subscribe((status) => {
          console.log('Conversation subscription status:', status)
          if (status === 'SUBSCRIBED') {
            setState(prev => ({ ...prev, isConnected: true, isLoading: false }))
          }
        })

      // Subscribe to new messages
      messagesChannelRef.current = supabase
        .channel(`messages_${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            console.log('New message received:', payload)
            const newMessage = payload.new as ChatMessage
            setState(prev => ({
              ...prev,
              messages: {
                ...prev.messages,
                [conversationId]: [
                  ...(prev.messages[conversationId] || []),
                  newMessage
                ]
              }
            }))
          }
        )
        .subscribe()

      // Load existing conversation and messages
      await loadMessages(conversationId)

    } catch (error) {
      console.error('Error connecting to chat:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur lors de la connexion au chat', 
        isLoading: false 
      }))
    }
  }, [companyId, visitorId, agentId])

  const sendMessage = useCallback(async (
    conversationId: string, 
    message: string, 
    senderName: string, 
    senderType: 'visitor' | 'agent'
  ) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: senderType,
          sender_id: senderType === 'agent' ? agentId : null,
          sender_name: senderName,
          message: message,
          message_type: 'text'
        })

      if (error) {
        console.error('Error sending message:', error)
        setState(prev => ({ ...prev, error: 'Erreur lors de l\'envoi du message' }))
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      setState(prev => ({ ...prev, error: 'Erreur lors de l\'envoi du message' }))
      return false
    }
  }, [agentId])

  const createConversation = useCallback(async (visitorName: string, visitorEmail?: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }))

      const conversationId = crypto.randomUUID()
      
      const { data: conversation, error } = await supabase
        .from('chat_conversations')
        .insert({
          id: conversationId,
          company_id: companyId,
          visitor_id: visitorId,
          visitor_name: visitorName,
          visitor_email: visitorEmail,
          status: 'waiting'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating conversation:', error)
        setState(prev => ({ 
          ...prev, 
          error: 'Erreur lors de la création de la conversation',
          isLoading: false 
        }))
        return null
      }

      setState(prev => ({ 
        ...prev, 
        currentConversation: conversation,
        isLoading: false 
      }))

      // Connect to the new conversation
      await connect(conversationId)

      return conversationId
    } catch (error) {
      console.error('Error creating conversation:', error)  
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur lors de la création de la conversation',
        isLoading: false 
      }))
      return null
    }
  }, [companyId, visitorId, connect])

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [conversationId]: messages || []
        }
      }))
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (conversationChannelRef.current) {
      supabase.removeChannel(conversationChannelRef.current)
      conversationChannelRef.current = null
    }
    if (messagesChannelRef.current) {
      supabase.removeChannel(messagesChannelRef.current)
      messagesChannelRef.current = null
    }
    setState(prev => ({ ...prev, isConnected: false }))
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    createConversation,
    loadMessages,
    // For compatibility with existing useChat hook
    sendTyping: () => {}, // Not implemented in realtime version
  }
}