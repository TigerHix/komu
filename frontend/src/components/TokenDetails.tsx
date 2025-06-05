import React from 'react'
import { GrammarToken } from '@/utils/posUtils'
import { getPOSStyles } from '@/utils/posStyles'
import { getPOSCategory } from '@/utils/posUtils'
import { PartOfSpeechCategory } from '@/utils/grammarAnalysis'

interface TokenDetailsProps {
  token: GrammarToken
}

export function TokenDetails({ token }: TokenDetailsProps) {
  const posStyles = getPOSStyles(token.partOfSpeech)
  
  return (
    <div className={`p-4 pb-2 rounded-xl border-2 shadow-md ${posStyles.border} ${posStyles.background}`}>
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
}

interface EmptySelectionProps {
  className?: string
}

export function EmptySelection({ className = '' }: EmptySelectionProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-text-secondary mb-2">Click on any word above to see its definition</div>
      <div className="text-sm text-text-tertiary">Drag on words to select multiple for analysis</div>
    </div>
  )
}