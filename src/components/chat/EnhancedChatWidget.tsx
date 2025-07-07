import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Send, 
  Minimize2, 
  X, 
  User, 
  Paperclip,
  Smile,
  Phone,
  Video,
  Settings
} from 'lucide-react';
import { useWebRTCChat } from '@/hooks/useWebRTCChat';
import { ChatMessage } from '@/types/chat';

interface EnhancedChatWidgetProps {
  companyId: string;
  companyName?: string;
  companyLogo?: string;
  primaryColor?: string;
  className?: string;
}

export const EnhancedChatWidget: React.FC<EnhancedChatWidgetProps> = ({ 
  companyId, 
  companyName = "Support",
  companyLogo,
  primaryColor = "#3b82f6",
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState({
    name: '',
    email: '',
    hasProvidedInfo: false
  });
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const visitorId = useState(() => crypto.randomUUID())[0];

  const {
    messages,
    isConnected,
    isLoading,
    error,
    connect,
    sendMessage,
    sendTyping,
    createConversation,
    loadMessages
  } = useWebRTCChat(companyId, visitorId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, conversationId]);

  const handleStartChat = async () => {
    if (!visitorInfo.name.trim()) return;

    const newConversationId = await createConversation(visitorInfo.name, visitorInfo.email);
    if (newConversationId) {
      setConversationId(newConversationId);
      setVisitorInfo(prev => ({ ...prev, hasProvidedInfo: true }));
    }
  };

  const handleSendMessage = () => {
    if (!currentMessage.trim() || !conversationId || !isConnected) return;

    sendMessage(conversationId, currentMessage, visitorInfo.name, 'visitor');
    setCurrentMessage('');
    setIsTyping(false);
  };

  const handleInputChange = (value: string) => {
    setCurrentMessage(value);
    
    // Send typing indicator
    if (conversationId && value.trim() && !isTyping) {
      setIsTyping(true);
      sendTyping(conversationId, visitorInfo.name, 'visitor');
    }

    // Clear typing after 3 seconds of inactivity
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
      if (visitorInfo.hasProvidedInfo && conversationId) {
        handleSendMessage();
      } else {
        handleStartChat();
      }
    }
  };

  const currentMessages = conversationId ? (messages[conversationId] || []) : [];

  // Custom CSS for primary color
  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--chat-primary', primaryColor);
    }
  }, [primaryColor]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div className="relative">
          <Button
            onClick={() => setIsOpen(true)}
            className="rounded-full w-16 h-16 shadow-2xl hover:scale-105 transition-all duration-200"
            style={{ backgroundColor: primaryColor }}
            size="lg"
          >
            <MessageCircle className="h-7 w-7" />
          </Button>
          {/* Online indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className={`w-80 shadow-2xl transition-all duration-300 ${
          isMinimized ? 'h-14' : 'h-[500px]'
        } backdrop-blur-sm border-0`}>
          
          {/* Header */}
          <CardHeader 
            className="pb-3 px-4 py-3 text-white rounded-t-lg relative overflow-hidden"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={companyLogo} />
                  <AvatarFallback className="bg-white/20 text-white text-sm">
                    {companyName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-medium">{companyName}</CardTitle>
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs opacity-90">En ligne</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <span className="text-xs opacity-90">Connexion...</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Content */}
          {!isMinimized && (
            <CardContent className="p-0 flex flex-col h-[440px]">
              
              {/* Visitor Info Form */}
              {!visitorInfo.hasProvidedInfo && (
                <div className="p-4 space-y-4 border-b bg-gradient-to-b from-gray-50 to-white">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      👋 Bienvenue !
                    </h3>
                    <p className="text-xs text-gray-600">
                      Nous sommes là pour vous aider. Comment devons-nous vous appeler ?
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Input
                      placeholder="Votre nom *"
                      value={visitorInfo.name}
                      onChange={(e) => setVisitorInfo(prev => ({ ...prev, name: e.target.value }))}
                      onKeyPress={handleKeyPress}
                      className="border-gray-200 focus:border-blue-500"
                    />
                    <Input
                      placeholder="Votre email (optionnel)"
                      type="email"
                      value={visitorInfo.email}
                      onChange={(e) => setVisitorInfo(prev => ({ ...prev, email: e.target.value }))}
                      onKeyPress={handleKeyPress}
                      className="border-gray-200 focus:border-blue-500"
                    />
                    <Button
                      onClick={handleStartChat}
                      disabled={!visitorInfo.name.trim() || isLoading}
                      className="w-full"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Connexion...
                        </div>
                      ) : (
                        'Commencer la conversation'
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Messages Area */}
              {visitorInfo.hasProvidedInfo && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {currentMessages.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <MessageCircle className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          Salut {visitorInfo.name} ! 👋
                        </h3>
                        <p className="text-xs text-gray-600">
                          Un de nos agents va vous répondre dans quelques instants.
                        </p>
                      </div>
                    )}

                    {currentMessages.map((message: ChatMessage, index) => (
                      <div
                        key={message.id || `${message.created_at}-${index}`}
                        className={`flex ${message.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] group`}>
                          {message.sender_type === 'agent' && (
                            <div className="flex items-center gap-2 mb-1">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={companyLogo} />
                                <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                                  {message.sender_name?.charAt(0) || 'A'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium text-gray-600">
                                {message.sender_name}
                              </span>
                            </div>
                          )}
                          
                          <div
                            className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                              message.sender_type === 'visitor'
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-white text-gray-800 border rounded-bl-md'
                            }`}
                            style={message.sender_type === 'visitor' ? { backgroundColor: primaryColor } : {}}
                          >
                            <p className="whitespace-pre-wrap">{message.message}</p>
                          </div>
                          
                          <p className="text-xs text-gray-500 mt-1 px-2">
                            {message.created_at ? new Date(message.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="border-t bg-white p-4">
                    {error && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-3 border border-red-200">
                        {error}
                      </div>
                    )}
                    
                    <div className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <Textarea
                          placeholder="Tapez votre message..."
                          value={currentMessage}
                          onChange={(e) => handleInputChange(e.target.value)}
                          onKeyPress={handleKeyPress}
                          disabled={!isConnected}
                          className="min-h-[40px] max-h-24 resize-none border-gray-200 focus:border-blue-500 pr-20"
                          rows={1}
                        />
                        
                        <div className="absolute right-2 bottom-2 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          >
                            <Smile className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <Button
                        onClick={handleSendMessage}
                        disabled={!currentMessage.trim() || !isConnected}
                        size="sm"
                        className="h-10 w-10 p-0 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {!isConnected && (
                      <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                        <div className="w-3 h-3 border border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                        Reconnexion en cours...
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};