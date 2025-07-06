import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebSocketMessage {
  type: 'join' | 'message' | 'typing' | 'leave';
  conversationId?: string;
  companyId?: string;
  visitorId?: string;
  agentId?: string;
  message?: string;
  senderName?: string;
  senderType?: 'visitor' | 'agent' | 'system';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('WebSocket connection established');

  socket.onopen = () => {
    console.log('WebSocket opened');
  };

  socket.onmessage = async (event) => {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      console.log('Received message:', data);

      switch (data.type) {
        case 'join':
          await handleJoin(data, socket, supabase);
          break;
        
        case 'message':
          await handleMessage(data, socket, supabase);
          break;
        
        case 'typing':
          await handleTyping(data, socket);
          break;
        
        case 'leave':
          await handleLeave(data, socket);
          break;
        
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  };

  socket.onclose = () => {
    console.log('WebSocket closed');
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return response;
});

async function handleJoin(data: WebSocketMessage, socket: WebSocket, supabase: any) {
  try {
    // Check if conversation exists, create if not
    let conversation;
    
    if (data.conversationId) {
      const { data: existingConv } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', data.conversationId)
        .single();
      
      conversation = existingConv;
    }
    
    if (!conversation && data.companyId) {
      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('chat_conversations')
        .insert({
          id: data.conversationId || crypto.randomUUID(),
          company_id: data.companyId,
          visitor_id: data.visitorId,
          agent_id: data.agentId,
          status: 'waiting',
          started_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating conversation:', error);
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to create conversation'
        }));
        return;
      }
      
      conversation = newConv;
    }
    
    socket.send(JSON.stringify({
      type: 'joined',
      conversationId: conversation?.id,
      message: 'Successfully joined conversation'
    }));
    
    console.log('Client joined conversation:', conversation?.id);
  } catch (error) {
    console.error('Error in handleJoin:', error);
    socket.send(JSON.stringify({
      type: 'error',
      message: 'Failed to join conversation'
    }));
  }
}

async function handleMessage(data: WebSocketMessage, socket: WebSocket, supabase: any) {
  try {
    // Save message to database
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: data.conversationId,
        sender_type: data.senderType,
        sender_id: data.agentId,
        sender_name: data.senderName,
        message: data.message,
        message_type: 'text'
      });
    
    if (error) {
      console.error('Error saving message:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to save message'
      }));
      return;
    }
    
    // Broadcast message to other clients (in a real implementation, you'd maintain client connections)
    socket.send(JSON.stringify({
      type: 'message',
      conversationId: data.conversationId,
      messageId: crypto.randomUUID(),
      message: data.message,
      senderName: data.senderName,
      senderType: data.senderType,
      timestamp: new Date().toISOString()
    }));
    
    console.log('Message processed for conversation:', data.conversationId);
  } catch (error) {
    console.error('Error in handleMessage:', error);
    socket.send(JSON.stringify({
      type: 'error',
      message: 'Failed to process message'
    }));
  }
}

async function handleTyping(data: WebSocketMessage, socket: WebSocket) {
  // In a real implementation, you'd broadcast typing indicators to other clients
  console.log('Typing indicator for conversation:', data.conversationId);
}

async function handleLeave(data: WebSocketMessage, socket: WebSocket) {
  console.log('Client left conversation:', data.conversationId);
}