import { readFileSync } from 'fs'
import { join } from 'path'

class PromptLoader {
  private prompts: Map<string, string> = new Map()
  
  constructor() {
    this.loadPrompts()
  }
  
  private loadPrompts() {
    try {
      const promptsDir = join(__dirname, '../../prompts')
      
      // Load system prompt
      const systemPrompt = readFileSync(join(promptsDir, 'system.txt'), 'utf-8')
      this.prompts.set('system', systemPrompt)
      
      // Load whole sentence prompt
      const wholeSentencePrompt = readFileSync(join(promptsDir, 'whole-sentence.txt'), 'utf-8')
      this.prompts.set('whole-sentence', wholeSentencePrompt)
      
      // Load partial selection prompt
      const partialSelectionPrompt = readFileSync(join(promptsDir, 'partial-selection.txt'), 'utf-8')
      this.prompts.set('partial-selection', partialSelectionPrompt)
      
      console.log('Successfully loaded system prompts')
    } catch (error) {
      console.error('Failed to load system prompts:', error)
      throw new Error('Could not load system prompts')
    }
  }
  
  getSystemPrompt(): string {
    const prompt = this.prompts.get('system')
    if (!prompt) {
      throw new Error('System prompt not found')
    }
    return prompt
  }
  
  getUserPrompt(type: 'whole-sentence' | 'partial-selection', sentence: string, selectedText?: string): string {
    const template = this.prompts.get(type)
    if (!template) {
      throw new Error(`Prompt template not found for type: ${type}`)
    }
    
    let prompt = template.replace('[SENTENCE]', sentence)
    if (selectedText && type === 'partial-selection') {
      prompt = prompt.replace('[SELECTED_TEXT]', selectedText)
    }
    
    return prompt
  }
}

// Export singleton instance
export const promptLoader = new PromptLoader()