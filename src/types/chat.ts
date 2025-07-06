export interface ChatMessage {
  id?: string
  conversation_id: string
  sender_type: 'visitor' | 'agent' | 'system'
  sender_id?: string | null
  sender_name: string
  message: string
  message_type: 'text' | 'image' | 'file' | 'system'
  metadata?: Record<string, any>
  created_at?: string
}

export interface ChatConversation {
  id: string
  company_id: string
  visitor_id?: string | null
  client_id?: string | null
  agent_id?: string | null
  status: 'waiting' | 'active' | 'closed' | 'abandoned'
  visitor_name?: string | null
  visitor_email?: string | null
  visitor_context?: Record<string, any>
  started_at: string
  ended_at?: string | null
  created_at: string
  updated_at: string
}

export interface ChatAgentStatus {
  id: string
  agent_id: string
  company_id: string
  is_online: boolean
  is_available: boolean
  current_conversations: number
  max_conversations: number
  last_seen_at: string
  created_at: string
  updated_at: string
}

export interface WebSocketMessage {
  type: 'message' | 'join' | 'leave' | 'agent-status' | 'typing' | 'joined' | 'error'
  conversationId?: string
  companyId?: string
  visitorId?: string
  agentId?: string
  message?: string
  senderName?: string
  senderType?: 'visitor' | 'agent' | 'system'
  messageId?: string
  timestamp?: string
  data?: any
}

export interface ChatState {
  conversations: ChatConversation[]
  messages: Record<string, ChatMessage[]>
  currentConversation: ChatConversation | null
  isConnected: boolean
  isLoading: boolean
  error: string | null
}