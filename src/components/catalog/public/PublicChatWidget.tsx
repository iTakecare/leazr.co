import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Send, Minimize2, X, User, Wifi, WifiOff, Volume2, VolumeX } from 'lucide-react'
import { useSimpleChat } from '@/hooks/useSimpleChat'
import { ChatMessage } from '@/types/chat'
import { motion, AnimatePresence } from 'framer-motion'

interface PublicChatWidgetProps {
  companyId: string
  className?: string
}

export const PublicChatWidget: React.FC<PublicChatWidgetProps> = ({ 
  companyId, 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [visitorForm, setVisitorForm] = useState({
    name: '', 
    email: ''
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef(0)

  const {
    conversationId,
    visitorInfo,
    messages,
    isConnected,
    isLoading,
    error,
    initializeChat,
    sendMessage,
    clearChat,
    playNotificationSound
  } = useSimpleChat()

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > lastMessageCountRef.current) {
      const newMessages = messages.length - lastMessageCountRef.current
      if (newMessages > 0) {
        setUnreadCount(prev => prev + newMessages)
        
        // Play sound if enabled and new message is from agent
        const latestMessage = messages[messages.length - 1]
        if (soundEnabled && latestMessage?.sender_type === 'agent') {
          playNotificationSound()
        }
      }
    }
    lastMessageCountRef.current = messages.length
  }, [messages, isOpen, soundEnabled, playNotificationSound])

  // Reset unread count when opening chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
    }
  }, [isOpen])

  // Auto-initialize if we have visitor info but no conversation
  useEffect(() => {
    if (visitorInfo && !conversationId) {
      // Try to reconnect or create new conversation
      initializeChat(companyId, visitorInfo.name, visitorInfo.email)
    }
  }, [visitorInfo, conversationId, companyId, initializeChat])

  const handleStartChat = async () => {
    if (!visitorForm.name.trim()) return

    try {
      await initializeChat(companyId, visitorForm.name, visitorForm.email)
    } catch (error) {
      console.error('Error starting chat:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return

    try {
      await sendMessage(currentMessage)
      setCurrentMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (visitorInfo && conversationId) {
        handleSendMessage()
      } else {
        handleStartChat()
      }
    }
  }

  const handleClearChat = () => {
    clearChat()
    setVisitorForm({ name: '', email: '' })
    setUnreadCount(0)
  }

  const isConnectedToChat = conversationId && visitorInfo

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Chat Button - shown when chat is closed */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="relative"
        >
          <Button
            onClick={() => setIsOpen(true)}
            className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90 relative"
            size="lg"
          >
            <MessageCircle className="h-6 w-6" />
            {/* Unread badge */}
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-[20px] h-5 flex items-center justify-center text-xs font-bold"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
          >
            <Card className={`w-80 shadow-xl transition-all duration-200 ${isMinimized ? 'h-14' : 'h-96'}`}>
              {/* Header */}
              <CardHeader className="pb-2 px-4 py-3 bg-primary text-primary-foreground rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Chat en direct
                    <div className="flex items-center gap-1">
                      {isConnected ? (
                        <Badge variant="secondary" className="text-xs bg-green-500 text-white gap-1">
                          <Wifi className="h-3 w-3" />
                          En ligne
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-red-500 text-white gap-1">
                          <WifiOff className="h-3 w-3" />
                          Hors ligne
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/20"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      title={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
                    >
                      {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/20"
                      onClick={() => setIsMinimized(!isMinimized)}
                    >
                      <Minimize2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/20"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Content */}
              {!isMinimized && (
                <CardContent className="p-0 flex flex-col h-80">
                  {/* Visitor Info Form - only show if not connected */}
                  {!isConnectedToChat && (
                    <div className="p-4 space-y-3 border-b">
                      <p className="text-sm text-muted-foreground">
                        Pour commencer la conversation, veuillez nous indiquer :
                      </p>
                      <Input
                        placeholder="Votre nom *"
                        value={visitorForm.name}
                        onChange={(e) => setVisitorForm(prev => ({ ...prev, name: e.target.value }))}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                      />
                      <Input
                        placeholder="Votre email (optionnel)"
                        type="email"
                        value={visitorForm.email}
                        onChange={(e) => setVisitorForm(prev => ({ ...prev, email: e.target.value }))}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                      />
                      <Button
                        onClick={handleStartChat}
                        disabled={!visitorForm.name.trim() || isLoading}
                        className="w-full"
                        size="sm"
                      >
                        {isLoading ? 'Connexion...' : 'Commencer le chat'}
                      </Button>
                      
                      {/* Show existing conversation option */}
                      {conversationId && (
                        <Button
                          onClick={handleClearChat}
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                        >
                          Nouvelle conversation
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Messages Area */}
                  {isConnectedToChat && (
                    <>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 && (
                          <div className="text-center text-muted-foreground text-sm py-8">
                            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Bonjour {visitorInfo?.name} !</p>
                            <p>Un agent va vous répondre dans quelques instants.</p>
                          </div>
                        )}

                        {messages.map((message: ChatMessage) => (
                          <motion.div
                            key={message.id || `${message.created_at}-${message.sender_name}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${message.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                                message.sender_type === 'visitor'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              {message.sender_type !== 'visitor' && (
                                <div className="flex items-center gap-1 mb-1">
                                  <User className="h-3 w-3" />
                                  <span className="text-xs font-medium">{message.sender_name}</span>
                                </div>
                              )}
                              <p>{message.message}</p>
                              <div className="text-xs opacity-70 mt-1">
                                {new Date(message.created_at!).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Message Input */}
                      <div className="border-t p-3">
                        {error && (
                          <div className="text-xs text-destructive mb-2 p-2 bg-destructive/10 rounded">
                            {error}
                          </div>
                        )}
                        
                        {!isConnected && (
                          <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded">
                            Aucun opérateur disponible. Votre message sera traité dès qu'un agent sera en ligne.
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Input
                            placeholder="Tapez votre message..."
                            value={currentMessage}
                            onChange={(e) => setCurrentMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!currentMessage.trim() || isLoading}
                            size="sm"
                            className="px-3"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-xs text-muted-foreground">
                            {isConnected ? 'Connecté' : 'Mode hors ligne'}
                          </div>
                          <Button
                            onClick={handleClearChat}
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-2"
                          >
                            Nouvelle conversation
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}