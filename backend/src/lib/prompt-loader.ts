import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

class PromptLoader {
  private promptsDir: string
  private supportedLanguages = ['en', 'zh']
  
  constructor() {
    this.promptsDir = join(__dirname, '../../prompts')
    console.log(`Prompt loader initialized with directory: ${this.promptsDir}`)
    console.log(`Supported languages: ${this.supportedLanguages.join(', ')}`)
  }
  
  private loadPrompt(language: string, type: string): string {
    // Fall back to English if requested language doesn't exist
    const lang = this.supportedLanguages.includes(language) ? language : 'en'
    const langDir = join(this.promptsDir, lang)
    
    if (!existsSync(langDir)) {
      throw new Error(`Prompt directory not found for language: ${lang}`)
    }
    
    const promptPath = join(langDir, `${type}.txt`)
    if (!existsSync(promptPath)) {
      throw new Error(`Prompt file not found: ${promptPath}`)
    }
    
    try {
      return readFileSync(promptPath, 'utf-8').trim()
    } catch (error) {
      console.error(`Failed to read prompt file: ${promptPath}`, error)
      throw new Error(`Could not load prompt file: ${type} for language: ${lang}`)
    }
  }
  
  getSystemPrompt(language: string = 'en', mangaTitle?: string, mangaDescription?: string): string {
    let prompt = this.loadPrompt(language, 'system')
    
    if (mangaTitle) {
      prompt = prompt.replace('[MANGA_TITLE]', mangaTitle)
    }
    if (mangaDescription) {
      prompt = prompt.replace('[MANGA_DESCRIPTION]', mangaDescription)
    }
    
    return prompt
  }
  
  getUserPrompt(type: 'whole-sentence' | 'partial-selection', sentence: string, selectedText?: string, language: string = 'en', mangaTitle?: string): string {
    const template = this.loadPrompt(language, type)
    
    let prompt = template.replace('[SENTENCE]', sentence)
    if (selectedText && type === 'partial-selection') {
      prompt = prompt.replace('[SELECTED_TEXT]', selectedText)
    }
    if (mangaTitle) {
      prompt = prompt.replace('[MANGA_TITLE]', mangaTitle)
    }
    
    return prompt
  }
}

// Export singleton instance
export const promptLoader = new PromptLoader()