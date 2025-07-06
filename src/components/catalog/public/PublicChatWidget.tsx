import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Send, Minimize2, X, User, Loader2 } from 'lucide-react'
import { useWebRTCChat } from '@/hooks/useWebRTCChat'
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
  const [visitorInfo, setVisitorInfo] = useState({
    name: '',
    email: '',
    hasProvidedInfo: false
  })
  const [conversationId, setConversationId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const visitorId = useState(() => crypto.randomUUID())[0]

  const {
    messages,
    isConnected,
    isLoading,
    error,
    connect,
    sendMessage,
    createConversation,
    loadMessages
  } = useWebRTCChat(companyId, visitorId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, conversationId])

  const handleStartChat = async () => {
    if (!visitorInfo.name.trim()) return

    const newConversationId = await createConversation(visitorInfo.name, visitorInfo.email)
    if (newConversationId) {
      setConversationId(newConversationId)
      setVisitorInfo(prev => ({ ...prev, hasProvidedInfo: true }))
    }
  }

  const handleSendMessage = () => {
    if (!currentMessage.trim() || !conversationId || !isConnected) return

    sendMessage(conversationId, currentMessage, visitorInfo.name, 'visitor')
    setCurrentMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (visitorInfo.hasProvidedInfo && conversationId) {
        handleSendMessage()
      } else {
        handleStartChat()
      }
    }
  }

  const currentMessages = conversationId ? (messages[conversationId] || []) : []

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="rounded-full w-14 h-14 shadow-xl bg-primary hover:bg-primary/90 relative overflow-hidden"
              size="lg"
            >
              <MessageCircle className="h-6 w-6" />
              {/* Pulse animation */}
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
          >
            <Card className={`w-80 shadow-2xl transition-all duration-300 ${
              isMinimized ? 'h-14' : 'h-96'
            }`}>
              {/* Header */}
              <CardHeader className="pb-2 px-4 py-3 bg-primary text-primary-foreground rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Chat en direct
                    <AnimatePresence>
                      {isConnected ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Badge variant="secondary" className="text-xs bg-green-500 text-white">
                            En ligne
                          </Badge>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Badge variant="secondary" className="text-xs bg-orange-500 text-white">
                            <Loader2 className="h-2 w-2 mr-1 animate-spin" />
                            Connexion...
                          </Badge>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardTitle>
                  <div className="flex items-center gap-1">
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
                  {/* Visitor Info Form */}
                  <AnimatePresence>
                    {!visitorInfo.hasProvidedInfo && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 space-y-3 border-b bg-muted/30"
                      >
                        <p className="text-sm text-muted-foreground">
                          Pour commencer la conversation, veuillez nous indiquer :
                        </p>
                        <Input
                          placeholder="Votre nom *"
                          value={visitorInfo.name}
                          onChange={(e) => setVisitorInfo(prev => ({ ...prev, name: e.target.value }))}
                          onKeyPress={handleKeyPress}
                        />
                        <Input
                          placeholder="Votre email (optionnel)"
                          type="email"
                          value={visitorInfo.email}
                          onChange={(e) => setVisitorInfo(prev => ({ ...prev, email: e.target.value }))}
                          onKeyPress={handleKeyPress}
                        />
                        <Button
                          onClick={handleStartChat}
                          disabled={!visitorInfo.name.trim() || isLoading}
                          className="w-full"
                          size="sm"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Connexion...
                            </>
                          ) : (
                            'Commencer le chat'
                          )}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Messages Area */}
                  {visitorInfo.hasProvidedInfo && (
                    <>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <AnimatePresence>
                          {currentMessages.length === 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-center text-muted-foreground text-sm py-8"
                            >
                              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>Bonjour {visitorInfo.name} !</p>
                              <p>Un agent va vous répondre dans quelques instants.</p>
                            </motion.div>
                          )}

                          {currentMessages.map((message: ChatMessage, index) => (
                            <motion.div
                              key={message.id || `${message.created_at}-${message.sender_name}-${index}`}
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.2, delay: index * 0.05 }}
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
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Message Input */}
                      <div className="border-t p-3 bg-background">
                        <AnimatePresence>
                          {error && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="text-xs text-destructive mb-2 p-2 bg-destructive/10 rounded border"
                            >
                              {error}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Tapez votre message..."
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
                            className="px-3"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                        <AnimatePresence>
                          {!isConnected && (
                            <motion.p 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-xs text-muted-foreground mt-1 flex items-center gap-1"
                            >
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Reconnexion en cours...
                            </motion.p>
                          )}
                        </AnimatePresence>
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