import React, { useState, useRef } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { Sheet, Header, Content, Footer, Portal, detents } from 'react-sheet-slide'
import { Button } from '@/components/ui/button'
import { PartOfSpeechCategory, PartOfSpeechCategoryMap, PartOfSpeech, PartOfSpeechLabels } from '@/utils/grammarAnalysis'
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

// Clean POS styling system with explicit Tailwind classes
const POS_STYLES = {
  [PartOfSpeechCategory.NOUN]: {
    full: 'bg-blue-100 text-blue-800 border-blue-200',
    light: 'bg-blue-50 text-blue-600 border-blue-200',
    background: 'bg-blue-50',
    border: 'border-blue-200',
    tag: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  [PartOfSpeechCategory.VERB]: {
    full: 'bg-green-100 text-green-800 border-green-200',
    light: 'bg-green-50 text-green-600 border-green-200',
    background: 'bg-green-50',
    border: 'border-green-200',
    tag: 'bg-green-100 text-green-800 border-green-200'
  },
  [PartOfSpeechCategory.ADJECTIVE]: {
    full: 'bg-purple-100 text-purple-800 border-purple-200',
    light: 'bg-purple-50 text-purple-600 border-purple-200',
    background: 'bg-purple-50',
    border: 'border-purple-200',
    tag: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  [PartOfSpeechCategory.ADVERB]: {
    full: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    light: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    background: 'bg-yellow-50',
    border: 'border-yellow-200',
    tag: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  [PartOfSpeechCategory.PARTICLE]: {
    full: 'bg-gray-100 text-gray-800 border-gray-200',
    light: 'bg-gray-50 text-gray-600 border-gray-200',
    background: 'bg-gray-50',
    border: 'border-gray-200',
    tag: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  [PartOfSpeechCategory.PRONOUN]: {
    full: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    light: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    background: 'bg-indigo-50',
    border: 'border-indigo-200',
    tag: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  [PartOfSpeechCategory.CONJUNCTION]: {
    full: 'bg-rose-100 text-rose-800 border-rose-200',
    light: 'bg-rose-50 text-rose-600 border-rose-200',
    background: 'bg-rose-50',
    border: 'border-rose-200',
    tag: 'bg-rose-100 text-rose-800 border-rose-200'
  },
  [PartOfSpeechCategory.COPULA]: {
    full: 'bg-pink-100 text-pink-800 border-pink-200',
    light: 'bg-pink-50 text-pink-600 border-pink-200',
    background: 'bg-pink-50',
    border: 'border-pink-200',
    tag: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  [PartOfSpeechCategory.INTERJECTION]: {
    full: 'bg-orange-100 text-orange-800 border-orange-200',
    light: 'bg-orange-50 text-orange-600 border-orange-200',
    background: 'bg-orange-50',
    border: 'border-orange-200',
    tag: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  [PartOfSpeechCategory.AUXILIARY]: {
    full: 'bg-teal-100 text-teal-800 border-teal-200',
    light: 'bg-teal-50 text-teal-600 border-teal-200',
    background: 'bg-teal-50',
    border: 'border-teal-200',
    tag: 'bg-teal-100 text-teal-800 border-teal-200'
  },
  [PartOfSpeechCategory.COUNTER]: {
    full: 'bg-red-100 text-red-800 border-red-200',
    light: 'bg-red-50 text-red-600 border-red-200',
    background: 'bg-red-50',
    border: 'border-red-200',
    tag: 'bg-red-100 text-red-800 border-red-200'
  },
  [PartOfSpeechCategory.EXPRESSION]: {
    full: 'bg-lime-100 text-lime-800 border-lime-200',
    light: 'bg-lime-50 text-lime-600 border-lime-200',
    background: 'bg-lime-50',
    border: 'border-lime-200',
    tag: 'bg-lime-100 text-lime-800 border-lime-200'
  },
  [PartOfSpeechCategory.NUMERIC]: {
    full: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    light: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    background: 'bg-cyan-50',
    border: 'border-cyan-200',
    tag: 'bg-cyan-100 text-cyan-800 border-cyan-200'
  },
  [PartOfSpeechCategory.PREFIX_SUFFIX]: {
    full: 'bg-violet-100 text-violet-800 border-violet-200',
    light: 'bg-violet-50 text-violet-600 border-violet-200',
    background: 'bg-violet-50',
    border: 'border-violet-200',
    tag: 'bg-violet-100 text-violet-800 border-violet-200'
  },
  [PartOfSpeechCategory.UNKNOWN]: {
    full: 'bg-gray-100 text-gray-600 border-gray-300',
    light: 'bg-gray-50 text-gray-500 border-gray-300',
    background: 'bg-gray-50',
    border: 'border-gray-300',
    tag: 'bg-gray-100 text-gray-600 border-gray-300'
  },
  [PartOfSpeechCategory.OTHER]: {
    full: 'bg-slate-100 text-slate-800 border-slate-200',
    light: 'bg-slate-50 text-slate-600 border-slate-200',
    background: 'bg-slate-50',
    border: 'border-slate-200',
    tag: 'bg-slate-100 text-slate-800 border-slate-200'
  },
  [PartOfSpeechCategory.PUNCTUATION]: {
    full: 'bg-gray-100 text-gray-600 border-gray-200',
    light: 'bg-gray-50 text-gray-500 border-gray-200',
    background: 'bg-gray-50',
    border: 'border-gray-200',
    tag: 'bg-gray-100 text-gray-600 border-gray-200'
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
        useDarkMode={false}
        backdropClassName='grammar-breakdown-backdrop'
      >
        <Header>
          Sentence Breakdown
        </Header>

        <Content>
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4" />
              <span className="text-gray-600 text-lg">Analyzing...</span>
            </div>
          ) : (
            <>
              {/* Original Sentence with Furigana */}
              <div className="py-8" />
              <div className="px-6 bg-gray-50">
                <div className="relative">
                  <div 
                    className="text-2xl text-gray-900 font-medium select-text"
                    style={{ userSelect: 'text', WebkitUserSelect: 'text', lineHeight: '4rem' }}
                  >
                    {tokens.map((token, index) => (
                      <span key={index} className="relative inline-block group pb-2" style={{ lineHeight: '3rem' }}>
                        {/* Furigana */}
                        {token.reading && token.reading !== token.word && (
                          <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap pointer-events-none select-none z-20">
                            {token.reading}
                          </span>
                        )}
                        {/* Word */}
                        <span 
                          className={`cursor-pointer transition-all duration-200 rounded px-1 py-0.5 select-text relative border-2 ${getWordClasses(token.partOfSpeech, selectedTokenIndex === index)}`}
                          onClick={(e) => handleWordClick(e, index, selectedTokenIndex, setSelectedTokenIndex)}
                          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
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
                        <div className={`p-4 rounded-xl border-2 shadow-md ${getPOSStyles(token.partOfSpeech).border} ${getPOSStyles(token.partOfSpeech).background}`}>

                          {/* Part of Speech Tags */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {token.partOfSpeech.map((pos, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-1 text-xs font-medium rounded-md border ${getPOSStyles([pos]).tag}`}
                              >
                                {pos}
                              </span>
                            ))}
                          </div>

                          {/* Compound Word Structure */}
                          {token.compound && (
                            <div className="mb-3">
                              <div className="text-xs font-medium text-gray-600 mb-2">Compound Word</div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-sm font-medium text-gray-700">Structure:</span>
                                  {token.compound.parts.map((part, idx) => (
                                    <span key={idx} className="inline-flex items-center">
                                      <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">{part}</span>
                                      {idx < token.compound.parts.length - 1 && <span className="mx-1 text-gray-400">+</span>}
                                    </span>
                                  ))}
                                </div>
                                <div className="space-y-3">
                                  {token.compound.components.map((component, idx) => (
                                    <div key={idx} className="border-l-4 border-blue-200 pl-3">
                                      <div className="flex items-start gap-2 mb-1">
                                        <span className="font-medium text-blue-700">{component.word}</span>
                                        {component.reading && (
                                          <span className="text-xs text-gray-500">【{component.reading}】</span>
                                        )}
                                      </div>
                                      {component.conjugation.length > 0 && (
                                        <div className="text-xs text-purple-600 mb-1">
                                          {component.conjugation.join(', ')}
                                        </div>
                                      )}
                                      {component.partOfSpeech.length > 0 && (
                                        <div className="text-xs text-gray-500 mb-2">
                                          {component.partOfSpeech.join(', ')}
                                        </div>
                                      )}
                                      {component.meaning.length > 0 && (
                                        <div className="space-y-1">
                                          {component.meaning.map((meaning, mIdx) => (
                                            <div key={mIdx} className="text-sm text-gray-700">
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
                                <div key={idx} className="text-gray-800 mb-2 p-2 bg-white rounded-lg">
                                  <span className="font-medium text-blue-600">{idx + 1}.</span> {meaning}
                                </div>
                              ))}
                            </div>
                          ) : !token.compound && getPOSCategory(token.partOfSpeech) !== PartOfSpeechCategory.PUNCTUATION ? (
                            /* Google Search Button for unknown words - hide for punctuation */
                            <div className="mb-3">
                              <button
                                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(token.word)}`, '_blank')}
                                className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg border border-gray-300 transition-colors duration-200 flex items-center justify-center gap-2"
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
                              <div className="text-xs font-medium text-gray-600 mb-1">Conjugation</div>
                              <div className="flex flex-wrap gap-1">
                                {token.conjugation.map((conj, idx) => (
                                  <div key={idx} className="text-sm text-purple-700 bg-purple-50 px-2 py-1 rounded">
                                    {conj}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Alternative Readings/Meanings */}
                          {token.alternatives && token.alternatives.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-600 mb-1">Alternative Meanings</div>
                              {token.alternatives.map((alt, idx) => (
                                <div key={idx} className="mb-2 p-2 bg-white rounded border border-gray-200">
                                  {alt.reading && (
                                    <div className="text-xs text-gray-500 mb-1">{alt.reading}</div>
                                  )}
                                  {alt.meaning.map((meaning, mIdx) => (
                                    <div key={mIdx} className="text-sm text-gray-700">
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
                    <div className="text-gray-500 mb-2">Click on any word above to see its definition</div>
                    <div className="text-sm text-gray-400">Words are colored by their part of speech</div>
                  </div>
                )}
              </div>
            </>
          )}
        </Content>
        
        <Footer className="p-4 border-t border-gray-200 pwa-safe-bottom">
          <Button 
            onClick={handleClose}
            className="w-full"
            variant="outline"
            style={{ backgroundColor: '#A8C686', borderColor: '#A8C686', color: 'white' }}
          >
            Close
          </Button>
        </Footer>
      </Sheet>
    </Portal>
  )
}

export default GrammarBreakdown