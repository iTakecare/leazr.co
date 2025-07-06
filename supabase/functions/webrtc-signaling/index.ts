import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'message' | 'typing' | 'agent-status';
  conversationId?: string;
  companyId?: string;
  visitorId?: string;
  agentId?: string;
  data?: any;
  message?: string;
  senderName?: string;
  senderType?: 'visitor' | 'agent';
}

// Store active connections
const connections = new Map<string, WebSocket>();
const conversationParticipants = new Map<string, Set<string>>();
const agentsByCompany = new Map<string, Set<string>>();

serve(async (req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  let clientId: string | null = null;
  let currentConversationId: string | null = null;
  let companyId: string | null = null;
  let isAgent = false;

  socket.onopen = () => {
    console.log("WebSocket connection opened");
  };

  socket.onmessage = async (event) => {
    try {
      const message: SignalingMessage = JSON.parse(event.data);
      console.log("Received message:", message);

      switch (message.type) {
        case 'join':
          clientId = message.agentId || message.visitorId || crypto.randomUUID();
          currentConversationId = message.conversationId;
          companyId = message.companyId;
          isAgent = !!message.agentId;

          // Store connection
          connections.set(clientId, socket);

          // Track conversation participants
          if (currentConversationId) {
            if (!conversationParticipants.has(currentConversationId)) {
              conversationParticipants.set(currentConversationId, new Set());
            }
            conversationParticipants.get(currentConversationId)!.add(clientId);
          }

          // Track agents by company
          if (isAgent && companyId) {
            if (!agentsByCompany.has(companyId)) {
              agentsByCompany.set(companyId, new Set());
            }
            agentsByCompany.get(companyId)!.add(clientId);
          }

          // Notify agents of new visitor (if visitor joined)
          if (!isAgent && currentConversationId && companyId) {
            notifyAgents(companyId, {
              type: 'new-visitor',
              conversationId: currentConversationId,
              visitorName: message.data?.visitorName,
              visitorEmail: message.data?.visitorEmail,
              timestamp: new Date().toISOString()
            });
          }

          // Send confirmation
          socket.send(JSON.stringify({
            type: 'joined',
            conversationId: currentConversationId,
            clientId
          }));
          break;

        case 'message':
          if (currentConversationId && message.message) {
            // Save to database
            await saveMessage({
              conversation_id: currentConversationId,
              sender_type: message.senderType!,
              sender_id: message.senderType === 'agent' ? message.agentId : null,
              sender_name: message.senderName!,
              message: message.message,
              message_type: 'text'
            });

            // Broadcast to conversation participants
            broadcastToConversation(currentConversationId, {
              type: 'message',
              conversationId: currentConversationId,
              message: message.message,
              senderName: message.senderName,
              senderType: message.senderType,
              messageId: crypto.randomUUID(),
              timestamp: new Date().toISOString()
            }, clientId);

            // Notify agents if message from visitor
            if (message.senderType === 'visitor' && companyId) {
              notifyAgents(companyId, {
                type: 'new-message',
                conversationId: currentConversationId,
                message: message.message,
                senderName: message.senderName,
                timestamp: new Date().toISOString()
              });
            }
          }
          break;

        case 'typing':
          if (currentConversationId) {
            broadcastToConversation(currentConversationId, {
              type: 'typing',
              conversationId: currentConversationId,
              senderName: message.senderName,
              senderType: message.senderType
            }, clientId);
          }
          break;

        case 'agent-status':
          if (isAgent && companyId) {
            // Broadcast agent status to company
            broadcastToCompany(companyId, {
              type: 'agent-status-update',
              agentId: clientId,
              status: message.data?.status,
              timestamp: new Date().toISOString()
            });
          }
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // WebRTC signaling
          if (currentConversationId && message.data?.targetId) {
            const targetSocket = connections.get(message.data.targetId);
            if (targetSocket) {
              targetSocket.send(JSON.stringify({
                type: message.type,
                conversationId: currentConversationId,
                senderId: clientId,
                data: message.data
              }));
            }
          }
          break;
      }
    } catch (error) {
      console.error("Error processing message:", error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Erreur lors du traitement du message'
      }));
    }
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
    cleanup();
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    cleanup();
  };

  function cleanup() {
    if (clientId) {
      connections.delete(clientId);
      
      // Remove from conversation participants
      if (currentConversationId) {
        conversationParticipants.get(currentConversationId)?.delete(clientId);
        if (conversationParticipants.get(currentConversationId)?.size === 0) {
          conversationParticipants.delete(currentConversationId);
        }
      }

      // Remove from company agents
      if (isAgent && companyId) {
        agentsByCompany.get(companyId)?.delete(clientId);
        if (agentsByCompany.get(companyId)?.size === 0) {
          agentsByCompany.delete(companyId);
        }
      }
    }
  }

  function broadcastToConversation(conversationId: string, message: any, excludeId?: string) {
    const participants = conversationParticipants.get(conversationId);
    if (participants) {
      participants.forEach(participantId => {
        if (participantId !== excludeId) {
          const socket = connections.get(participantId);
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
          }
        }
      });
    }
  }

  function broadcastToCompany(companyId: string, message: any) {
    const agents = agentsByCompany.get(companyId);
    if (agents) {
      agents.forEach(agentId => {
        const socket = connections.get(agentId);
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(message));
        }
      });
    }
  }

  function notifyAgents(companyId: string, notification: any) {
    broadcastToCompany(companyId, {
      type: 'notification',
      notification
    });
  }

  async function saveMessage(messageData: any) {
    try {
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/chat_messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        console.error('Failed to save message:', await response.text());
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }

  return response;
});