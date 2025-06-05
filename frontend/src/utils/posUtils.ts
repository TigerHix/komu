import { 
  PartOfSpeechCategory, 
  PartOfSpeechCategoryMap, 
  PartOfSpeech, 
  PartOfSpeechLabels 
} from './grammarAnalysis'

export interface GrammarToken {
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

export function getPOSCategory(pos: string[]): PartOfSpeechCategory {
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

export function getSelectedRange(start: number | null, end: number | null): [number, number] | null {
  if (start === null || end === null) return null
  return [Math.min(start, end), Math.max(start, end)]
}

export function isWordInSelection(index: number, start: number | null, end: number | null): boolean {
  const range = getSelectedRange(start, end)
  if (!range) return false
  const [rangeStart, rangeEnd] = range
  return index >= rangeStart && index <= rangeEnd
}

export function getSelectedText(start: number | null, end: number | null, tokens: GrammarToken[]): string {
  const range = getSelectedRange(start, end)
  if (!range) return ''
  const [rangeStart, rangeEnd] = range
  return tokens.slice(rangeStart, rangeEnd + 1).map(token => token.word).join('')
}