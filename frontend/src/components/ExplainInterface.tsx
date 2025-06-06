import React, { useState, useRef, useCallback, useEffect, useMemo, useReducer } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'

// Types
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  error?: boolean
}

interface ExplainInterfaceProps {
  selectedText: string
  sentence: string
  isWholeSentence: boolean
  mangaId?: string
}

export interface ExplainInterfaceRef {
  sendMessage: (message: string) => void
}

// State types for useReducer
interface ExplainState {
  messages: Message[]
  isLoading: boolean
  isTyping: boolean
  scrollState: {
    isAtBottom: boolean
    userScrolled: boolean
  }
  error: string | null
}

type ExplainAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content: string } }
  | { type: 'COMPLETE_MESSAGE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_SCROLL_STATE'; payload: Partial<ExplainState['scrollState']> }
  | { type: 'RESET_STATE' }

// Reducer for complex state management
const explainReducer = (state: ExplainState, action: ExplainAction): ExplainState => {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        error: null
      }
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id
            ? { ...msg, content: action.payload.content }
            : msg
        )
      }
    case 'COMPLETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload
            ? { ...msg, isStreaming: false }
            : msg
        ),
        isLoading: false,
        isTyping: false
      }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload }
    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.payload,
        isLoading: false,
        isTyping: false
      }
    case 'UPDATE_SCROLL_STATE':
      return {
        ...state,
        scrollState: { ...state.scrollState, ...action.payload }
      }
    case 'RESET_STATE':
      return {
        messages: [],
        isLoading: false,
        isTyping: false,
        scrollState: { isAtBottom: true, userScrolled: false },
        error: null
      }
    default:
      return state
  }
}

// Custom hook for scroll management
const useScrollManager = (messagesContainerRef: React.RefObject<HTMLDivElement>) => {
  const userScrollIntentRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const threshold = 100
    const isNearBottom = scrollHeight - scrollTop - clientHeight < threshold
    
    if (!isNearBottom) {
      userScrollIntentRef.current = true
    } else if (isNearBottom) {
      userScrollIntentRef.current = false
    }
    
    return { isAtBottom: isNearBottom, userScrolled: userScrollIntentRef.current }
  }, [messagesContainerRef])

  const resetScrollIntent = useCallback(() => {
    userScrollIntentRef.current = false
  }, [])

  return {
    messagesEndRef,
    scrollToBottom,
    handleScroll,
    resetScrollIntent,
    userScrollIntentRef
  }
}

// Custom hook for streaming API
const useStreamingChat = () => {
  const abortControllerRef = useRef<AbortController | null>(null)

  const streamChat = useCallback(async (
    payload: any,
    onStart: () => void,
    onToken: (content: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/explanations/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const decoder = new TextDecoder()
      let fullContent = ''
      let isFirstToken = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              
              if (delta) {
                if (isFirstToken) {
                  onStart()
                  isFirstToken = false
                }
                fullContent += delta
                onToken(fullContent)
              }
            } catch (e) {
              console.warn('Failed to parse streaming chunk:', e)
            }
          }
        }
      }

      onComplete()
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return // Request was cancelled, not an error
        }
        onError(error.message)
      } else {
        onError('An unexpected error occurred')
      }
    }
  }, [])

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRequest()
    }
  }, [cancelRequest])

  return { streamChat, cancelRequest }
}

// Message component for better performance
const MessageBubble = React.memo(({ message, index }: { message: Message; index: number }) => {
  const { t } = useTranslation()

  const messageStyles = useMemo(() => ({
    userMessage: 'bg-accent text-accent-foreground ml-auto rounded-2xl rounded-br-md',
    assistantMessage: 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md',
    errorMessage: 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-2xl rounded-bl-md border border-red-300 dark:border-red-700'
  }), [])

  const markdownComponents = useMemo(() => ({
    p: ({ children }: any) => (
      <p className="mb-2 last:mb-0 select-text leading-relaxed" 
         style={{ userSelect: 'text', WebkitUserSelect: 'text', fontSize: '15px', lineHeight: '1.5' }}>
        {children}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul className="mb-2 last:mb-0 ml-4 select-text list-disc" 
          style={{ userSelect: 'text', WebkitUserSelect: 'text', fontSize: '15px' }}>
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="mb-2 last:mb-0 ml-4 select-text list-decimal" 
          style={{ userSelect: 'text', WebkitUserSelect: 'text', fontSize: '15px' }}>
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="mb-1 select-text list-item" 
          style={{ userSelect: 'text', WebkitUserSelect: 'text', fontSize: '15px', lineHeight: '1.5' }}>
        {children}
      </li>
    ),
    code: ({ children }: any) => (
      <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono select-text" 
            style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
        {children}
      </code>
    ),
    strong: ({ children }: any) => (
      <strong className="font-medium select-text" 
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
        {children}
      </strong>
    ),
    em: ({ children }: any) => (
      <em className="italic select-text" 
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
        {children}
      </em>
    ),
  }), [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30,
        delay: index * 0.05
      }}
      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
      role="article"
      aria-label={`${message.role === 'user' ? t('common.you') : 'Komi'} message`}
    >
      {/* Assistant Avatar */}
      {message.role === 'assistant' && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden shadow-lg" 
             role="img" 
             aria-label="Komi avatar">
          <img 
            src="/avatar-komi.png" 
            alt="Komi"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Message Bubble */}
      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
        <div className={`px-4 py-3 ${
          message.error 
            ? messageStyles.errorMessage
            : message.role === 'user' 
              ? messageStyles.userMessage 
              : messageStyles.assistantMessage
        }`}>
          {message.role === 'assistant' ? (
            <div className="prose prose-base max-w-none dark:prose-invert prose-blue select-text" 
                 style={{ userSelect: 'text', WebkitUserSelect: 'text', fontSize: '15px' }}>
              <ReactMarkdown components={markdownComponents}>
                {message.content || (message.isStreaming ? "" : "...")}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="leading-relaxed select-text" 
                 style={{ userSelect: 'text', WebkitUserSelect: 'text', fontSize: '15px', lineHeight: '1.5' }}>
              {message.content}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
})

MessageBubble.displayName = 'MessageBubble'

// Typing indicator component
const TypingIndicator = React.memo(() => {
  const { t } = useTranslation()
  
  return (
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
      role="status"
      aria-label={t('grammarBreakdown.typing')}
    >
      <motion.div 
        className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden shadow-lg"
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
        <img 
          src="/avatar-komi.png" 
          alt="Komi"
          className="w-full h-full object-cover"
        />
      </motion.div>
      <motion.div 
        className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-md"
        animate={{ scale: [1, 1.02, 1] }}
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
                aria-hidden="true"
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
            {t('grammarBreakdown.typing')}
          </motion.span>
        </div>
      </motion.div>
    </motion.div>
  )
})

TypingIndicator.displayName = 'TypingIndicator'

// Error boundary component
class ExplainErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ExplainInterface error:', error, errorInfo)
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-96 px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Something went wrong. Please try refreshing the page.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

// Main component
export const ExplainInterface = React.forwardRef<ExplainInterfaceRef, ExplainInterfaceProps>(
  ({ selectedText, sentence, isWholeSentence, mangaId }, ref) => {
    const { t } = useTranslation()
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    
    // State management with reducer
    const [state, dispatch] = useReducer(explainReducer, {
      messages: [],
      isLoading: false,
      isTyping: false,
      scrollState: { isAtBottom: true, userScrolled: false },
      error: null
    })

    // Custom hooks
    const { 
      messagesEndRef, 
      scrollToBottom, 
      handleScroll, 
      resetScrollIntent,
      userScrollIntentRef 
    } = useScrollManager(messagesContainerRef)
    
    const { streamChat, cancelRequest } = useStreamingChat()

    // Memoized values
    const currentLanguage = useMemo(() => 
      localStorage.getItem('i18nextLng') || 'en', []
    )

    const initialMessage = useMemo(() => 
      isWholeSentence 
        ? t('grammarBreakdown.initialMessages.wholeSentence', { sentence })
        : t('grammarBreakdown.initialMessages.partialSelection', { selectedText, sentence }),
      [isWholeSentence, sentence, selectedText, t]
    )

    // Scroll handling
    const handleScrollEvent = useCallback(() => {
      const scrollState = handleScroll()
      if (scrollState) {
        dispatch({ 
          type: 'UPDATE_SCROLL_STATE', 
          payload: scrollState 
        })
      }
    }, [handleScroll])

    useEffect(() => {
      const container = messagesContainerRef.current
      if (!container) return

      const handleUserInteraction = () => {
        userScrollIntentRef.current = true
      }
      
      container.addEventListener('scroll', handleScrollEvent, { passive: true })
      container.addEventListener('touchmove', handleUserInteraction, { passive: true })
      container.addEventListener('wheel', handleUserInteraction, { passive: true })
      
      return () => {
        container.removeEventListener('scroll', handleScrollEvent)
        container.removeEventListener('touchmove', handleUserInteraction)
        container.removeEventListener('wheel', handleUserInteraction)
      }
    }, [handleScrollEvent, userScrollIntentRef])

    // Auto-scroll logic
    useEffect(() => {
      if (state.scrollState.isAtBottom && !userScrollIntentRef.current) {
        scrollToBottom()
      }
    }, [state.messages, state.scrollState.isAtBottom, scrollToBottom, userScrollIntentRef])

    // Reset scroll intent when not loading
    useEffect(() => {
      if (!state.isLoading && !state.isTyping && state.scrollState.isAtBottom) {
        resetScrollIntent()
        dispatch({ 
          type: 'UPDATE_SCROLL_STATE', 
          payload: { userScrolled: false }
        })
      }
    }, [state.isLoading, state.isTyping, state.scrollState.isAtBottom, resetScrollIntent])

    // Message sending logic
    const handleSendMessage = useCallback(async (content: string) => {
      if (!content.trim() || state.isLoading) return

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim()
      }

      const assistantId = `assistant-${Date.now()}`
      
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage })
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_TYPING', payload: true })

      const payload = {
        messages: [...state.messages, userMessage].map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        selectedText,
        sentence,
        isWholeSentence,
        language: currentLanguage,
        mangaId
      }

      await streamChat(
        payload,
        // onStart
        () => {
          dispatch({ type: 'SET_TYPING', payload: false })
          dispatch({ 
            type: 'ADD_MESSAGE', 
            payload: {
              id: assistantId,
              role: 'assistant',
              content: '',
              isStreaming: true
            }
          })
        },
        // onToken
        (content: string) => {
          dispatch({ 
            type: 'UPDATE_MESSAGE', 
            payload: { id: assistantId, content }
          })
        },
        // onComplete
        () => {
          dispatch({ type: 'COMPLETE_MESSAGE', payload: assistantId })
        },
        // onError
        (error: string) => {
          dispatch({ type: 'SET_ERROR', payload: error })
          dispatch({ 
            type: 'ADD_MESSAGE', 
            payload: {
              id: assistantId,
              role: 'assistant',
              content: `Sorry, I encountered an error: ${error}. Please try again.`,
              error: true
            }
          })
          dispatch({ type: 'COMPLETE_MESSAGE', payload: assistantId })
        }
      )
    }, [state.messages, state.isLoading, selectedText, sentence, isWholeSentence, currentLanguage, mangaId, streamChat])

    // Expose API to parent
    React.useImperativeHandle(ref, () => ({
      sendMessage: handleSendMessage
    }), [handleSendMessage])

    // Send initial message
    useEffect(() => {
      const timer = setTimeout(() => {
        handleSendMessage(initialMessage)
      }, 100)
      return () => clearTimeout(timer)
    }, []) // Only run once on mount

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        cancelRequest()
      }
    }, [cancelRequest])

    return (
      <ExplainErrorBoundary 
        onError={(error) => dispatch({ type: 'SET_ERROR', payload: error.message })}
      >
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 pt-20 pb-4 space-y-6"
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
        >
          {state.messages.map((message, index) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              index={index} 
            />
          ))}
          
          <AnimatePresence>
            {state.isTyping && <TypingIndicator />}
          </AnimatePresence>
          
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
      </ExplainErrorBoundary>
    )
  }
)

ExplainInterface.displayName = 'ExplainInterface'