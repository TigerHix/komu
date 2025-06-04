import React, { useState, useRef } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { Sheet, Header, Content, Footer, Portal, detents } from 'react-sheet-slide'
import { Button } from '@/components/ui/button'
import { PartOfSpeechCategory, PartOfSpeechCategoryMap, PartOfSpeech, PartOfSpeechLabels } from '@/utils/grammarAnalysis'
import { useDarkMode } from '@/hooks/useDarkMode'
import 'react-sheet-slide/style.css'

interface GrammarToken {
  word: string
  reading: string
  meaning: string[]
  partOfSpeech: string[]
  conjugation?: string
  isHighlighted?: boolean
  alternatives?: Array<{
    reading: string
    meaning: string[]
  }>
  compound?: {
    parts: string[]
    components: Array<{
      word: string
      reading: string
      meaning: string[]
      partOfSpeech: string[]
      conjugation: string[]
    }>
  }
}

interface GrammarBreakdownProps {
  isOpen: boolean
  onClose: () => void
  tokens: GrammarToken[]
  loading?: boolean
}

// Clean POS styling system with dark mode support
const POS_STYLES = {
  [PartOfSpeechCategory.NOUN]: {
    full: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
    light: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    background: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    tag: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30'
  },
  [PartOfSpeechCategory.VERB]: {
    full: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30',
    light: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    background: 'bg-green-50 dark:bg-green-500/10',
    border: 'border-green-200 dark:border-green-500/30',
    tag: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30'
  },
  [PartOfSpeechCategory.ADJECTIVE]: {
    full: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
    light: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
    background: 'bg-purple-50 dark:bg-purple-500/10',
    border: 'border-purple-200 dark:border-purple-500/30',
    tag: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30'
  },
  [PartOfSpeechCategory.ADVERB]: {
    full: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    light: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    background: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    tag: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
  },
  [PartOfSpeechCategory.PARTICLE]: {
    full: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30',
    light: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
    background: 'bg-slate-50 dark:bg-slate-500/10',
    border: 'border-slate-200 dark:border-slate-500/30',
    tag: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30'
  },
  [PartOfSpeechCategory.PRONOUN]: {
    full: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
    light: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    background: 'bg-indigo-50 dark:bg-indigo-500/10',
    border: 'border-indigo-200 dark:border-indigo-500/30',
    tag: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30'
  },
  [PartOfSpeechCategory.CONJUNCTION]: {
    full: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
    light: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    background: 'bg-rose-50 dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/30',
    tag: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
  },
  [PartOfSpeechCategory.COPULA]: {
    full: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/30',
    light: 'bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20',
    background: 'bg-pink-50 dark:bg-pink-500/10',
    border: 'border-pink-200 dark:border-pink-500/30',
    tag: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/30'
  },
  [PartOfSpeechCategory.INTERJECTION]: {
    full: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
    light: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
    background: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/30',
    tag: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30'
  },
  [PartOfSpeechCategory.AUXILIARY]: {
    full: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30',
    light: 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20',
    background: 'bg-teal-50 dark:bg-teal-500/10',
    border: 'border-teal-200 dark:border-teal-500/30',
    tag: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30'
  },
  [PartOfSpeechCategory.COUNTER]: {
    full: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
    light: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    background: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30',
    tag: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30'
  },
  [PartOfSpeechCategory.EXPRESSION]: {
    full: 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-500/15 dark:text-lime-300 dark:border-lime-500/30',
    light: 'bg-lime-50 text-lime-600 border-lime-200 dark:bg-lime-500/10 dark:text-lime-400 dark:border-lime-500/20',
    background: 'bg-lime-50 dark:bg-lime-500/10',
    border: 'border-lime-200 dark:border-lime-500/30',
    tag: 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-500/15 dark:text-lime-300 dark:border-lime-500/30'
  },
  [PartOfSpeechCategory.NUMERIC]: {
    full: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30',
    light: 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
    background: 'bg-cyan-50 dark:bg-cyan-500/10',
    border: 'border-cyan-200 dark:border-cyan-500/30',
    tag: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30'
  },
  [PartOfSpeechCategory.PREFIX_SUFFIX]: {
    full: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
    light: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
    background: 'bg-violet-50 dark:bg-violet-500/10',
    border: 'border-violet-200 dark:border-violet-500/30',
    tag: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30'
  },
  [PartOfSpeechCategory.UNKNOWN]: {
    full: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/30',
    light: 'bg-gray-50 text-gray-500 border-gray-300 dark:bg-gray-500/10 dark:text-gray-500 dark:border-gray-500/20',
    background: 'bg-gray-50 dark:bg-gray-500/10',
    border: 'border-gray-300 dark:border-gray-500/30',
    tag: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/30'
  },
  [PartOfSpeechCategory.OTHER]: {
    full: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30',
    light: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
    background: 'bg-slate-50 dark:bg-slate-500/10',
    border: 'border-slate-200 dark:border-slate-500/30',
    tag: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30'
  },
  [PartOfSpeechCategory.PUNCTUATION]: {
    full: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/30',
    light: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-500/10 dark:text-gray-500 dark:border-gray-500/20',
    background: 'bg-gray-50 dark:bg-gray-500/10',
    border: 'border-gray-200 dark:border-gray-500/30',
    tag: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/30'
  },
} as const

// Get POS category from string array
const getPOSCategory = (pos: string[]): PartOfSpeechCategory => {
  if (!pos || pos.length === 0) return PartOfSpeechCategory.OTHER
  
  const firstPos = pos[0]
  
  // Check enum mapping first
  for (const [posEnum, label] of Object.entries(PartOfSpeechLabels)) {
    if (label === firstPos) {
      return PartOfSpeechCategoryMap[posEnum as PartOfSpeech]
    }
  }
  
  // Fallback string matching
  const posStr = firstPos.toLowerCase()
  if (posStr === 'unknown') return PartOfSpeechCategory.UNKNOWN
  if (posStr === 'punctuation') return PartOfSpeechCategory.PUNCTUATION
  if (posStr.includes('noun') || posStr.includes('n')) return PartOfSpeechCategory.NOUN
  if (posStr.includes('verb') || posStr.includes('v')) return PartOfSpeechCategory.VERB
  if (posStr.includes('adj')) return PartOfSpeechCategory.ADJECTIVE
  if (posStr.includes('adv')) return PartOfSpeechCategory.ADVERB
  if (posStr.includes('prt') || posStr.includes('particle')) return PartOfSpeechCategory.PARTICLE
  if (posStr.includes('pron')) return PartOfSpeechCategory.PRONOUN
  if (posStr.includes('conj')) return PartOfSpeechCategory.CONJUNCTION
  if (posStr.includes('cop')) return PartOfSpeechCategory.COPULA
  if (posStr.includes('int')) return PartOfSpeechCategory.INTERJECTION
  if (posStr.includes('aux')) return PartOfSpeechCategory.AUXILIARY
  
  return PartOfSpeechCategory.OTHER
}

// Get POS styles from category
const getPOSStyles = (pos: string[]) => {
  const category = getPOSCategory(pos)
  return POS_STYLES[category]
}

// Word styling helpers
const getWordClasses = (pos: string[], isSelected: boolean) => {
  const styles = getPOSStyles(pos)
  return isSelected 
    ? `${styles.full} !${styles.border}`
    : `${styles.light} !border-transparent hover:${styles.full}`
}

// Word click handler
const handleWordClick = (e: React.MouseEvent, index: number, selectedIndex: number | null, setSelected: (index: number | null) => void) => {
  if (window.getSelection()?.toString() === '') {
    setSelected(index === selectedIndex ? null : index)
  }
}

export function GrammarBreakdown({ isOpen, onClose, tokens, loading = false }: GrammarBreakdownProps) {
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null)
  const { isDarkMode } = useDarkMode()
  const ref = useRef()

  // Reset selected token when sheet closes or tokens change
  const handleClose = () => {
    setSelectedTokenIndex(null)
    onClose()
  }

  // Reset selected token when tokens change
  React.useEffect(() => {
    setSelectedTokenIndex(null)
  }, [tokens])

  return (
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
      >
        <Header>
          <p className="text-text-primary text-md font-medium" style={{ lineHeight: '2rem' }}>Sentence Breakdown</p>
        </Header>

        <Content>
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-accent mb-4" />
              <span className="text-text-secondary text-md">Analyzing...</span>
            </div>
          ) : (
            <>
              {/* Original Sentence with Furigana */}
              <div className="py-8" />
              <div className="px-6">
                <div className="relative">
                  <div 
                    className="text-2xl text-text-primary font-medium select-text"
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
                          className={`cursor-pointer transition-all duration-200 rounded px-0.5 py-0 select-text relative border-2 ${getWordClasses(token.partOfSpeech, selectedTokenIndex === index)}`}
                          onClick={(e) => handleWordClick(e, index, selectedTokenIndex, setSelectedTokenIndex)}
                        >
                          {token.word}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selected Word Details */}
              <div className="px-6 py-4 pt-0">
                {selectedTokenIndex !== null && selectedTokenIndex < tokens.length && tokens[selectedTokenIndex] ? (
                  <div>
                    {(() => {
                      const token = tokens[selectedTokenIndex]
                      if (!token) return null
                      return (
                        <div className={`p-4 pb-2 rounded-xl border-2 shadow-md ${getPOSStyles(token.partOfSpeech).border} ${getPOSStyles(token.partOfSpeech).background}`}>

                          {/* Part of Speech Tags */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {token.partOfSpeech.map((pos, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-1 text-xs font-medium rounded-md border select-pos ${getPOSStyles([pos]).tag}`}
                              >
                                {pos}
                              </span>
                            ))}
                          </div>

                          {/* Compound Word Structure */}
                          {token.compound && (
                            <div className="mb-3">
                              <div className="text-xs font-medium text-text-secondary mb-2">Compound Word</div>
                              <div className="bg-surface-1 rounded-lg p-3 border border-border">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-sm font-medium text-text-primary">Structure:</span>
                                  {token.compound.parts.map((part, idx) => (
                                    <span key={idx} className="inline-flex items-center">
                                      <span className="bg-primary/10 text-primary text-sm px-2 py-1 rounded">{part}</span>
                                      {idx < token.compound.parts.length - 1 && <span className="mx-1 text-text-tertiary">+</span>}
                                    </span>
                                  ))}
                                </div>
                                <div className="space-y-3">
                                  {token.compound.components.map((component, idx) => (
                                    <div key={idx} className="border-l-4 border-primary/20 pl-3">
                                      <div className="flex items-start gap-2 mb-1">
                                        <span className="font-medium text-primary">{component.word}</span>
                                        {component.reading && (
                                          <span className="text-xs text-text-tertiary">【{component.reading}】</span>
                                        )}
                                      </div>
                                      {component.conjugation.length > 0 && (
                                        <div className="text-xs text-accent mb-1">
                                          {component.conjugation.join(', ')}
                                        </div>
                                      )}
                                      {component.partOfSpeech.length > 0 && (
                                        <div className="text-xs text-text-tertiary mb-2">
                                          {component.partOfSpeech.join(', ')}
                                        </div>
                                      )}
                                      {component.meaning.length > 0 && (
                                        <div className="space-y-1">
                                          {component.meaning.map((meaning, mIdx) => (
                                            <div key={mIdx} className="text-sm text-text-primary select-definition">
                                              • {meaning}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Meanings - hide for punctuation and compound words */}
                          {!token.compound && token.meaning.length > 0 && getPOSCategory(token.partOfSpeech) !== PartOfSpeechCategory.PUNCTUATION ? (
                            <div className="mb-3">
                              {token.meaning.map((meaning, idx) => (
                                <div key={idx} className="text-text-primary mb-2 p-2 bg-surface-1 rounded-lg select-definition">
                                  <span className="font-medium text-primary">{idx + 1}.</span> {meaning}
                                </div>
                              ))}
                            </div>
                          ) : !token.compound && getPOSCategory(token.partOfSpeech) !== PartOfSpeechCategory.PUNCTUATION ? (
                            /* Google Search Button for unknown words - hide for punctuation */
                            <div className="mb-3">
                              <button
                                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(token.word)}`, '_blank')}
                                className="w-full px-3 py-2 bg-surface-2 hover:bg-surface-3 text-text-primary text-sm rounded-lg border border-border transition-colors duration-200 flex items-center justify-center gap-2"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Search "{token.word}" on Google
                              </button>
                            </div>
                          ) : null}

                          {/* Conjugation Info */}
                          {token.conjugation && token.conjugation.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-medium text-text-secondary mb-1">Conjugation</div>
                              <div className="flex flex-wrap gap-1">
                                {token.conjugation.map((conj, idx) => (
                                  <div key={idx} className="text-sm text-accent bg-accent/10 px-2 py-1 rounded">
                                    {conj}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Alternative Readings/Meanings */}
                          {token.alternatives && token.alternatives.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-text-secondary mb-1">Alternative Meanings</div>
                              {token.alternatives.map((alt, idx) => (
                                <div key={idx} className="mb-2 p-2 bg-surface-1 rounded border border-border">
                                  {alt.reading && (
                                    <div className="text-xs text-text-tertiary mb-1">{alt.reading}</div>
                                  )}
                                  {alt.meaning.map((meaning, mIdx) => (
                                    <div key={mIdx} className="text-sm text-text-primary select-definition">
                                      • {meaning}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-text-secondary mb-2">Click on any word above to see its definition</div>
                    <div className="text-sm text-text-tertiary">Words are colored by their part of speech</div>
                  </div>
                )}
              </div>
            </>
          )}
        </Content>
        
        <Footer className="p-4 border-border pwa-safe-bottom">
          <Button 
            onClick={handleClose}
            className="w-full bg-accent hover:bg-accent/90 text-white border-0"
          >
            Close
          </Button>
        </Footer>
      </Sheet>
    </Portal>
  )
}

export default GrammarBreakdown