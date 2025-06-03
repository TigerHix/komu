// Grammar analysis utilities for converting Ichiran tokenization to UI format

// Ichiran API types (matching backend types)
interface IchiranWordInfo {
  text: string
  kana: string | string[]
  type?: 'KANJI' | 'KANA' | 'GAP'
  reading?: string
  score?: number
  seq?: number
  conjugations?: string | 'ROOT'
  gloss?: Array<{
    pos: string
    gloss: string
    field?: string
    info?: string
  }>
  conj?: Array<{
    prop?: Array<{
      type: string
      pos: string
      form?: string
      neg?: boolean
    }>
    reading?: string
    gloss?: Array<{
      pos: string
      gloss: string
    }>
    readok?: boolean
  }>
  alternative?: IchiranWordInfo[]
  components?: IchiranWordInfo[]
  compound?: string[]
  suffix?: string
}

interface IchiranToken {
  word: string
  romanized: string
  info: IchiranWordInfo
  alternatives: any[]
}

interface IchiranResponse {
  success: boolean
  original: string
  romanized: string
  tokens: IchiranToken[]
  totalScore: number
  raw?: any
}

// UI format for grammar breakdown component
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
}

/**
 * API client for tokenization
 */
export async function analyzeGrammar(text: string): Promise<GrammarToken[]> {
  try {
    const response = await fetch('/api/tokenize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      throw new Error(`Tokenization failed: ${response.statusText}`)
    }

    const data: IchiranResponse = await response.json()
    
    if (!data.success) {
      throw new Error('Tokenization was unsuccessful')
    }

    return convertIchiranToGrammarTokens(data.tokens)
  } catch (error) {
    console.error('Grammar analysis failed:', error)
    throw error
  }
}

/**
 * Convert Ichiran tokens to GrammarToken format
 */
function convertIchiranToGrammarTokens(ichiranTokens: IchiranToken[]): GrammarToken[] {
  return ichiranTokens.map(token => {
    const wordInfo = token.info
    
    // Extract reading (prefer kana over romanized, avoid romaji display)
    const reading = extractReading(wordInfo, token.word)
    
    // Extract meanings from gloss
    const meanings = extractMeanings(wordInfo)
    
    // Extract part of speech
    const partOfSpeech = extractPartOfSpeech(wordInfo)
    
    // Extract conjugation info
    const conjugation = extractConjugation(wordInfo)
    
    // Extract alternatives
    const alternatives = extractAlternatives(wordInfo)

    return {
      word: token.word,
      reading,
      meaning: meanings,
      partOfSpeech,
      conjugation,
      alternatives,
    }
  }).filter(token => 
    // Filter out empty or whitespace-only tokens
    token.word.trim().length > 0
  )
}

/**
 * Extract reading, preferring kana over romanized
 */
function extractReading(wordInfo: IchiranWordInfo, originalWord: string): string {
  // If kana is available and different from the word, use it
  if (wordInfo.kana) {
    const kanaStr = Array.isArray(wordInfo.kana) ? wordInfo.kana[0] : wordInfo.kana
    if (kanaStr && kanaStr !== originalWord) {
      return kanaStr
    }
  }
  
  // For words that are already in kana, don't show redundant reading
  if (wordInfo.type === 'KANA' || isKanaOnly(originalWord)) {
    return ''
  }
  
  // Check conjugation info for reading
  if (wordInfo.conj && wordInfo.conj.length > 0) {
    const conjReading = wordInfo.conj[0].reading
    if (conjReading && conjReading !== originalWord) {
      return conjReading
    }
  }
  
  return ''
}

/**
 * Check if text contains only kana characters
 */
function isKanaOnly(text: string): boolean {
  const kanaRegex = /^[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF]*$/
  return /^[\u3040-\u309F\u30A0-\u30FF]*$/.test(text)
}

/**
 * Extract meanings from gloss information
 */
function extractMeanings(wordInfo: IchiranWordInfo): string[] {
  const meanings: string[] = []
  
  // Primary gloss
  if (wordInfo.gloss) {
    for (const glossItem of wordInfo.gloss) {
      if (glossItem.gloss) {
        meanings.push(glossItem.gloss)
      }
    }
  }
  
  // Conjugation gloss
  if (wordInfo.conj) {
    for (const conjItem of wordInfo.conj) {
      if (conjItem.gloss) {
        for (const glossItem of conjItem.gloss) {
          if (glossItem.gloss && !meanings.includes(glossItem.gloss)) {
            meanings.push(glossItem.gloss)
          }
        }
      }
    }
  }
  
  // Compound word components (for words like 引かなくても)
  if (wordInfo.components && meanings.length === 0) {
    for (const component of wordInfo.components) {
      // Extract from component's direct gloss
      if (component.gloss) {
        for (const glossItem of component.gloss) {
          if (glossItem.gloss && !meanings.includes(glossItem.gloss)) {
            meanings.push(glossItem.gloss)
          }
        }
      }
      
      // Extract from component's conjugation gloss
      if (component.conj) {
        for (const conjItem of component.conj) {
          if (conjItem.gloss) {
            for (const glossItem of conjItem.gloss) {
              if (glossItem.gloss && !meanings.includes(glossItem.gloss)) {
                meanings.push(glossItem.gloss)
              }
            }
          }
        }
      }
      
      // Add suffix information if available
      if (component.suffix && !meanings.includes(component.suffix)) {
        meanings.push(component.suffix)
      }
    }
  }
  
  // Alternative meanings
  if (wordInfo.alternative && meanings.length === 0) {
    for (const alt of wordInfo.alternative) {
      const altMeanings = extractMeanings(alt)
      meanings.push(...altMeanings.filter(m => !meanings.includes(m) && m !== 'Unknown word'))
    }
  }
  
  if (meanings.length === 0) {
    // Check if this is actually just a string token (unknown word)
    if (typeof wordInfo === 'string') {
      return ['Unknown word']
    } else {
      // This is a parsing error - we have a word object but couldn't extract meaning
      return ['Error parsing word']
    }
  }
  
  return meanings
}

/**
 * Extract part of speech information
 */
function extractPartOfSpeech(wordInfo: IchiranWordInfo): string[] {
  const pos: string[] = []
  
  // From primary gloss
  if (wordInfo.gloss) {
    for (const glossItem of wordInfo.gloss) {
      if (glossItem.pos) {
        const cleanedPos = cleanPartOfSpeech(glossItem.pos)
        if (cleanedPos && !pos.includes(cleanedPos)) {
          pos.push(cleanedPos)
        }
      }
    }
  }
  
  // From conjugation info
  if (wordInfo.conj) {
    for (const conjItem of wordInfo.conj) {
      if (conjItem.prop) {
        for (const propItem of conjItem.prop) {
          if (propItem.pos) {
            const cleanedPos = cleanPartOfSpeech(propItem.pos)
            if (cleanedPos && !pos.includes(cleanedPos)) {
              pos.push(cleanedPos)
            }
          }
        }
      }
      // Also check conjugation gloss for POS
      if (conjItem.gloss) {
        for (const glossItem of conjItem.gloss) {
          if (glossItem.pos) {
            const cleanedPos = cleanPartOfSpeech(glossItem.pos)
            if (cleanedPos && !pos.includes(cleanedPos)) {
              pos.push(cleanedPos)
            }
          }
        }
      }
    }
  }
  
  // From compound word components
  if (wordInfo.components && pos.length === 0) {
    for (const component of wordInfo.components) {
      // Extract POS from component's gloss
      if (component.gloss) {
        for (const glossItem of component.gloss) {
          if (glossItem.pos) {
            const cleanedPos = cleanPartOfSpeech(glossItem.pos)
            if (cleanedPos && !pos.includes(cleanedPos)) {
              pos.push(cleanedPos)
            }
          }
        }
      }
      
      // Extract POS from component's conjugation
      if (component.conj) {
        for (const conjItem of component.conj) {
          if (conjItem.prop) {
            for (const propItem of conjItem.prop) {
              if (propItem.pos) {
                const cleanedPos = cleanPartOfSpeech(propItem.pos)
                if (cleanedPos && !pos.includes(cleanedPos)) {
                  pos.push(cleanedPos)
                }
              }
            }
          }
          if (conjItem.gloss) {
            for (const glossItem of conjItem.gloss) {
              if (glossItem.pos) {
                const cleanedPos = cleanPartOfSpeech(glossItem.pos)
                if (cleanedPos && !pos.includes(cleanedPos)) {
                  pos.push(cleanedPos)
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Fallback based on word type
  if (pos.length === 0) {
    if (wordInfo.type === 'GAP') {
      pos.push('punctuation')
    } else {
      pos.push('unknown')
    }
  }
  
  return pos
}

/**
 * Clean and standardize part of speech tags
 */
function cleanPartOfSpeech(pos: string): string {
  // Remove brackets and clean up common POS tags
  const cleaned = pos.replace(/[\[\]]/g, '').toLowerCase()
  
  // Map common Japanese POS tags to readable English
  const posMap: Record<string, string> = {
    'n': 'noun',
    'v1': 'verb (ichidan)',
    'v5r': 'verb (godan -ru)',
    'v5k': 'verb (godan -ku)',
    'v5g': 'verb (godan -gu)',
    'v5s': 'verb (godan -su)',
    'v5t': 'verb (godan -tsu)',
    'v5n': 'verb (godan -nu)',
    'v5b': 'verb (godan -bu)',
    'v5m': 'verb (godan -mu)',
    'v5u': 'verb (godan -u)',
    'vs': 'suru verb',
    'vi': 'intransitive verb',
    'vt': 'transitive verb',
    'adj-i': 'i-adjective',
    'adj-na': 'na-adjective',
    'adv': 'adverb',
    'prt': 'particle',
    'conj': 'conjunction',
    'int': 'interjection',
    'pref': 'prefix',
    'suf': 'suffix',
    'aux': 'auxiliary',
    'cop': 'copula',
    'ctr': 'counter'
  }
  
  return posMap[cleaned] || cleaned
}

/**
 * Extract conjugation information
 */
function extractConjugation(wordInfo: IchiranWordInfo): string | undefined {
  if (wordInfo.conjugations && wordInfo.conjugations !== 'ROOT') {
    return wordInfo.conjugations
  }
  
  if (wordInfo.conj && wordInfo.conj.length > 0) {
    const conjInfo = wordInfo.conj[0]
    if (conjInfo.prop && conjInfo.prop.length > 0) {
      const propInfo = conjInfo.prop[0]
      if (propInfo.type) {
        return propInfo.type
      }
    }
  }
  
  // Check compound word components for conjugation info
  if (wordInfo.components) {
    for (const component of wordInfo.components) {
      if (component.conj && component.conj.length > 0) {
        const conjInfo = component.conj[0]
        if (conjInfo.prop && conjInfo.prop.length > 0) {
          const propInfo = conjInfo.prop[0]
          if (propInfo.type) {
            return propInfo.type
          }
        }
      }
      
      // Also check for suffix information
      if (component.suffix) {
        return component.suffix
      }
    }
  }
  
  return undefined
}

/**
 * Extract alternative readings and meanings
 */
function extractAlternatives(wordInfo: IchiranWordInfo): Array<{ reading: string; meaning: string[] }> {
  const alternatives: Array<{ reading: string; meaning: string[] }> = []
  
  if (wordInfo.alternative) {
    for (const alt of wordInfo.alternative) {
      const reading = extractReading(alt, alt.text)
      const meanings = extractMeanings(alt)
      
      if (reading || meanings.length > 0) {
        alternatives.push({
          reading: reading || alt.text,
          meaning: meanings
        })
      }
    }
  }
  
  return alternatives
}

/**
 * Check if text contains Japanese characters (for validation)
 */
export function containsJapanese(text: string): boolean {
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF]/
  return japaneseRegex.test(text)
}

/**
 * Clean text for tokenization (remove punctuation, normalize whitespace)
 */
export function cleanTextForAnalysis(text: string): string {
  return text
    .replace(/[""''「」『』\(\)\[\]{}]/g, '') // Remove quotation marks and brackets
    .replace(/[。、！？]/g, '') // Remove Japanese punctuation
    .replace(/\s+/g, '') // Remove whitespace
    .trim()
}