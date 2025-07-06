import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatMessage {
  type: 'message' | 'join' | 'leave' | 'agent-status' | 'typing'
  conversationId?: string
  companyId?: string
  visitorId?: string
  agentId?: string
  message?: string
  senderName?: string
  senderType?: 'visitor' | 'agent' | 'system'
  data?: any
}

// Map pour stocker les connexions WebSocket
const connections = new Map<string, WebSocket>()
const conversationConnections = new Map<string, Set<string>>()

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { headers } = req
  const upgradeHeader = headers.get('upgrade') || ''

  if (upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket connection', { 
      status: 400,
      headers: corsHeaders 
    })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)
  
  // Initialiser le client Supabase
  const supabase = createClient(
    'https://cifbetjefyfocafanlhv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NzgzODIsImV4cCI6MjA1NzQ1NDM4Mn0.B1-2XP0VVByxEq43KzoGml8W6z_XVtsh542BuiDm3Cw'
  )

  let connectionId = crypto.randomUUID()
  let currentConversationId: string | null = null
  let currentCompanyId: string | null = null

  socket.onopen = () => {
    console.log(`WebSocket connection opened: ${connectionId}`)
    connections.set(connectionId, socket)
  }

  socket.onmessage = async (event) => {
    try {
      const data: ChatMessage = JSON.parse(event.data)
      console.log('Received message:', data)

      switch (data.type) {
        case 'join':
          await handleJoin(data)
          break
        case 'message':
          await handleMessage(data)
          break
        case 'typing':
          await handleTyping(data)
          break
        case 'agent-status':
          await handleAgentStatus(data)
          break
      }
    } catch (error) {
      console.error('Error handling message:', error)
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Erreur lors du traitement du message'
      }))
    }
  }

  socket.onclose = () => {
    console.log(`WebSocket connection closed: ${connectionId}`)
    cleanup()
  }

  socket.onerror = (error) => {
    console.error(`WebSocket error: ${error}`)
    cleanup()
  }

  function cleanup() {
    connections.delete(connectionId)
    if (currentConversationId) {
      const conversationConnections_set = conversationConnections.get(currentConversationId)
      if (conversationConnections_set) {
        conversationConnections_set.delete(connectionId)
        if (conversationConnections_set.size === 0) {
          conversationConnections.delete(currentConversationId)
        }
      }
    }
  }

  async function handleJoin(data: ChatMessage) {
    try {
      const { conversationId, companyId, visitorId, agentId } = data

      if (!conversationId || !companyId) {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'conversationId et companyId requis'
        }))
        return
      }

      currentConversationId = conversationId
      currentCompanyId = companyId

      // Ajouter la connexion à la conversation
      if (!conversationConnections.has(conversationId)) {
        conversationConnections.set(conversationId, new Set())
      }
      conversationConnections.get(conversationId)!.add(connectionId)

      // Vérifier si la conversation existe, sinon la créer
      const { data: conversation } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (!conversation) {
        // Créer une nouvelle conversation
        const { error } = await supabase
          .from('chat_conversations')
          .insert({
            id: conversationId,
            company_id: companyId,
            visitor_id: visitorId,
            status: 'waiting'
          })

        if (error) {
          console.error('Error creating conversation:', error)
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Erreur lors de la création de la conversation'
          }))
          return
        }
      }

      // Confirmer la connexion
      socket.send(JSON.stringify({
        type: 'joined',
        conversationId,
        message: 'Connexion établie'
      }))

      console.log(`Client ${connectionId} joined conversation ${conversationId}`)

    } catch (error) {
      console.error('Error in handleJoin:', error)
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Erreur lors de la connexion'
      }))
    }
  }

  async function handleMessage(data: ChatMessage) {
    try {
      const { conversationId, message, senderName, senderType, agentId } = data

      if (!conversationId || !message || !senderName || !senderType) {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Données manquantes pour le message'
        }))
        return
      }

      // Sauvegarder le message en base
      const { data: savedMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: senderType,
          sender_id: agentId || null,
          sender_name: senderName,
          message,
          message_type: 'text'
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving message:', error)
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Erreur lors de la sauvegarde du message'
        }))
        return
      }

      // Diffuser le message à tous les participants de la conversation
      const messageToSend = {
        type: 'message',
        conversationId,
        messageId: savedMessage.id,
        message,
        senderName,
        senderType,
        timestamp: savedMessage.created_at
      }

      broadcastToConversation(conversationId, messageToSend)

      console.log(`Message sent to conversation ${conversationId}`)

    } catch (error) {
      console.error('Error in handleMessage:', error)
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Erreur lors de l\'envoi du message'
      }))
    }
  }

  async function handleTyping(data: ChatMessage) {
    const { conversationId, senderName, senderType } = data

    if (!conversationId) return

    // Diffuser l'indicateur de frappe aux autres participants
    broadcastToConversation(conversationId, {
      type: 'typing',
      conversationId,
      senderName,
      senderType
    }, connectionId) // Exclure l'expéditeur
  }

  async function handleAgentStatus(data: ChatMessage) {
    try {
      const { companyId, agentId, data: statusData } = data

      if (!companyId || !agentId) return

      // Mettre à jour le statut de l'agent
      const { error } = await supabase
        .from('chat_agent_status')
        .upsert({
          agent_id: agentId,
          company_id: companyId,
          is_online: statusData?.isOnline || false,
          is_available: statusData?.isAvailable || false,
          last_seen_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating agent status:', error)
      }

    } catch (error) {
      console.error('Error in handleAgentStatus:', error)
    }
  }

  function broadcastToConversation(conversationId: string, message: any, excludeConnectionId?: string) {
    const connectionIds = conversationConnections.get(conversationId)
    if (!connectionIds) return

    connectionIds.forEach(connId => {
      if (excludeConnectionId && connId === excludeConnectionId) return
      
      const connection = connections.get(connId)
      if (connection && connection.readyState === WebSocket.OPEN) {
        try {
          connection.send(JSON.stringify(message))
        } catch (error) {
          console.error(`Error sending message to connection ${connId}:`, error)
        }
      }
    })
  }

  return response
})