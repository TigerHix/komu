// Ichiran Japanese tokenization types
// Based on actual codebase analysis from ichiran dict.lisp and cli.lisp

// Core word information structure from dict.lisp word-info class
export interface WordInfo {
  type?: 'KANJI' | 'KANA' | 'GAP'
  text: string
  'true-text'?: string
  kana: string | string[]
  seq?: number
  conjugations?: string | 'ROOT'
  score?: number
  components?: WordInfo[]
  primary?: boolean
  start?: number
  end?: number
  counter?: {
    value: string
    ordinal: boolean
  }
  skipped?: number
}

// Gloss/definition information from get-senses-json
export interface GlossInfo {
  pos: string      // Part of speech like "[adj-i]", "[n,vs]"
  gloss: string    // English definition
  field?: string   // Field tags like "{comp}", "{MA}"
  info?: string    // Additional info like "usually written using kana alone"
}

// Conjugation information structure
export interface ConjugationInfo {
  prop?: Array<{
    type: string   // Like "Conjunctive (~te)", "Continuative (~i)"
    pos: string    // Part of speech like "v5r", "adj-i"
    form?: string
  }>
  reading?: string
  gloss?: GlossInfo[]
  readok?: boolean
  via?: ConjugationInfo[]
}

// Extended word info with dictionary definitions (from word-info-gloss-json)
export interface WordInfoWithGloss extends WordInfo {
  reading?: string
  gloss?: GlossInfo[]
  suffix?: string
  conj?: ConjugationInfo[]
  compound?: string[]
  alternative?: WordInfoWithGloss[]
  components?: WordInfoWithGloss[]
}

// The actual tuple structure from ichiran -f output: [romanized, word-info, custom-props]
export type IchiranTokenTuple = [string, WordInfoWithGloss, any[]]

// Segmentation structure from romanize* function
export interface IchiranSegmentation {
  0: Array<{
    0: IchiranTokenTuple[]  // Array of [romanized, word-info, custom-props]
    1: number               // Segmentation score
  }>
  1?: string               // Non-word text segments (punctuation, etc.)
}

// Top-level result structure from ichiran -f (array of segmentations and strings)
export type IchiranRawResult = (IchiranSegmentation | string)[]

// Simplified token interface for API responses
export interface IchiranToken {
  word: string
  romanized: string
  info: WordInfoWithGloss
  alternatives: any[]
}

// API request/response interfaces
export interface TokenizeRequest {
  text: string
}

export interface TokenizeResponse {
  success: boolean
  original: string
  romanized: string
  tokens: IchiranToken[]
  totalScore: number
  raw?: IchiranRawResult
}