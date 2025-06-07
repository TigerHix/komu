import React, { useState, useRef, useCallback } from 'react'
import { Copy, ArrowLeft, Sparkles } from 'lucide-react'
import { Sheet, Header, Content, Footer, Portal, detents } from 'react-sheet-slide'
import type { SheetRef } from 'react-sheet-slide'
import { Button } from '@/components/ui/button'
import { useDarkMode } from '@/hooks/useDarkMode'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useWordSelection } from '@/hooks/useWordSelection'
import { GrammarToken } from '@/utils/grammarAnalysis'
import { getSelectedText } from '@/utils/posUtils'
import { copyToClipboard } from '@/utils/clipboard'
import { SentenceDisplay } from './SentenceDisplay'
import { TokenDetails, EmptySelection } from './TokenDetails'
import { ExplainInterface, ExplainInterfaceRef } from './ExplainInterface'
import { EditTextModal } from './EditTextModal'
import { useTranslation } from 'react-i18next'
import 'react-sheet-slide/style.css'

// ChatInput component matching the design from the images
interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (message: string) => void
  placeholder?: string
}

function ChatInput({ value, onChange, onSend, placeholder }: ChatInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) {
        onSend(value.trim())
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    setIsTyping(true)
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
    // Reset typing state after a short delay
    setTimeout(() => setIsTyping(false), 150)
  }

  const handleSendClick = () => {
    if (value.trim()) {
      onSend(value.trim())
      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  // Reset height when value is cleared
  React.useEffect(() => {
    if (!value && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value])

  return (
    <div className="relative">
      {/* Outer glow when focused */}
      {isFocused && (
        <motion.div 
          className="absolute inset-0 rounded-2xl blur-lg scale-110"
          style={{ backgroundColor: 'hsl(74 26% 45% / 0.2)' }}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ 
            opacity: isTyping ? [0.3, 0.6, 0.3] : 0.3,
            scale: isTyping ? [1.1, 1.15, 1.1] : 1.1
          }}
          transition={{
            duration: isTyping ? 0.3 : 0.2,
            ease: "easeOut"
          }}
        />
      )}
      
      {/* 3D thickness base layer - stays in place to create depth illusion */}
      <div className="absolute top-0 left-0 w-full h-full rounded-2xl bg-gray-400 dark:bg-gray-600">
        {/* Flowing lava effect when focused */}
        {isFocused && (
          <motion.div 
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(45deg, hsl(74 26% 45%), hsl(74 26% 35%), hsl(74 26% 50%), hsl(74 26% 40%), hsl(74 26% 45%))',
              backgroundSize: '400% 400%',
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{
              duration: 15,
              ease: "easeInOut",
              repeat: Infinity
            }}
          />
        )}
      </div>
      
      {/* Main input container - gets elevated when focused */}
      <div className={`relative rounded-2xl bg-gray-300 dark:bg-gray-600 transition-all duration-300 ${
        isFocused 
          ? 'transform translate-y-[-4px] z-20' 
          : 'z-10'
      }`}>
        <div className="relative flex items-end">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent px-4 py-3 pr-12 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none text-base overflow-hidden"
            style={{ 
              minHeight: '50px', 
              maxHeight: '120px',
            }}
          />

          {/* Send button - positioned absolutely at bottom right */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSendClick}
            disabled={!value.trim()}
            className="absolute bottom-2 right-2 p-2 bg-accent text-accent-foreground rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  )
}

interface GrammarBreakdownProps {
  isOpen: boolean
  onClose: () => void
  tokens: GrammarToken[]
  loading?: boolean
  onSheetExpansionChange?: (progress: number) => void
  originalText: string
  textBlockId?: string
  onTextUpdate?: (newText: string) => void
  selectedBlock?: any
  imagePath?: string
  imageSize?: { width: number; height: number }
  onEditingStateChange?: (isEditing: boolean) => void
  onRefetchTextBlocks?: (newText: string, textBlockId?: string) => void
  mangaId?: string
}

export function GrammarBreakdown({ 
  isOpen, 
  onClose, 
  tokens, 
  loading = false, 
  onSheetExpansionChange, 
  originalText = '', 
  textBlockId, 
  onTextUpdate, 
  selectedBlock, 
  imagePath, 
  imageSize, 
  onEditingStateChange, 
  onRefetchTextBlocks,
  mangaId
}: GrammarBreakdownProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  
  // Explain feature state
  const [isExplaining, setIsExplaining] = useState(false)
  const [explainContext, setExplainContext] = useState<{
    selectedText: string
    sentence: string
    isWholeSentence: boolean
  } | null>(null)
  const [chatInputValue, setChatInputValue] = useState('')
  
  // Store context before closing sheet
  const [editingContext, setEditingContext] = useState<{
    originalText: string
    textBlockId: string | undefined
    selectedBlock: any
    imagePath: string | undefined
    imageSize: { width: number; height: number } | undefined
  } | null>(null)
  
  const { isDarkMode } = useDarkMode()
  const ref = useRef<SheetRef>(null)
  const explainRef = useRef<ExplainInterfaceRef>(null)
  
  // Use the word selection hook
  const {
    selectedTokenIndex,
    setSelectedTokenIndex,
    selectionStart,
    selectionEnd,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    clearSelection,
    hasSelection,
    getSelectionType
  } = useWordSelection()

  // Reset selected token when sheet closes or tokens change
  const handleClose = () => {
    clearSelection()
    setIsEditing(false)
    setIsExplaining(false)
    setExplainContext(null)
    onClose()
  }

  // Handle explain button click
  const handleExplainClick = useCallback(() => {
    let selectedText = ''
    let isWholeSentence = false
    
    if (selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd) {
      // Multi-word selection
      selectedText = getSelectedText(selectionStart, selectionEnd, tokens)
      // Check if the selection covers all tokens (whole sentence)
      isWholeSentence = selectionStart === 0 && selectionEnd === tokens.length - 1
    } else if (selectedTokenIndex !== null && tokens[selectedTokenIndex]) {
      // Single word selection
      selectedText = tokens[selectedTokenIndex].word
      isWholeSentence = false
    }
    
    if (selectedText) {
      setExplainContext({
        selectedText,
        sentence: originalText,
        isWholeSentence
      })
      setIsExplaining(true)
      
      // Set detent to large when entering explain mode
      if (ref.current?.setDetent) {
        ref.current.setDetent('large')
      }
    }
  }, [selectionStart, selectionEnd, selectedTokenIndex, tokens, originalText])

  // Handle back from explain to breakdown
  const handleBackFromExplain = useCallback(() => {
    setIsExplaining(false)
    setExplainContext(null)
  }, [])

  // Reset selected token when tokens change
  React.useEffect(() => {
    clearSelection()
  }, [tokens, originalText, clearSelection])

  // Handle OCR text editing
  const handleEditClick = useCallback(() => {
    // Store current context before editing
    setEditingContext({
      originalText,
      textBlockId,
      selectedBlock,
      imagePath,
      imageSize
    })
    
    // Don't close the grammar breakdown sheet, just open the edit modal
    // The grammar breakdown sheet will be hidden via CSS when isEditing is true
    setIsEditing(true)
    onEditingStateChange?.(true) // Notify parent that editing started
  }, [originalText, textBlockId, selectedBlock, imagePath, imageSize, onEditingStateChange])

  const handleSaveEdit = useCallback(async (editedText: string) => {
    const contextToUse = editingContext || { originalText, textBlockId, selectedBlock, imagePath, imageSize }
    
    if (!contextToUse.textBlockId || !onTextUpdate) {
      return
    }

    // Update the text block in the database
    const response = await fetch(`/api/text-blocks/${contextToUse.textBlockId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: editedText })
    })

    if (response.ok) {
      // Update the text and trigger re-analysis with new text
      onTextUpdate(editedText)
      
      // Close editing mode and clear context - keep grammar breakdown open
      setIsEditing(false)
      onEditingStateChange?.(false) // Notify parent that editing ended
      setEditingContext(null) // Clear context
      
      // Trigger refetch of text blocks for the current page
      onRefetchTextBlocks?.(editedText, contextToUse.textBlockId)
      
      // Show success feedback
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } else {
      throw new Error('Failed to update text block')
    }
  }, [editingContext, originalText, textBlockId, selectedBlock, imagePath, imageSize, onTextUpdate, onEditingStateChange, onRefetchTextBlocks])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    onEditingStateChange?.(false) // Notify parent that editing ended
    setEditingContext(null) // Clear context
  }, [onEditingStateChange])

  // Handle real-time sheet position changes
  const handlePositionChange = React.useCallback((data: { progress: number }) => {
    // Call expansion change callback with progress value for smooth fading
    // Pass the actual progress (0-1) instead of just boolean
    onSheetExpansionChange?.(data.progress)
  }, [onSheetExpansionChange])

  // Handle detent changes (for debugging if needed)
  const handleDetentChange = React.useCallback((detent: string) => {
  }, [])

  return (
    <>
      {/* Grammar Breakdown Sheet */}
      {!isEditing && (
        <Portal containerRef="#grammar-breakdown-portal">
          <Sheet
            ref={ref}
            open={isOpen}
            onDismiss={handleClose}
            selectedDetent={detents.medium}
            detents={(props) => [detents.medium(props), detents.large(props)]}
            useModal={false}
            useDarkMode={isDarkMode}
            backdropClassName='grammar-breakdown-backdrop'
            onPositionChange={handlePositionChange}
            onDetentChange={handleDetentChange}
          >
          <Header>
            <motion.div 
              className="flex items-center gap-3"
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {isExplaining && (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  onClick={handleBackFromExplain}
                  className="p-1 text-text-secondary hover:text-accent rounded transition-colors duration-200"
                  aria-label="Back to breakdown"
                >
                  <ArrowLeft className="h-5 w-5" />
                </motion.button>
              )}
              <motion.p 
                className="apple-headline font-semibold text-text-primary" 
                style={{ lineHeight: '2rem' }}
                layout
              >
                {isExplaining ? t('grammarBreakdown.chatTitle') : t('grammarBreakdown.title')}
              </motion.p>
            </motion.div>
          </Header>

          <Content>
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-accent mb-4" />
                <span className="text-text-secondary text-md">{t('grammarBreakdown.analyzing')}</span>
              </div>
            ) : isExplaining && explainContext ? (
              <motion.div
                key="explain-view"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="h-full flex flex-col"
              >
                <ExplainInterface 
                  ref={explainRef}
                  selectedText={explainContext.selectedText}
                  sentence={explainContext.sentence}
                  isWholeSentence={explainContext.isWholeSentence}
                  mangaId={mangaId}
                />
              </motion.div>
            ) : (
              <motion.div
                key="breakdown-view"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {/* Original Sentence with Furigana */}
                <div className="py-10" />
                <SentenceDisplay
                  tokens={tokens}
                  selectedTokenIndex={selectedTokenIndex}
                  selectionStart={selectionStart}
                  selectionEnd={selectionEnd}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onEditClick={handleEditClick}
                  showEditButton={!!(textBlockId && onTextUpdate)}
                />

                {/* Selected Word Details */}
                <div className="px-6 py-4 pt-0">
                  {selectedTokenIndex !== null && selectedTokenIndex < tokens.length && tokens[selectedTokenIndex] ? (
                    <TokenDetails token={tokens[selectedTokenIndex]} />
                  ) : (
                    <EmptySelection />
                  )}
                </div>
              </motion.div>
            )}
          </Content>
          
          <Footer className="p-4 border-border pwa-safe-bottom">
            {isExplaining ? (
              <motion.div 
                className="w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <ChatInput
                  value={chatInputValue}
                  onChange={setChatInputValue}
                  onSend={(message) => {
                    if (explainRef.current) {
                      explainRef.current.sendMessage(message)
                      setChatInputValue('')
                    }
                  }}
                  placeholder={t('grammarBreakdown.message')}
                />
              </motion.div>
            ) : (
              <>
              {/* Action Buttons - for both single words and multi-word selections */}
              {hasSelection() && (
            <div className="mb-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="flex gap-3"
              >
                {/* Copy Selected Button */}
                <Button
                  onClick={async () => {
                    let copyText = ''
                    if (getSelectionType() === 'multi') {
                      copyText = getSelectedText(selectionStart, selectionEnd, tokens)
                    } else if (getSelectionType() === 'single' && selectedTokenIndex !== null) {
                      copyText = tokens[selectedTokenIndex].word
                    }
                    if (copyText) {
                      const success = await copyToClipboard(copyText)
                      if (success) {
                        if (navigator.vibrate) {
                          navigator.vibrate(50)
                        }
                        toast.success(t('notifications.copiedToClipboard'), {
                          description: copyText,
                          duration: 2000,
                        })
                      } else {
                        toast.error('Copy failed', {
                          description: 'Unable to copy text to clipboard',
                          duration: 2000,
                        })
                      }
                    }
                  }}
                  className="flex-1 bg-white dark:bg-gray-600 text-black dark:text-white border-0 hover:bg-gray-50 dark:hover:bg-gray-500 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {t('grammarBreakdown.copy')}
                </Button>
                
                {/* Search Selected Button */}
                <Button
                  onClick={() => {
                    let searchText = ''
                    if (getSelectionType() === 'multi') {
                      searchText = getSelectedText(selectionStart, selectionEnd, tokens)
                    } else if (getSelectionType() === 'single' && selectedTokenIndex !== null) {
                      searchText = tokens[selectedTokenIndex].word
                    }
                    if (searchText) {
                      window.open(`https://www.google.com/search?q=${encodeURIComponent(searchText)}`, '_blank')
                    }
                  }}
                  className="flex-1 bg-white dark:bg-gray-600 text-black dark:text-white border-0 hover:bg-gray-50 dark:hover:bg-gray-500 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t('grammarBreakdown.search')}
                </Button>
                
                {/* Explain Button */}
                <Button
                  onClick={handleExplainClick}
                  className="flex-1 bg-white dark:bg-gray-600 text-black dark:text-white border-0 hover:bg-gray-50 dark:hover:bg-gray-500 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {t('grammarBreakdown.askKomi')}
                </Button>
              </motion.div>
            </div>
              )}
              
              {/* Explain Whole Sentence Button - shown when no selection */}
              {!hasSelection() && (
                <div className="mb-3">
                  <Button
                    onClick={() => {
                      setExplainContext({
                        selectedText: originalText,
                        sentence: originalText,
                        isWholeSentence: true
                      })
                      setIsExplaining(true)
                      
                      // Set detent to large when entering explain mode
                      if (ref.current?.setDetent) {
                        ref.current.setDetent('large')
                      }
                    }}
                    className="w-full bg-white dark:bg-gray-600 text-black dark:text-white border-0 hover:bg-gray-50 dark:hover:bg-gray-500 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('grammarBreakdown.explainWholeSentence')}
                  </Button>
                </div>
              )}
              
              <Button 
                onClick={handleClose}
                className="w-full bg-accent hover:bg-accent/90 text-white border-0"
              >
                {t('grammarBreakdown.close')}
              </Button>
              </>
            )}
          </Footer>
          </Sheet>
        </Portal>
      )}

      {/* Edit Modal */}
      <EditTextModal
        isOpen={isEditing}
        editContext={editingContext}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
      />
    </>
  )
}

export default GrammarBreakdown