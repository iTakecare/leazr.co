import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  MessageCircle, 
  Users, 
  Clock, 
  Send, 
  User,
  CheckCircle,
  AlertCircle,
  Pause,
  Trash2
} from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { supabase } from '@/integrations/supabase/client'
import { ChatConversation, ChatMessage } from '@/types/chat'
import { useAuth } from '@/context/AuthContext'

export const AdminChatDashboard: React.FC = () => {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null)
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string>('')
  const [conversationToDelete, setConversationToDelete] = useState<ChatConversation | null>(null)

  // Récupérer le company_id depuis le profil utilisateur
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single()
        
        if (profile?.company_id) {
          setCompanyId(profile.company_id)
        }
      } catch (error) {
        console.error('Error fetching company ID:', error)
      }
    }

    fetchCompanyId()
  }, [user?.id])

  const {
    messages,
    isConnected,
    connect,
    sendMessage,
    loadMessages
  } = useChat(
    companyId,
    undefined,
    user?.id
  )

  // Charger les conversations et s'abonner aux mises à jour en temps réel
  useEffect(() => {
    if (companyId) {
      loadConversations()
      
      // S'abonner aux nouvelles conversations pour cette entreprise
      const conversationsChannel = supabase
        .channel(`admin_conversations_${companyId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_conversations',
            filter: `company_id=eq.${companyId}`
          },
          (payload) => {
            console.log('Admin: Conversation updated:', payload)
            loadConversations() // Recharger toutes les conversations
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(conversationsChannel)
      }
    }
  }, [companyId])

  // Se connecter à la conversation sélectionnée et s'abonner aux nouveaux messages
  useEffect(() => {
    if (selectedConversation) {
      connect(selectedConversation.id)
      loadMessages(selectedConversation.id)

      // S'abonner aux nouveaux messages pour cette conversation spécifique
      const messagesChannel = supabase
        .channel(`admin_messages_${selectedConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${selectedConversation.id}`
          },
          (payload) => {
            console.log('Admin: New message received:', payload)
            // Recharger les messages pour cette conversation
            loadMessages(selectedConversation.id)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(messagesChannel)
      }
    }
  }, [selectedConversation, connect, loadMessages])

  const loadConversations = async () => {
    if (!companyId) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setConversations(data || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = () => {
    if (!currentMessage.trim() || !selectedConversation || !user) return

    const senderName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Agent'
    
    sendMessage(selectedConversation.id, currentMessage, senderName, 'agent')
    setCurrentMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const updateConversationStatus = async (conversationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ 
          status,
          agent_id: status === 'active' ? user?.id : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      if (error) throw error
      
      // Recharger les conversations
      loadConversations()
      
      // Mettre à jour la conversation sélectionnée
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => prev ? { ...prev, status, agent_id: status === 'active' ? user?.id : null } as ChatConversation : null)
      }
    } catch (error) {
      console.error('Error updating conversation status:', error)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      // Supprimer tous les messages de la conversation
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId)

      if (messagesError) {
        console.error('Error deleting messages:', messagesError)
        return
      }

      // Supprimer la conversation
      const { error: conversationError } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId)

      if (conversationError) {
        console.error('Error deleting conversation:', conversationError)
        return
      }

      // Recharger les conversations
      loadConversations()
      
      // Si c'était la conversation sélectionnée, la désélectionner
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null)
      }

      setConversationToDelete(null)
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline" className="text-orange-600 border-orange-600"><Clock className="h-3 w-3 mr-1" />En attente</Badge>
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Actif</Badge>
      case 'closed':
        return <Badge variant="outline" className="text-gray-600 border-gray-600"><CheckCircle className="h-3 w-3 mr-1" />Fermé</Badge>
      case 'abandoned':
        return <Badge variant="outline" className="text-red-600 border-red-600"><AlertCircle className="h-3 w-3 mr-1" />Abandonné</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const currentMessages = selectedConversation ? (messages[selectedConversation.id] || []) : []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <MessageCircle className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>Chargement des conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full max-h-[80vh]">
      <Tabs defaultValue="active" className="h-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Actives</TabsTrigger>
          <TabsTrigger value="waiting">En attente</TabsTrigger>
          <TabsTrigger value="closed">Fermées</TabsTrigger>
          <TabsTrigger value="all">Toutes</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 h-[calc(100%-60px)]">
          {/* Liste des conversations */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Conversations ({conversations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {conversation.visitor_name || 'Visiteur anonyme'}
                            </span>
                          </div>
                          {conversation.visitor_email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {conversation.visitor_email}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(conversation.status)}
                            <span className="text-xs text-muted-foreground">
                              {new Date(conversation.started_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {conversations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucune conversation</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5" />
                      <div>
                        <CardTitle className="text-base">
                          {selectedConversation.visitor_name || 'Visiteur anonyme'}
                        </CardTitle>
                        {selectedConversation.visitor_email && (
                          <p className="text-sm text-muted-foreground">
                            {selectedConversation.visitor_email}
                          </p>
                        )}
                      </div>
                    </div>
                     <div className="flex items-center gap-2">
                       {getStatusBadge(selectedConversation.status)}
                       <div className="flex gap-1">
                         {selectedConversation.status === 'waiting' && (
                           <Button
                             size="sm"
                             onClick={() => updateConversationStatus(selectedConversation.id, 'active')}
                           >
                             Prendre en charge
                           </Button>
                         )}
                         {selectedConversation.status === 'active' && (
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => updateConversationStatus(selectedConversation.id, 'closed')}
                           >
                             Fermer
                           </Button>
                         )}
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => setConversationToDelete(selectedConversation)}
                           className="text-destructive hover:text-destructive"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </div>
                     </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {currentMessages.map((message: ChatMessage) => (
                        <div
                          key={message.id || `${message.created_at}-${message.sender_name}`}
                          className={`flex ${message.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                              message.sender_type === 'agent'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {message.sender_type !== 'agent' && (
                              <div className="flex items-center gap-1 mb-1">
                                <User className="h-3 w-3" />
                                <span className="text-xs font-medium">{message.sender_name}</span>
                              </div>
                            )}
                            <p>{message.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {message.created_at ? new Date(message.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {currentMessages.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Conversation démarrée</p>
                          <p className="text-xs">Commencez par saluer le visiteur</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  {selectedConversation.status !== 'closed' && (
                    <div className="border-t p-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Tapez votre réponse..."
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          disabled={!isConnected}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!currentMessage.trim() || !isConnected}
                          size="sm"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      {!isConnected && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Connexion en cours...
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une conversation pour commencer</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </Tabs>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!conversationToDelete} onOpenChange={() => setConversationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette conversation avec{' '}
              <strong>{conversationToDelete?.visitor_name || 'Visiteur anonyme'}</strong> ?
              <br />
              Cette action est irréversible et supprimera tous les messages associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => conversationToDelete && deleteConversation(conversationToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}