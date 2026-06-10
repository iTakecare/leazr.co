import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MessageCircle,
  Users,
  Clock,
  Send,
  User,
  CheckCircle,
  AlertCircle,
  Trash2,
  Phone,
  Video,
  MoreHorizontal,
  Zap,
  Star,
  Eye,
  Check,
  CheckCheck,
  Globe,
  FileImage,
  Smartphone
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { ChatConversation, ChatMessage } from '@/types/chat';
import { useAuth } from '@/context/AuthContext';
import { OnlineStatusSwitch } from './OnlineStatusSwitch';
import { useAgentStatus } from '@/hooks/useAgentStatus';

// Fenêtre WhatsApp : réponse libre autorisée pendant 24 h après le dernier
// message entrant du client. Au-delà, seuls les templates approuvés passent.
const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;
const whatsappWindowDeadline = (conv: ChatConversation): Date | null =>
  conv.channel === 'whatsapp' && conv.last_inbound_at
    ? new Date(new Date(conv.last_inbound_at).getTime() + WHATSAPP_WINDOW_MS)
    : null;

const ChannelBadge: React.FC<{ channel?: string }> = ({ channel }) => {
  if (channel === 'whatsapp') {
    return (
      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
        <Phone className="h-3 w-3 mr-1" />
        WhatsApp
      </Badge>
    );
  }
  if (channel === 'sms') {
    return (
      <Badge variant="secondary" className="bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100">
        <Smartphone className="h-3 w-3 mr-1" />
        SMS
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">
      <Globe className="h-3 w-3 mr-1" />
      Web
    </Badge>
  );
};

// Coches de livraison façon WhatsApp pour les messages sortants.
const DeliveryTicks: React.FC<{ status?: string | null; error?: string | null }> = ({ status, error }) => {
  if (!status) return null;
  if (status === 'failed' || status === 'undelivered') {
    return <span className="text-red-500 inline-flex items-center gap-1" title={error ?? 'Échec d\'envoi'}><AlertCircle className="h-3 w-3" /> échec</span>;
  }
  if (status === 'read') return <CheckCheck className="h-3.5 w-3.5 inline text-sky-400" />;
  if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 inline opacity-70" />;
  return <Check className="h-3.5 w-3.5 inline opacity-70" />;
};

// Pièce jointe entrante (photo de document, PDF…) — bucket privé chat-media,
// affichée via une URL signée courte durée.
const MediaAttachment: React.FC<{ path: string; contentType?: string | null }> = ({ path, contentType }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.storage.from('chat-media').createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [path]);
  if (!url) {
    return <span className="text-xs opacity-70 inline-flex items-center gap-1"><FileImage className="h-3 w-3" /> Chargement…</span>;
  }
  if (contentType?.startsWith('image/')) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt="Pièce jointe" className="max-h-48 rounded-lg mt-1" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1 mt-1">
      <FileImage className="h-3.5 w-3.5" /> Ouvrir la pièce jointe
    </a>
  );
};

export const EnhancedAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');
  const [conversationToDelete, setConversationToDelete] = useState<ChatConversation | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState('waiting');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [sendingChannelMessage, setSendingChannelMessage] = useState(false);

  const { agentStatus } = useAgentStatus();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    settings,
    updateSettings,
    playSound,
    showNotification,
    showToast,
    unreadCount,
    setUnreadCount
  } = useNotifications();

  // Get company ID from user profile
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
        }
      } catch (error) {
        console.error('Error fetching company ID:', error);
      }
    };

    fetchCompanyId();
  }, [user?.id]);

  // WhatsApp/SMS : l'edge function envoie via Twilio ET insère le message en
  // base — le realtime l'affiche. Pas d'insert direct ici (sinon doublon).
  const sendChannelMessage = async (conversation: ChatConversation, text: string) => {
    setSendingChannelMessage(true);
    try {
      const { data, error } = await supabase.functions.invoke('messaging-send', {
        body: { action: 'send_message', conversation_id: conversation.id, text },
      });
      let body = (data ?? null) as { success?: boolean; error?: string; message?: string } | null;
      if (error) {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx?.json) { try { body = await ctx.json(); } catch { /* */ } }
      }
      if (!body?.success) {
        if (body?.error === 'window_closed') {
          showToast('Fenêtre WhatsApp fermée', 'Plus de 24 h sans message du client — il doit vous écrire, ou envoyez un template approuvé.', 'destructive');
        } else {
          showToast('Erreur', body?.message ?? body?.error ?? 'Envoi impossible', 'destructive');
        }
        return;
      }
      loadMessages(conversation.id);
    } catch (e) {
      console.error('Error sending channel message:', e);
      showToast('Erreur', 'Envoi impossible', 'destructive');
    } finally {
      setSendingChannelMessage(false);
    }
  };

  // Simple message sending functionality
  const sendMessage = async (conversationId: string, message: string, senderName: string, senderType: 'agent' | 'visitor') => {
    // Create optimistic message object for immediate display
    const optimisticMessage: ChatMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_type: senderType,
      sender_id: senderType === 'agent' ? user?.id : null,
      sender_name: senderName,
      message,
      message_type: 'text',
      created_at: new Date().toISOString()
    };

    // Add message immediately to local state for instant feedback
    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimisticMessage]
    }));

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: senderType,
          sender_id: senderType === 'agent' ? user?.id : null,
          sender_name: senderName,
          message,
          message_type: 'text'
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(msg => msg.id !== optimisticMessage.id)
      }));
      showToast('Erreur', 'Impossible d\'envoyer le message', 'destructive');
    }
  };

  // Handle notifications for new conversations and messages
  useEffect(() => {
    if (!companyId) return;
    
    // Monitor for new conversations
    const conversationsChannel = supabase
      .channel(`conversations_notifications_${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_conversations',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          const newConversation = payload.new as ChatConversation;
          playSound('visitor');
          showNotification(
            'Nouveau visiteur',
            `${newConversation.visitor_name} vient de rejoindre le chat`,
            '/logo.png'
          );
          showToast(
            'Nouveau visiteur',
            `${newConversation.visitor_name} attend une réponse`
          );
          setUnreadCount(unreadCount + 1);
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
    };
  }, [companyId, playSound, showNotification, showToast, setUnreadCount]);

  const loadConversations = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load conversations and subscribe to real-time updates
  useEffect(() => {
    if (companyId) {
      loadConversations();
      
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
            console.log('Admin: Conversation updated:', payload);
            loadConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(conversationsChannel);
      };
    }
  }, [companyId]);

  // Load messages for selected conversation
  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(prev => ({ ...prev, [conversationId]: data || [] }));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Initialize connection state for admin
  useEffect(() => {
    if (companyId && agentStatus?.is_online) {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  }, [companyId, agentStatus?.is_online]);

  // Connect to selected conversation
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      
      // Reset unread count for this conversation
      setUnreadCount(0);

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
            console.log('Admin: New message received:', payload);
            const newMessage = payload.new as ChatMessage;
            
            // Play sound for new visitor messages
            if (newMessage.sender_type === 'visitor') {
              console.log('🔊 Tentative de jouer le son pour nouveau message visiteur');
              try {
                playSound('visitor');
                console.log('✅ Son joué avec succès');
              } catch (error) {
                console.error('❌ Erreur lors du son:', error);
              }
              
              showNotification(
                'Nouveau message',
                `${newMessage.sender_name}: ${newMessage.message.substring(0, 50)}${newMessage.message.length > 50 ? '...' : ''}`,
                '/logo.png'
              );
            }
            
            loadMessages(selectedConversation.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [selectedConversation, setUnreadCount]);


  const handleSendMessage = () => {
    if (!currentMessage.trim() || !selectedConversation || !user) return;

    if (selectedConversation.channel === 'whatsapp' || selectedConversation.channel === 'sms') {
      sendChannelMessage(selectedConversation, currentMessage);
    } else {
      const senderName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Agent';
      sendMessage(selectedConversation.id, currentMessage, senderName, 'agent');
    }
    setCurrentMessage('');
    setIsTyping(false);
  };

  const handleInputChange = (value: string) => {
    setCurrentMessage(value);
    
    if (selectedConversation && value.trim() && !isTyping) {
      setIsTyping(true);
      const senderName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Agent';
      // sendTyping functionality not yet implemented
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const updateConversationStatus = async (conversationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ 
          status,
          agent_id: status === 'active' ? user?.id : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) throw error;
      
      loadConversations();
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => prev ? { 
          ...prev, 
          status, 
          agent_id: status === 'active' ? user?.id : null 
        } as ChatConversation : null);
      }

      showToast(
        'Statut mis à jour',
        `Conversation ${status === 'active' ? 'prise en charge' : status === 'closed' ? 'fermée' : 'mise à jour'}`
      );
    } catch (error) {
      console.error('Error updating conversation status:', error);
      showToast('Erreur', 'Impossible de mettre à jour le statut', 'destructive');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        return;
      }

      const { error: conversationError } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (conversationError) {
        console.error('Error deleting conversation:', conversationError);
        return;
      }

      loadConversations();
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }

      setConversationToDelete(null);
      showToast('Conversation supprimée', 'La conversation a été supprimée avec succès');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      showToast('Erreur', 'Impossible de supprimer la conversation', 'destructive');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case 'active':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Actif
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground border-muted hover:bg-muted">
            <CheckCircle className="h-3 w-3 mr-1" />
            Fermé
          </Badge>
        );
      case 'abandoned':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Abandonné
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredConversations = conversations.filter(conv => {
    switch (activeTab) {
      case 'waiting': return conv.status === 'waiting';
      case 'active': return conv.status === 'active';
      case 'closed': return conv.status === 'closed';
      default: return true;
    }
  });

  const currentMessages = selectedConversation ? (messages[selectedConversation.id] || []) : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <MessageCircle className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>Chargement des conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full max-h-[90vh]">
      {/* Status Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${agentStatus?.is_online ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {agentStatus?.is_online ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
            <OnlineStatusSwitch />
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {conversations.length} conversations
              </span>
            </div>
            {unreadCount > 0 && (
              <>
                <div className="h-4 w-px bg-border" />
                <Badge variant="destructive" className="h-6 px-2 text-xs animate-bounce">
                  {unreadCount} non lues
                </Badge>
              </>
            )}
          </div>
        </div>

      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50">
          <TabsTrigger value="waiting" className="relative data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Clock className="h-4 w-4 mr-2" />
            En attente
            {conversations.filter(c => c.status === 'waiting').length > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 bg-orange-500 text-white text-xs animate-pulse">
                {conversations.filter(c => c.status === 'waiting').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Actives
            {conversations.filter(c => c.status === 'active').length > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 bg-green-500 text-white text-xs">
                {conversations.filter(c => c.status === 'active').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="closed" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Fermées
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="h-4 w-4 mr-2" />
            Toutes
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 h-[calc(100%-80px)]">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Conversations ({filteredConversations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-muted border-l-4 border-l-primary' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                                {conversation.visitor_name?.charAt(0) || 'V'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate block">
                                {conversation.visitor_name || 'Visiteur anonyme'}
                              </span>
                              {conversation.visitor_email && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {conversation.visitor_email}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getStatusBadge(conversation.status)}
                              {conversation.channel && conversation.channel !== 'web' && (
                                <ChannelBadge channel={conversation.channel} />
                              )}
                            </div>
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
                  
                  {filteredConversations.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Aucune conversation</p>
                      <p className="text-xs">
                        {activeTab === 'waiting' ? 'Aucun visiteur en attente' : 
                         activeTab === 'active' ? 'Aucune conversation active' :
                         activeTab === 'closed' ? 'Aucune conversation fermée' :
                         'Les conversations apparaîtront ici'}
                      </p>
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
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {selectedConversation.visitor_name?.charAt(0) || 'V'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          {selectedConversation.visitor_name || 'Visiteur anonyme'}
                        </CardTitle>
                        {(selectedConversation.visitor_email || selectedConversation.client_phone) && (
                          <p className="text-sm text-muted-foreground">
                            {selectedConversation.visitor_email || selectedConversation.client_phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ChannelBadge channel={selectedConversation.channel} />
                      {getStatusBadge(selectedConversation.status)}
                      
                      <div className="flex gap-1">
                        {selectedConversation.status === 'waiting' && (
                           <Button
                            size="sm"
                            onClick={() => updateConversationStatus(selectedConversation.id, 'active')}
                            className="bg-green-600 hover:bg-green-700 text-white animate-pulse"
                          >
                            <Zap className="h-4 w-4 mr-1" />
                            Prendre en charge
                          </Button>
                        )}
                        
                        {selectedConversation.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateConversationStatus(selectedConversation.id, 'closed')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
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
                    <div className="space-y-4">
                      {currentMessages.map((message: ChatMessage, index) => (
                        <div
                          key={message.id || `${message.created_at}-${index}`}
                          className={`flex ${message.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] group`}>
                            {message.sender_type === 'visitor' && (
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                    {message.sender_name?.charAt(0) || 'V'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium text-gray-600">
                                  {message.sender_name}
                                </span>
                              </div>
                            )}
                            
                            <div
                              className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                message.sender_type === 'agent'
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-muted rounded-bl-md'
                              }`}
                            >
                              {message.media_path ? (
                                <MediaAttachment path={message.media_path} contentType={message.media_content_type} />
                              ) : (
                                <p className="whitespace-pre-wrap">{message.message}</p>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground mt-1 px-2 flex items-center gap-1 justify-end">
                              {message.created_at ? new Date(message.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : ''}
                              {message.direction === 'outbound' && (
                                <DeliveryTicks status={message.delivery_status} error={message.delivery_error} />
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {currentMessages.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm font-medium">Conversation démarrée</p>
                          <p className="text-xs">
                            Commencez par saluer {selectedConversation.visitor_name || 'le visiteur'}
                          </p>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  {selectedConversation.status !== 'closed' && (() => {
                    // Web : il faut être en ligne. WhatsApp : il faut que la
                    // fenêtre de 24 h soit ouverte. SMS : toujours possible.
                    const isChannelConv = selectedConversation.channel === 'whatsapp' || selectedConversation.channel === 'sms';
                    const deadline = whatsappWindowDeadline(selectedConversation);
                    const windowOpen = selectedConversation.channel !== 'whatsapp' || (deadline !== null && deadline.getTime() > Date.now());
                    const canType = isChannelConv ? windowOpen : !!agentStatus?.is_online;
                    return (
                    <div className="border-t p-4 bg-muted/20">
                      <div className="flex gap-3">
                        <div className="flex-1">
                           <Input
                             placeholder={canType ? 'Tapez votre réponse...' : selectedConversation.channel === 'whatsapp' ? 'Fenêtre WhatsApp fermée' : 'Tapez votre réponse...'}
                             value={currentMessage}
                             onChange={(e) => handleInputChange(e.target.value)}
                             onKeyPress={handleKeyPress}
                             disabled={!canType || sendingChannelMessage}
                             className="bg-white"
                           />
                        </div>
                         <Button
                           onClick={handleSendMessage}
                           disabled={!currentMessage.trim() || !canType || sendingChannelMessage}
                           size="sm"
                           className="px-4"
                         >
                           <Send className="h-4 w-4" />
                         </Button>
                      </div>

                       {selectedConversation.channel === 'whatsapp' && windowOpen && deadline && (
                         <p className="text-xs text-muted-foreground mt-2">
                           Réponse libre possible jusqu'à {deadline.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} (fenêtre WhatsApp de 24 h).
                         </p>
                       )}
                       {selectedConversation.channel === 'whatsapp' && !windowOpen && (
                         <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                           <AlertCircle className="h-3 w-3" />
                           Fenêtre de 24 h fermée — le client doit vous écrire pour la rouvrir, ou envoyez un template approuvé (relance documents, etc.).
                         </p>
                       )}
                       {!isChannelConv && !agentStatus?.is_online && (
                         <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                           <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                           Agent hors ligne - activez votre statut pour répondre
                         </p>
                       )}
                    </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-16 w-16 mx-auto mb-6 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Sélectionnez une conversation</h3>
                  <p className="text-sm">
                    Choisissez une conversation dans la liste pour commencer à discuter
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </Tabs>

      {/* Delete Confirmation Dialog */}
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
  );
};