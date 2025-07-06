import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { ChatMessage, ChatConversation, WebSocketMessage, ChatState } from '@/types/chat'
import { useChatRealtime } from './useChatRealtime'

export const useChat = (companyId: string, visitorId?: string, agentId?: string) => {
  // Try WebSocket first, fallback to Realtime
  const realtimeChat = useChatRealtime(companyId, visitorId, agentId)
  const [useRealtime, setUseRealtime] = useState(false)
  const [state, setState] = useState<ChatState>({
    conversations: [],
    messages: {},
    currentConversation: null,
    isConnected: false,
    isLoading: false,
    error: null
  })
  const [visitorInfo, setVisitorInfo] = useState<{name?: string, email?: string}>({})

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const connect = useCallback((conversationId: string, visitorName?: string, visitorEmail?: string) => {
    // If already using realtime, delegate to it
    if (useRealtime) {
      return realtimeChat.connect(conversationId)
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const wsUrl = `wss://cifbetjefyfocafanlhv.functions.supabase.co/live-chat`
      console.log('Tentative de connexion WebSocket vers:', wsUrl)
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        setState(prev => ({ ...prev, isConnected: true, isLoading: false }))
        
        // Rejoindre la conversation
        wsRef.current?.send(JSON.stringify({
          type: 'join',
          conversationId,
          companyId,
          visitorId,
          visitorName: visitorName || visitorInfo.name,
          visitorEmail: visitorEmail || visitorInfo.email,
          agentId
        }))
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected')
        setState(prev => ({ ...prev, isConnected: false }))
        
        // Tentative de reconnexion après 3 secondes
        reconnectTimeoutRef.current = setTimeout(() => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) {
            connect(conversationId, visitorName, visitorEmail)
          }
        }, 3000)
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        console.error('WebSocket readyState:', wsRef.current?.readyState)
        console.warn('WebSocket failed, falling back to Supabase Realtime')
        
        // Fallback to Realtime
        setUseRealtime(true)
        setState(prev => ({ ...prev, error: null, isLoading: false }))
        realtimeChat.connect(conversationId)
      }

    } catch (error) {
      console.error('Error connecting to WebSocket:', error)
      console.warn('WebSocket failed, falling back to Supabase Realtime')
      
      // Fallback to Realtime
      setUseRealtime(true)
      setState(prev => ({ ...prev, error: null, isLoading: false }))
      realtimeChat.connect(conversationId)
    }
  }, [companyId, visitorId, agentId, visitorInfo])

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'joined':
        console.log('Successfully joined conversation:', data.conversationId)
        break

      case 'message':
        if (data.conversationId && data.message) {
          const newMessage: ChatMessage = {
            id: data.messageId,
            conversation_id: data.conversationId,
            sender_type: data.senderType!,
            sender_name: data.senderName!,
            message: data.message,
            message_type: 'text',
            created_at: data.timestamp
          }

          setState(prev => ({
            ...prev,
            messages: {
              ...prev.messages,
              [data.conversationId!]: [
                ...(prev.messages[data.conversationId!] || []),
                newMessage
              ]
            }
          }))
        }
        break

      case 'typing':
        // Gérer l'indicateur de frappe
        console.log(`${data.senderName} is typing...`)
        break

      case 'error':
        setState(prev => ({ ...prev, error: data.message || 'Erreur inconnue' }))
        break
    }
  }

  const sendMessage = useCallback((conversationId: string, message: string, senderName: string, senderType: 'visitor' | 'agent') => {
    // If using realtime, delegate to it
    if (useRealtime) {
      return realtimeChat.sendMessage(conversationId, message, senderName, senderType)
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setState(prev => ({ ...prev, error: 'Connexion non établie' }))
      return
    }

    wsRef.current.send(JSON.stringify({
      type: 'message',
      conversationId,
      message,
      senderName,
      senderType,
      agentId: senderType === 'agent' ? agentId : undefined
    }))
  }, [agentId, useRealtime, realtimeChat])

  const sendTyping = useCallback((conversationId: string, senderName: string, senderType: 'visitor' | 'agent') => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    wsRef.current.send(JSON.stringify({
      type: 'typing',
      conversationId,
      senderName,
      senderType
    }))
  }, [])

  const createConversation = useCallback(async (visitorName: string, visitorEmail?: string) => {
    // Store visitor info for future use
    setVisitorInfo({ name: visitorName, email: visitorEmail })
    
    // If using realtime, delegate to it
    if (useRealtime) {
      return realtimeChat.createConversation(visitorName, visitorEmail)
    }

    try {
      const conversationId = crypto.randomUUID()
      
      setState(prev => ({ ...prev, isLoading: true }))
      
      // Connect to WebSocket with visitor info
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'join',
          conversationId,
          companyId,
          visitorId,
          visitorName,
          visitorEmail,
          agentId
        }))
      } else {
        connect(conversationId, visitorName, visitorEmail)
      }

      return conversationId
    } catch (error) {
      console.error('Error creating conversation:', error)
      setState(prev => ({ ...prev, error: 'Erreur lors de la création de la conversation' }))
      return null
    }
  }, [connect, useRealtime, realtimeChat, companyId, visitorId, agentId])

  const loadMessages = useCallback(async (conversationId: string) => {
    // If using realtime, delegate to it
    if (useRealtime) {
      return realtimeChat.loadMessages(conversationId)
    }

    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

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
  }, [useRealtime, realtimeChat])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setState(prev => ({ ...prev, isConnected: false }))
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // Return realtime chat if using fallback, otherwise WebSocket chat
  if (useRealtime) {
    return realtimeChat
  }

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    sendTyping,
    createConversation,
    loadMessages
  }
}