import React, { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, BookOpen } from 'lucide-react'
import { Sheet, Header, Content, Portal, detents } from 'react-sheet-slide'
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
}

interface GrammarBreakdownProps {
  isOpen: boolean
  onClose: () => void
  sentence: string
  tokens: GrammarToken[]
  loading?: boolean
}

const partOfSpeechColors: Record<string, string> = {
  'noun': 'bg-blue-100 text-blue-800 border-blue-200',
  'verb': 'bg-green-100 text-green-800 border-green-200', 
  'adjective': 'bg-purple-100 text-purple-800 border-purple-200',
  'adverb': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'particle': 'bg-gray-100 text-gray-800 border-gray-200',
  'pronoun': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'conjunction': 'bg-pink-100 text-pink-800 border-pink-200',
  'interjection': 'bg-orange-100 text-orange-800 border-orange-200',
  'auxiliary': 'bg-teal-100 text-teal-800 border-teal-200',
  'default': 'bg-slate-100 text-slate-800 border-slate-200'
}

const partOfSpeechBackgrounds: Record<string, string> = {
  'noun': 'bg-blue-50',
  'verb': 'bg-green-50', 
  'adjective': 'bg-purple-50',
  'adverb': 'bg-yellow-50',
  'particle': 'bg-gray-50',
  'pronoun': 'bg-indigo-50',
  'conjunction': 'bg-pink-50',
  'interjection': 'bg-orange-50',
  'auxiliary': 'bg-teal-50',
  'default': 'bg-slate-50'
}

const getPartOfSpeechColor = (pos: string[]): string => {
  if (!pos || pos.length === 0) return partOfSpeechColors.default
  
  // Simple mapping from common Japanese POS tags
  const posStr = pos[0].toLowerCase()
  if (posStr.includes('noun') || posStr.includes('n')) return partOfSpeechColors.noun
  if (posStr.includes('verb') || posStr.includes('v')) return partOfSpeechColors.verb
  if (posStr.includes('adj')) return partOfSpeechColors.adjective
  if (posStr.includes('adv')) return partOfSpeechColors.adverb
  if (posStr.includes('prt') || posStr.includes('particle')) return partOfSpeechColors.particle
  if (posStr.includes('pron')) return partOfSpeechColors.pronoun
  if (posStr.includes('conj')) return partOfSpeechColors.conjunction
  if (posStr.includes('int')) return partOfSpeechColors.interjection
  if (posStr.includes('aux')) return partOfSpeechColors.auxiliary
  
  return partOfSpeechColors.default
}

const getPartOfSpeechBackground = (pos: string[]): string => {
  if (!pos || pos.length === 0) return partOfSpeechBackgrounds.default
  
  // Simple mapping from common Japanese POS tags
  const posStr = pos[0].toLowerCase()
  if (posStr.includes('noun') || posStr.includes('n')) return partOfSpeechBackgrounds.noun
  if (posStr.includes('verb') || posStr.includes('v')) return partOfSpeechBackgrounds.verb
  if (posStr.includes('adj')) return partOfSpeechBackgrounds.adjective
  if (posStr.includes('adv')) return partOfSpeechBackgrounds.adverb
  if (posStr.includes('prt') || posStr.includes('particle')) return partOfSpeechBackgrounds.particle
  if (posStr.includes('pron')) return partOfSpeechBackgrounds.pronoun
  if (posStr.includes('conj')) return partOfSpeechBackgrounds.conjunction
  if (posStr.includes('int')) return partOfSpeechBackgrounds.interjection
  if (posStr.includes('aux')) return partOfSpeechBackgrounds.auxiliary
  
  return partOfSpeechBackgrounds.default
}

export function GrammarBreakdown({ isOpen, onClose, sentence, tokens, loading = false }: GrammarBreakdownProps) {
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null)
  const [showAlternatives, setShowAlternatives] = useState(false)
  const ref = useRef()

  const selectedToken = selectedTokenIndex !== null ? tokens[selectedTokenIndex] : null

  return (
    <Portal>
      <Sheet
        ref={ref}
        open={isOpen}
        onDismiss={onClose}
        selectedDetent={detents.large}
        detents={(props) => [detents.large(props), detents.medium(props), detents.fit(props)]}
      >
        <Header>
          {/* Handle Bar */}
          <div className="flex justify-center py-3">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </Header>

        <Content>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                <span className="text-gray-600">Analyzing grammar...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Original Sentence with Furigana */}
              <div className="px-6 py-6 bg-gray-50">
                <div className="relative">
                  <div className="text-2xl leading-relaxed text-gray-900 font-medium">
                    {tokens.map((token, index) => (
                      <span key={index} className="relative inline-block group">
                        {/* Furigana */}
                        {token.reading && token.reading !== token.word && (
                          <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
                            {token.reading}
                          </span>
                        )}
                        {/* Word */}
                        <span 
                          className={`
                            cursor-pointer transition-all duration-200 rounded px-1 py-0.5
                            ${selectedTokenIndex === index 
                              ? 'bg-blue-200 text-blue-900' 
                              : 'hover:bg-blue-100 hover:text-blue-800'
                            }
                          `}
                          onClick={() => setSelectedTokenIndex(index === selectedTokenIndex ? null : index)}
                        >
                          {token.word}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Token Breakdown Grid */}
              <div className="px-6 py-6">
                <div className="text-lg font-semibold text-gray-900 mb-4">Sentence Breakdown</div>
                <div className="grid gap-3">
                  {tokens.map((token, index) => (
                    <div
                      key={index}
                      className={`
                        p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                        ${selectedTokenIndex === index
                          ? 'border-blue-300 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }
                        ${getPartOfSpeechBackground(token.partOfSpeech)}
                      `}
                      onClick={() => setSelectedTokenIndex(index === selectedTokenIndex ? null : index)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Word with Furigana */}
                          <div className="mb-2">
                            <div className="relative inline-block">
                              {token.reading && token.reading !== token.word && (
                                <div className="text-xs text-gray-500 mb-1">
                                  {token.reading}
                                </div>
                              )}
                              <div className="text-xl font-medium text-gray-900">
                                {token.word}
                              </div>
                            </div>
                          </div>

                          {/* Meanings */}
                          <div className="mb-3">
                            {token.meaning.map((meaning, idx) => (
                              <div key={idx} className="text-gray-700 mb-1">
                                <span className="text-sm font-medium">
                                  {idx + 1}. {meaning}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Part of Speech Tags */}
                          <div className="flex flex-wrap gap-2 mb-2">
                            {token.partOfSpeech.map((pos, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-1 text-xs font-medium rounded-md border ${getPartOfSpeechColor([pos])}`}
                              >
                                {pos}
                              </span>
                            ))}
                          </div>

                          {/* Conjugation Info */}
                          {token.conjugation && (
                            <div className="text-sm text-purple-700 bg-purple-50 px-3 py-2 rounded-lg">
                              <span className="font-medium">Conjugation:</span> {token.conjugation}
                            </div>
                          )}
                        </div>

                        {/* Expand Indicator */}
                        <div className="ml-3">
                          <ChevronDown 
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                              selectedTokenIndex === index ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {/* Alternative Readings/Meanings (Expanded) */}
                      {selectedTokenIndex === index && token.alternatives && token.alternatives.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-sm font-medium text-gray-700 mb-2">Alternative Meanings</div>
                          {token.alternatives.map((alt, idx) => (
                            <div key={idx} className="mb-2 p-3 bg-gray-50 rounded-lg">
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
                  ))}
                </div>
              </div>
            </>
          )}
        </Content>
      </Sheet>
    </Portal>
  )
}

export default GrammarBreakdown