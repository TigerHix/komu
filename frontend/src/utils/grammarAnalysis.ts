// Grammar analysis utilities for converting Ichiran tokenization to UI format

// Complete POS (Part of Speech) enum based on ichiran/JMDict system
export enum PartOfSpeech {
  // Adjectives
  ADJ_I = 'adj-i',          // i-adjectives (true adjectives ending in い)
  ADJ_IX = 'adj-ix',        // archaic/literary i-adjectives 
  ADJ_NA = 'adj-na',        // na-adjectives (adjectival nouns)
  ADJ_NO = 'adj-no',        // nouns which may take the genitive case particle の
  ADJ_PN = 'adj-pn',        // pre-noun adjectival (rentaishi)
  ADJ_T = 'adj-t',          // 'taru' adjective
  ADJ_F = 'adj-f',          // noun or verb acting prenominally

  // Adverbs
  ADV = 'adv',              // adverb
  ADV_TO = 'adv-to',        // adverb taking the particle と (to-adverbs)

  // Auxiliary
  AUX_V = 'aux-v',          // auxiliary verb
  AUX_ADJ = 'aux-adj',      // auxiliary adjective

  // Conjunction  
  CONJ = 'conj',            // conjunction (and, but, or, etc.)

  // Copula
  COP = 'cop',              // copula
  COP_DA = 'cop-da',        // copula だ (plain form copula)

  // Counters
  CTR = 'ctr',              // counter (used for counting objects)

  // Expressions
  EXP = 'exp',              // expressions (phrases, idioms)

  // Interjections
  INT = 'int',              // interjection

  // Nouns
  N = 'n',                  // noun (common)
  N_ADV = 'n-adv',          // adverbial noun (fukushitekimeishi)
  N_SUF = 'n-suf',          // noun, used as a suffix
  N_PREF = 'n-pref',        // noun, used as a prefix
  N_T = 'n-t',              // noun (temporal)

  // Numerics
  NUM = 'num',              // numeric

  // Pronouns
  PN = 'pn',                // pronoun

  // Particles
  PRT = 'prt',              // particle

  // Prefixes/Suffixes
  PREF = 'pref',            // prefix
  SUF = 'suf',              // suffix

  // Verbs - Ichidan
  V1 = 'v1',                // Ichidan verb (ru-verb)
  V1_S = 'v1-s',            // Ichidan verb - kureru special class

  // Verbs - Godan
  V5ARU = 'v5aru',          // Godan verb - -aru special class
  V5B = 'v5b',              // Godan verb with 'bu' ending
  V5G = 'v5g',              // Godan verb with 'gu' ending
  V5K = 'v5k',              // Godan verb with 'ku' ending
  V5K_S = 'v5k-s',          // Godan verb - iku/yuku special class
  V5M = 'v5m',              // Godan verb with 'mu' ending
  V5N = 'v5n',              // Godan verb with 'nu' ending
  V5R = 'v5r',              // Godan verb with 'ru' ending
  V5R_I = 'v5r-i',          // Godan verb with 'ru' ending (irregular verb)
  V5S = 'v5s',              // Godan verb with 'su' ending
  V5T = 'v5t',              // Godan verb with 'tsu' ending
  V5U = 'v5u',              // Godan verb with 'u' ending
  V5U_S = 'v5u-s',          // Godan verb with 'u' ending (special class)

  // Verbs - Special
  VK = 'vk',                // kuru verb - special class
  VS = 'vs',                // noun or participle which takes the aux. verb suru
  VS_I = 'vs-i',            // suru verb - included
  VS_S = 'vs-s',            // suru verb - special class
  VT = 'vt',                // transitive verb
  VI = 'vi',                // intransitive verb
  VZ = 'vz',                // Ichidan verb - zuru verb (alternative form of -jiru verbs)
  V5URU = 'v5uru',          // Godan verb - Uru old class verb (old form of Eru)

  // Onomatopoeia
  ON_MIM = 'on-mim',        // onomatopoeic or mimetic word

  // Other
  UNC = 'unc',              // unclassified
  PUNCTUATION = 'punctuation', // punctuation marks
}

// Human-readable labels for POS tags
export const PartOfSpeechLabels: Record<PartOfSpeech, string> = {
  // Adjectives
  [PartOfSpeech.ADJ_I]: 'I-Adjective',
  [PartOfSpeech.ADJ_IX]: 'I-Adjective (Archaic)',
  [PartOfSpeech.ADJ_NA]: 'Na-Adjective',
  [PartOfSpeech.ADJ_NO]: 'No-Adjective',
  [PartOfSpeech.ADJ_PN]: 'Pre-noun Adjective',
  [PartOfSpeech.ADJ_T]: 'Taru-Adjective',
  [PartOfSpeech.ADJ_F]: 'Prenominal',

  // Adverbs
  [PartOfSpeech.ADV]: 'Adverb',
  [PartOfSpeech.ADV_TO]: 'To-Adverb',

  // Auxiliary
  [PartOfSpeech.AUX_V]: 'Auxiliary Verb',
  [PartOfSpeech.AUX_ADJ]: 'Auxiliary Adjective',

  // Conjunction
  [PartOfSpeech.CONJ]: 'Conjunction',

  // Copula
  [PartOfSpeech.COP]: 'Copula',
  [PartOfSpeech.COP_DA]: 'Copula (だ)',

  // Counters
  [PartOfSpeech.CTR]: 'Counter',

  // Expressions
  [PartOfSpeech.EXP]: 'Expression',

  // Interjections
  [PartOfSpeech.INT]: 'Interjection',

  // Nouns
  [PartOfSpeech.N]: 'Noun',
  [PartOfSpeech.N_ADV]: 'Adverbial Noun',
  [PartOfSpeech.N_SUF]: 'Noun Suffix',
  [PartOfSpeech.N_PREF]: 'Noun Prefix',
  [PartOfSpeech.N_T]: 'Temporal Noun',

  // Numerics
  [PartOfSpeech.NUM]: 'Number',

  // Pronouns
  [PartOfSpeech.PN]: 'Pronoun',

  // Particles
  [PartOfSpeech.PRT]: 'Particle',

  // Prefixes/Suffixes
  [PartOfSpeech.PREF]: 'Prefix',
  [PartOfSpeech.SUF]: 'Suffix',

  // Verbs - Ichidan
  [PartOfSpeech.V1]: 'Ichidan Verb',
  [PartOfSpeech.V1_S]: 'Ichidan Verb (Special)',

  // Verbs - Godan
  [PartOfSpeech.V5ARU]: 'Godan Verb (-aru)',
  [PartOfSpeech.V5B]: 'Godan Verb (-bu)',
  [PartOfSpeech.V5G]: 'Godan Verb (-gu)',
  [PartOfSpeech.V5K]: 'Godan Verb (-ku)',
  [PartOfSpeech.V5K_S]: 'Godan Verb (-ku Special)',
  [PartOfSpeech.V5M]: 'Godan Verb (-mu)',
  [PartOfSpeech.V5N]: 'Godan Verb (-nu)',
  [PartOfSpeech.V5R]: 'Godan Verb (-ru)',
  [PartOfSpeech.V5R_I]: 'Godan Verb (-ru Irregular)',
  [PartOfSpeech.V5S]: 'Godan Verb (-su)',
  [PartOfSpeech.V5T]: 'Godan Verb (-tsu)',
  [PartOfSpeech.V5U]: 'Godan Verb (-u)',
  [PartOfSpeech.V5U_S]: 'Godan Verb (-u Special)',

  // Verbs - Special
  [PartOfSpeech.VK]: 'Kuru Verb',
  [PartOfSpeech.VS]: 'Suru Verb',
  [PartOfSpeech.VS_I]: 'Suru Verb (Included)',
  [PartOfSpeech.VS_S]: 'Suru Verb (Special)',
  [PartOfSpeech.VT]: 'Transitive Verb',
  [PartOfSpeech.VI]: 'Intransitive Verb',
  [PartOfSpeech.VZ]: 'Zuru Verb',
  [PartOfSpeech.V5URU]: 'Godan Verb (-uru)',

  // Onomatopoeia
  [PartOfSpeech.ON_MIM]: 'Onomatopoeia',

  // Other
  [PartOfSpeech.UNC]: 'Unclassified',
  [PartOfSpeech.PUNCTUATION]: 'Punctuation',
}

// Category groupings for UI styling
export enum PartOfSpeechCategory {
  ADJECTIVE = 'adjective',
  ADVERB = 'adverb',
  AUXILIARY = 'auxiliary',
  CONJUNCTION = 'conjunction',
  COPULA = 'copula',
  COUNTER = 'counter',
  EXPRESSION = 'expression',
  INTERJECTION = 'interjection',
  NOUN = 'noun',
  NUMERIC = 'numeric',
  PRONOUN = 'pronoun',
  PARTICLE = 'particle',
  PREFIX_SUFFIX = 'prefix-suffix',
  VERB = 'verb',
  UNKNOWN = 'unknown',
  OTHER = 'other',
  PUNCTUATION = 'punctuation',
}

export const PartOfSpeechCategoryMap: Record<PartOfSpeech, PartOfSpeechCategory> = {
  // Adjectives
  [PartOfSpeech.ADJ_I]: PartOfSpeechCategory.ADJECTIVE,
  [PartOfSpeech.ADJ_IX]: PartOfSpeechCategory.ADJECTIVE,
  [PartOfSpeech.ADJ_NA]: PartOfSpeechCategory.ADJECTIVE,
  [PartOfSpeech.ADJ_NO]: PartOfSpeechCategory.ADJECTIVE,
  [PartOfSpeech.ADJ_PN]: PartOfSpeechCategory.ADJECTIVE,
  [PartOfSpeech.ADJ_T]: PartOfSpeechCategory.ADJECTIVE,
  [PartOfSpeech.ADJ_F]: PartOfSpeechCategory.ADJECTIVE,

  // Adverbs
  [PartOfSpeech.ADV]: PartOfSpeechCategory.ADVERB,
  [PartOfSpeech.ADV_TO]: PartOfSpeechCategory.ADVERB,

  // Auxiliary
  [PartOfSpeech.AUX_V]: PartOfSpeechCategory.AUXILIARY,
  [PartOfSpeech.AUX_ADJ]: PartOfSpeechCategory.AUXILIARY,

  // Conjunction
  [PartOfSpeech.CONJ]: PartOfSpeechCategory.CONJUNCTION,

  // Copula
  [PartOfSpeech.COP]: PartOfSpeechCategory.COPULA,
  [PartOfSpeech.COP_DA]: PartOfSpeechCategory.COPULA,

  // Counters
  [PartOfSpeech.CTR]: PartOfSpeechCategory.COUNTER,

  // Expressions
  [PartOfSpeech.EXP]: PartOfSpeechCategory.EXPRESSION,

  // Interjections
  [PartOfSpeech.INT]: PartOfSpeechCategory.INTERJECTION,

  // Nouns
  [PartOfSpeech.N]: PartOfSpeechCategory.NOUN,
  [PartOfSpeech.N_ADV]: PartOfSpeechCategory.NOUN,
  [PartOfSpeech.N_SUF]: PartOfSpeechCategory.NOUN,
  [PartOfSpeech.N_PREF]: PartOfSpeechCategory.NOUN,
  [PartOfSpeech.N_T]: PartOfSpeechCategory.NOUN,

  // Numerics
  [PartOfSpeech.NUM]: PartOfSpeechCategory.NUMERIC,

  // Pronouns
  [PartOfSpeech.PN]: PartOfSpeechCategory.PRONOUN,

  // Particles
  [PartOfSpeech.PRT]: PartOfSpeechCategory.PARTICLE,

  // Prefixes/Suffixes
  [PartOfSpeech.PREF]: PartOfSpeechCategory.PREFIX_SUFFIX,
  [PartOfSpeech.SUF]: PartOfSpeechCategory.PREFIX_SUFFIX,

  // All verbs
  [PartOfSpeech.V1]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V1_S]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5ARU]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5B]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5G]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5K]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5K_S]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5M]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5N]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5R]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5R_I]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5S]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5T]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5U]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5U_S]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.VK]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.VS]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.VS_I]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.VS_S]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.VT]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.VI]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.VZ]: PartOfSpeechCategory.VERB,
  [PartOfSpeech.V5URU]: PartOfSpeechCategory.VERB,

  // Onomatopoeia
  [PartOfSpeech.ON_MIM]: PartOfSpeechCategory.EXPRESSION,

  // Other
  [PartOfSpeech.UNC]: PartOfSpeechCategory.OTHER,
  [PartOfSpeech.PUNCTUATION]: PartOfSpeechCategory.PUNCTUATION,
}

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
  conjugation: string[]
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

    return convertIchiranToGrammarTokens(data.tokens, text)
  } catch (error) {
    console.error('Grammar analysis failed:', error)
    throw error
  }
}

/**
 * Convert Ichiran tokens to GrammarToken format
 */
function convertIchiranToGrammarTokens(ichiranTokens: IchiranToken[], originalText: string): GrammarToken[] {
  // Create a mapping of converted punctuation back to original
  const punctuationMap: { [key: string]: string } = {
    ', ': '、',
    ',': '、',
    '. ': '。',
    '.': '。', 
    '! ': '！',
    '!': '！',
    '? ': '？',
    '?': '？'
  }
  
  let textPosition = 0
  
  return ichiranTokens.map(token => {
    const wordInfo = token.info
    
    // Handle GAP tokens (punctuation) specially
    if (wordInfo.type === 'GAP') {
      const trimmedWord = token.word.trim()
      let originalChar = punctuationMap[token.word] || punctuationMap[trimmedWord] || trimmedWord
      
      // For quotes and other punctuation, find the actual character in original text
      if (trimmedWord === '"' || trimmedWord === "'" || trimmedWord === '(' || trimmedWord === ')') {
        // Scan ahead in original text to find the actual punctuation character
        while (textPosition < originalText.length) {
          const char = originalText[textPosition]
          if (/[、。！？「」『』（）【】〈〉《》〔〕［］｛｝"'()（）]/.test(char)) {
            originalChar = char
            textPosition++
            break
          }
          textPosition++
        }
      } else {
        textPosition++
      }
      
      return {
        word: originalChar,
        reading: '',
        meaning: [],
        partOfSpeech: [PartOfSpeechLabels[PartOfSpeech.PUNCTUATION]],
        conjugation: [],
        alternatives: [],
      }
    }
    
    // For regular words, advance text position
    textPosition += token.word.length
    
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
    
    // Extract compound word structure
    const compound = extractCompoundStructure(wordInfo)

    return {
      word: token.word,
      reading,
      meaning: compound ? [] : meanings, // Don't show flattened meanings for compound words
      partOfSpeech,
      conjugation,
      alternatives,
      compound,
    }
  }).filter(token => 
    // Filter out empty tokens but keep punctuation (which may be wrapped in spaces)
    token.word.length > 0 && (token.word.trim().length > 0 || /[^\s]/.test(token.word))
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
  
  // Check alternatives for reading (this fixes tokens like 背 that come from alternative entries)
  if (wordInfo.alternative && wordInfo.alternative.length > 0) {
    for (const alt of wordInfo.alternative) {
      if (alt.text === originalWord && alt.kana) {
        const altKana = Array.isArray(alt.kana) ? alt.kana[0] : alt.kana
        if (altKana && altKana !== originalWord) {
          return altKana
        }
      }
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
  
  // Alternative meanings (check early, not just as fallback)
  if (wordInfo.alternative) {
    for (const alt of wordInfo.alternative) {
      if (alt.gloss) {
        for (const glossItem of alt.gloss) {
          if (glossItem.gloss && !meanings.includes(glossItem.gloss)) {
            meanings.push(glossItem.gloss)
          }
        }
      }
    }
  }
  
  if (meanings.length === 0) {
    // Check if this is actually just a string token (unknown word) or GAP type
    if (typeof wordInfo === 'string' || wordInfo.type === 'GAP') {
      return [] // No meanings for unknown/gap tokens
    } else if (wordInfo.score === 0 || !wordInfo.gloss) {
      // Low-score or incomplete entries from ichiran (particles, small words, etc.)
      return [] // No meanings for incomplete entries
    } else {
      // This is a genuine parsing error - we have a word object but couldn't extract meaning
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
        const parsedPosList = parsePartOfSpeech(glossItem.pos)
        for (const cleanedPos of parsedPosList) {
          if (cleanedPos && !pos.includes(cleanedPos)) {
            pos.push(cleanedPos)
          }
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
            const parsedPosList = parsePartOfSpeech(propItem.pos)
            for (const cleanedPos of parsedPosList) {
              if (cleanedPos && !pos.includes(cleanedPos)) {
                pos.push(cleanedPos)
              }
            }
          }
        }
      }
      // Also check conjugation gloss for POS
      if (conjItem.gloss) {
        for (const glossItem of conjItem.gloss) {
          if (glossItem.pos) {
            const parsedPosList = parsePartOfSpeech(glossItem.pos)
            for (const cleanedPos of parsedPosList) {
              if (cleanedPos && !pos.includes(cleanedPos)) {
                pos.push(cleanedPos)
              }
            }
          }
        }
      }
    }
  }
  
  // From alternatives (this fixes tokens like 背 that come from alternative entries)
  if (wordInfo.alternative && pos.length === 0) {
    for (const alt of wordInfo.alternative) {
      if (alt.gloss) {
        for (const glossItem of alt.gloss) {
          if (glossItem.pos) {
            const parsedPosList = parsePartOfSpeech(glossItem.pos)
            for (const cleanedPos of parsedPosList) {
              if (cleanedPos && !pos.includes(cleanedPos)) {
                pos.push(cleanedPos)
              }
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
            const parsedPosList = parsePartOfSpeech(glossItem.pos)
            for (const cleanedPos of parsedPosList) {
              if (cleanedPos && !pos.includes(cleanedPos)) {
                pos.push(cleanedPos)
              }
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
                const parsedPosList = parsePartOfSpeech(propItem.pos)
                for (const cleanedPos of parsedPosList) {
                  if (cleanedPos && !pos.includes(cleanedPos)) {
                    pos.push(cleanedPos)
                  }
                }
              }
            }
          }
          if (conjItem.gloss) {
            for (const glossItem of conjItem.gloss) {
              if (glossItem.pos) {
                const parsedPosList = parsePartOfSpeech(glossItem.pos)
                for (const cleanedPos of parsedPosList) {
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
  }
  
  // Fallback based on word type
  if (pos.length === 0) {
    pos.push('Unknown')
  }
  
  return pos
}

/**
 * Parse and clean part of speech tags, handling comma-separated multiple POS
 */
function parsePartOfSpeech(pos: string): string[] {
  // Remove brackets and clean up
  const cleaned = pos.replace(/[\[\]]/g, '').trim()
  
  // Split by comma to handle multiple POS like "aux-v,cop-da,cop"
  const posTags = cleaned.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
  
  const result: string[] = []
  
  for (const tag of posTags) {
    // Check if it's a valid POS enum value
    if (Object.values(PartOfSpeech).includes(tag as PartOfSpeech)) {
      // Use the human-readable label from our enum
      const posEnum = tag as PartOfSpeech
      result.push(PartOfSpeechLabels[posEnum])
    } else {
      // Fallback for unknown tags - log for debugging
      console.warn('Unknown POS tag encountered:', tag)
      result.push(tag)
    }
  }
  
  return result.length > 0 ? result : [cleaned]
}

/**
 * Extract conjugation information
 */
function extractConjugation(wordInfo: IchiranWordInfo): string[] {
  const conjugations: string[] = []
  
  if (wordInfo.conjugations && wordInfo.conjugations !== 'ROOT') {
    conjugations.push(wordInfo.conjugations)
  }
  
  if (wordInfo.conj && wordInfo.conj.length > 0) {
    const conjInfo = wordInfo.conj[0]
    if (conjInfo.prop && conjInfo.prop.length > 0) {
      const propInfo = conjInfo.prop[0]
      if (propInfo.type) {
        conjugations.push(propInfo.type)
      }
    }
  }
  
  // Check alternatives for conjugation info
  if (wordInfo.alternative) {
    for (const alt of wordInfo.alternative) {
      if (alt.conj && alt.conj.length > 0) {
        const conjInfo = alt.conj[0]
        if (conjInfo.prop && conjInfo.prop.length > 0) {
          const propInfo = conjInfo.prop[0]
          if (propInfo.type && !conjugations.includes(propInfo.type)) {
            conjugations.push(propInfo.type)
          }
        }
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
          if (propInfo.type && !conjugations.includes(propInfo.type)) {
            conjugations.push(propInfo.type)
          }
        }
      }
      
      // Also check for suffix information
      if (component.suffix && !conjugations.includes(component.suffix)) {
        conjugations.push(component.suffix)
      }
    }
  }
  
  return conjugations
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
 * Extract compound word structure if available
 */
function extractCompoundStructure(wordInfo: IchiranWordInfo): { parts: string[]; components: Array<{ word: string; reading: string; meaning: string[]; partOfSpeech: string[]; conjugation: string[] }> } | undefined {
  if (!wordInfo.compound || !wordInfo.components || wordInfo.compound.length === 0 || wordInfo.components.length === 0) {
    return undefined
  }
  
  const components = wordInfo.components.map(component => {
    const reading = extractReading(component, component.text)
    const meanings = extractMeanings(component)
    const partOfSpeech = extractPartOfSpeech(component)
    const conjugation = extractConjugation(component)
    
    return {
      word: component.text,
      reading,
      meaning: meanings,
      partOfSpeech,
      conjugation,
    }
  })
  
  return {
    parts: wordInfo.compound,
    components,
  }
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
    .replace(/\s+/g, ' ') // Normalize whitespace to single spaces
    .trim()
}