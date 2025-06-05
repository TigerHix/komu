import React from 'react'
import { motion } from 'framer-motion'
import { Edit2 } from 'lucide-react'
import { GrammarToken } from '@/utils/posUtils'
import { getWordClasses } from '@/utils/posStyles'
import { isWordInSelection } from '@/utils/posUtils'

interface SentenceDisplayProps {
  tokens: GrammarToken[]
  selectedTokenIndex: number | null
  selectionStart: number | null
  selectionEnd: number | null
  onPointerDown: (index: number) => void
  onPointerMove: (index: number) => void
  onPointerUp: (index: number) => void
  onEditClick?: () => void
  showEditButton?: boolean
}

export function SentenceDisplay({
  tokens,
  selectedTokenIndex,
  selectionStart,
  selectionEnd,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onEditClick,
  showEditButton = false
}: SentenceDisplayProps) {
  return (
    <div className="px-6">
      <div className="relative">
        <div 
          className="text-2xl text-text-primary font-medium"
          style={{ lineHeight: '4rem' }}
        >
          {tokens.map((token, index) => (
            <span key={index} className="relative inline-block group pb-2 mr-0.5" style={{ lineHeight: '3rem' }}>
              {/* Furigana */}
              {token.reading && token.reading !== token.word && (
                <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-xs text-text-secondary whitespace-nowrap pointer-events-none select-none z-20">
                  {token.reading}
                </span>
              )}
              
              {/* Word */}
              <span 
                className={`cursor-pointer transition-all duration-200 rounded px-0.5 py-0 relative border-2 select-none ${getWordClasses(
                  token.partOfSpeech, 
                  selectedTokenIndex === index,
                  isWordInSelection(index, selectionStart, selectionEnd)
                )}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onPointerDown(index)
                }}
                onMouseEnter={() => {
                  onPointerMove(index)
                }}
                onMouseUp={() => {
                  onPointerUp(index)
                }}
                onTouchStart={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onPointerDown(index)
                }}
                onTouchMove={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  // Get the touch position and find which word it's over
                  const touch = e.touches[0]
                  const element = document.elementFromPoint(touch.clientX, touch.clientY)
                  const wordElement = element?.closest('[data-word-index]')
                  if (wordElement) {
                    const wordIndex = parseInt(wordElement.getAttribute('data-word-index') || '0')
                    onPointerMove(wordIndex)
                  }
                }}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onPointerUp(index)
                }}
                data-word-index={index}
              >
                {token.word}
              </span>
            </span>
          ))}
          
          {/* Edit button */}
          {showEditButton && onEditClick && (
            <span className="relative inline-block pb-2 ml-2" style={{ lineHeight: '3rem' }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <button
                  onClick={onEditClick}
                  className="p-1 text-text-secondary hover:text-accent rounded transition-colors duration-200"
                  aria-label="Edit OCR text"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </motion.div>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}