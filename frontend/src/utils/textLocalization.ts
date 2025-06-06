/**
 * Utility functions for localizing Japanese grammar text and suffix descriptions
 */

import type { TFunction } from 'react-i18next'

/**
 * Localize text that might be a suffix description or regular meaning
 * @param text The text to localize
 * @param t The i18n translation function
 * @returns Localized text or original if no translation found
 */
export function getLocalizedText(text: string, t: TFunction): string {
  const localizedText = t(`grammarBreakdown.suffixDescriptions.${text}`, text)
  return localizedText !== text ? localizedText : text
}

/**
 * Localize part-of-speech entries, trying regular POS first, then suffix descriptions
 * @param pos The part-of-speech string to localize
 * @param t The i18n translation function
 * @returns Localized part-of-speech or original if no translation found
 */
export function getLocalizedPartOfSpeech(pos: string, t: TFunction): string {
  // First try regular POS translation
  const translatedPos = t(`grammarBreakdown.pos.${pos}`, pos)
  if (translatedPos !== pos) {
    return translatedPos
  }
  
  // Fall back to suffix description
  return getLocalizedText(pos, t)
}