import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

interface ExplainInterfaceProps {
  selectedText: string
  sentence: string
  isWholeSentence: boolean
}

export interface ExplainInterfaceRef {
  sendMessage: (message: string) => void
}

export const ExplainInterface = React.forwardRef<ExplainInterfaceRef, ExplainInterfaceProps>(({ selectedText, sentence, isWholeSentence }, ref) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [userScrolled, setUserScrolled] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const threshold = 100 // pixels from bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < threshold
    
    // If user manually scrolled away from bottom while streaming, remember this
    if (!isNearBottom && (isLoading || isTyping)) {
      setUserScrolled(true)
    }
    
    setIsAtBottom(isNearBottom)
  }, [isLoading, isTyping])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    // Only auto-scroll if user hasn't manually scrolled away during streaming
    if (isAtBottom && !userScrolled) {
      scrollToBottom()
    }
    
    // Reset user scroll flag when streaming stops
    if (!isLoading && !isTyping) {
      setUserScrolled(false)
    }
  }, [messages, isAtBottom, userScrolled, isLoading, isTyping])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setIsTyping(true)

    // Create placeholder assistant message for streaming
    const assistantId = `assistant-${Date.now()}`

    try {
      const response = await fetch('/api/explanations/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          selectedText,
          sentence,
          isWholeSentence
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get explanation')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content
                if (delta) {
                  // On first token, create the assistant message and hide typing
                  if (fullContent === '') {
                    setIsTyping(false)
                    const assistantMessage: Message = {
                      id: assistantId,
                      role: 'assistant',
                      content: delta,
                      isStreaming: true
                    }
                    setMessages(prev => [...prev, assistantMessage])
                    fullContent = delta
                  } else {
                    fullContent += delta
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantId 
                        ? { ...msg, content: fullContent }
                        : msg
                    ))
                  }
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }
      }

      // Mark streaming as complete
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId 
          ? { ...msg, isStreaming: false }
          : msg
      ))

    } catch (error) {
      console.error('Error getting explanation:', error)
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId 
          ? { 
              ...msg, 
              content: 'Sorry, I encountered an error while processing your request. Please try again.',
              isStreaming: false
            }
          : msg
      ))
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }, [messages, isLoading, selectedText, sentence, isWholeSentence])

  // Expose handleSendMessage to parent
  React.useImperativeHandle(ref, () => ({
    sendMessage: handleSendMessage
  }), [handleSendMessage])
  
  // Auto-send initial explanation message only once when component mounts
  useEffect(() => {
    const initialMessage = isWholeSentence 
      ? `Please explain this Japanese sentence: "${sentence}"`
      : `Explain the meaning of "${selectedText}" in the context of the sentence "${sentence}".`
    // Use a timeout to ensure the component is fully mounted
    const timer = setTimeout(() => {
      handleSendMessage(initialMessage)
    }, 100)
    return () => clearTimeout(timer)
    // Only run once when component mounts - don't include handleSendMessage to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 pt-20 pb-4 space-y-6"
      >
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 500, 
              damping: 30,
              delay: index * 0.05
            }}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Assistant Avatar */}
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-medium">K</span>
              </div>
            )}
            
            {/* Message Bubble */}
            <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
              <div className={`px-4 py-3 ${
                message.role === 'user' 
                  ? 'bg-accent text-accent-foreground ml-auto rounded-2xl rounded-br-md' 
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md'
              }`}>
                {message.role === 'assistant' ? (
                  <div className="prose prose-base max-w-none dark:prose-invert prose-blue select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text', fontSize: '15px' }}>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0 select-text leading-relaxed" style={{ userSelect: 'text', WebkitUserSelect: 'text', fontSize: '15px', lineHeight: '1.5' }}>{children}</p>,
                        ul: ({ children }) => <ul className="mb-2 last:mb-0 ml-4 select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text', fontSize: '15px' }}>{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 last:mb-0 ml-4 select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text', fontSize: '15px' }}>{children}</ol>,
                        li: ({ children }) => <li className="mb-1 select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text', fontSize: '15px', lineHeight: '1.5' }}>{children}</li>,
                        code: ({ children }) => (
                          <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                            {children}
                          </code>
                        ),
                        strong: ({ children }) => <strong className="font-medium select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>{children}</strong>,
                        em: ({ children }) => <em className="italic select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>{children}</em>,
                      }}
                    >
                      {message.content || (message.isStreaming ? "" : "...")}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="leading-relaxed select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text', fontSize: '15px', lineHeight: '1.5' }}>{message.content}</div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 25,
                opacity: { duration: 0.2 },
                scale: { duration: 0.3 }
              }}
              className="flex gap-3 justify-start"
            >
              <motion.div 
                className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"
                animate={{ 
                  boxShadow: [
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    "0 10px 15px -3px rgba(59, 130, 246, 0.2)",
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  ]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <span className="text-white text-sm font-medium">K</span>
              </motion.div>
              <motion.div 
                className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-md"
                animate={{ 
                  scale: [1, 1.02, 1]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
                        animate={{
                          y: [-2, -6, -2],
                          opacity: [0.4, 1, 0.4]
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.2,
                          ease: "easeInOut"
                        }}
                      />
                    ))}
                  </div>
                  <motion.span 
                    className="font-medium text-gray-600 dark:text-gray-300"
                    style={{ fontSize: '15px' }}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ 
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    Komi is typing...
                  </motion.span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>
    </>
  )
})