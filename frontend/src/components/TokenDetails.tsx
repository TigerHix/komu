import { GrammarToken } from '@/utils/grammarAnalysis'
import { getPOSStyles } from '@/utils/posStyles'
import { getPOSCategory } from '@/utils/posUtils'
import { PartOfSpeechCategory } from '@/utils/grammarAnalysis'
import { getLocalizedText, getLocalizedPartOfSpeech } from '@/utils/textLocalization'
import { useTranslation } from 'react-i18next'

interface TokenDetailsProps {
  token: GrammarToken
}

function POSTag({ pos, t }: { pos: string, t: any }) {
  return (
    <span className={`px-1.5 py-0.5 text-xs font-medium rounded border select-pos ${getPOSStyles(pos).tag}`}>
      {getLocalizedPartOfSpeech(pos, t)}
    </span>
  )
}

function MeaningItem({ meaning, t, showBullet = true }: { 
  meaning: { text: string; partOfSpeech: string[]; info: string }, 
  t: any,
  showBullet?: boolean 
}) {
  return (
    <div className="flex items-start gap-1">
      {showBullet && <span className="mt-0.5">•</span>}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0 flex-1">
        {meaning.partOfSpeech.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            {meaning.partOfSpeech.map((pos: string, posIdx: number) => (
              <POSTag key={posIdx} pos={pos} t={t} />
            ))}
          </div>
        )}
        <div className="min-w-0 flex-1" style={{ flexBasis: '200px' }}>
          <div>{getLocalizedText(meaning.text, t)}</div>
          {meaning.info && (
            <div className="text-xs text-text-tertiary mt-1 italic">
              {meaning.info}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TokenMeanings({ meanings, t }: { meanings: GrammarToken['meanings'], t: any }) {
  if (!meanings.length) return null
  
  return (
    <div className="mb-3 space-y-2">
      {meanings.map((meaning, idx: number) => (
        <div key={idx} className="text-text-primary p-2 bg-surface-1 rounded-lg select-definition">
          <div className="flex items-center gap-1">
            <span className="font-medium text-text-primary min-w-[1.3rem]">{idx + 1}.</span>
            <div className="flex-1">
              <MeaningItem meaning={meaning} t={t} showBullet={false} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function WordHeader({ token, t }: { token: GrammarToken, t: any }) {
  const shouldShowPOSOnly = !token.components.length && 
    token.meanings.length === 0 && 
    token.alternatives.length === 0 &&
    token.conjugations.length === 0 &&
    token.partOfSpeech.length > 0 &&
    !token.isSuffix

  return (
    <div className="py-2 pb-3">
      {/* Word and reading */}
      <div className="flex items-start mb-1">
        <span className="font-medium text-text-primary select-text text-lg">{token.word}</span>
        {token.reading && (
          <span className="text-xs text-text-tertiary select-text">【{token.reading}】</span>
        )}
      </div>

       {/* POS only display */}
      {shouldShowPOSOnly && <POSTag pos={token.partOfSpeech} t={t} />}

      {/* Conjugation types and suffix below */}
      <div className="flex flex-wrap gap-1">
        {token.conjugationTypes && token.conjugationTypes.length > 0 && 
          token.conjugationTypes.map((conj: string, idx: number) => (
            <POSTag key={`conj-${idx}`} pos={t(`grammarBreakdown.conjugation.${conj}`, conj)} t={t} />
          ))
        }
        {token.suffix && (
          <POSTag pos={t(`grammarBreakdown.suffixDescriptions.${token.suffix}`, token.suffix)} t={t} />
        )}
      </div>
    </div>
  )
}

export function TokenDetails({ token }: TokenDetailsProps) {
  const { t } = useTranslation()
  const partOfSpeech = token.partOfSpeech
  const posStyles = getPOSStyles(partOfSpeech)
  
  const shouldShowMeanings = !token.components.length && 
    token.meanings.length > 0 && 
    getPOSCategory(partOfSpeech) !== PartOfSpeechCategory.PUNCTUATION
  
  return (
    <div className={`px-4 pt-3 rounded-xl border-2 shadow-md ${posStyles.border} ${posStyles.background}`}>
      {/* Word header for sub-tokens */}
      <WordHeader token={token} t={t} />

      {/* Main token meanings */}
      {shouldShowMeanings && <TokenMeanings meanings={token.meanings} t={t} />}
      
      {/* Components (compound word breakdown) */}
      {token.components.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-text-secondary mb-2 select-text">
            {t('grammarBreakdown.structure')}
          </div>
          {/* Structure overview */}
          <div className="flex items-center gap-2 mb-3">
            {token.components.map((component, idx: number) => (
              <span key={idx} className="inline-flex items-center">
                <span className="bg-primary/10 text-text-primary text-sm px-2 py-1 rounded">{component.word}</span>
                {idx < token.components.length - 1 && <span className="mx-1 text-text-tertiary">+</span>}
              </span>
            ))}
          </div>
          {/* Component details */}
          <div className="space-y-3">
            {token.components.map((component, idx: number) => (
              <TokenDetails key={idx} token={component} />
            ))}
          </div>
        </div>
      )}
      
      {/* Conjugations */}
      {token.conjugations.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-text-secondary mb-2 select-text">
            {token.hasConjugationVia ? t('grammarBreakdown.conjugationsVia') : t('grammarBreakdown.conjugations')}
          </div>
          <div className="space-y-3">
            {token.conjugations.map((conjugation, idx: number) => (
              <TokenDetails key={idx} token={conjugation} />
            ))}
          </div>
        </div>
      )}
      
      {/* Alternatives */}
      {token.alternatives.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-text-secondary mb-2 select-text">
            {t('grammarBreakdown.alternativeMeanings')}
          </div>
          <div className="space-y-3">
            {token.alternatives.map((alternative, idx: number) => (
              <TokenDetails key={idx} token={alternative} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface EmptySelectionProps {
  className?: string
}

export function EmptySelection({ className = '' }: EmptySelectionProps) {
  const { t } = useTranslation()
  
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-text-secondary mb-2">{t('grammarBreakdown.instructions.clickWord')}</div>
      <div className="text-sm text-text-tertiary">{t('grammarBreakdown.instructions.dragWords')}</div>
    </div>
  )
}