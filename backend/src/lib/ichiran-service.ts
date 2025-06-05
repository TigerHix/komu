import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import type { 
  IchiranRawResult, 
  IchiranToken, 
  TokenizeResponse,
  IchiranTokenTuple,
  WordInfoWithGloss 
} from '../types/ichiran'

const execAsync = promisify(exec)

export class IchiranService {
  private containerName = 'komu-ichiran-service'
  private isInitializing = false
  private isReady = false
  private initializationPromise: Promise<void> | null = null
  private ichiranPath: string

  constructor() {
    // Get ichiran directory path - configurable via environment or default to ../packages/ichiran
    const ichiranDir = process.env.ICHIRAN_PATH || '../../../packages/ichiran'
    this.ichiranPath = path.resolve(__dirname, ichiranDir)
    
    // Container naming can also be configured
    this.containerName = process.env.ICHIRAN_CONTAINER_NAME || 'komu-ichiran-service'
    
    console.log(`🗾 Ichiran service configured:`)
    console.log(`   - Path: ${this.ichiranPath}`)
    console.log(`   - Container: ${this.containerName}`)
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      ichiranPath: this.ichiranPath,
      containerName: this.containerName,
      projectName: 'komu-ichiran',
      isReady: this.isReady,
      isInitializing: this.isInitializing
    }
  }

  /**
   * Initialize ichiran service (start container if needed)
   */
  async initialize(): Promise<void> {
    if (this.isReady) return
    
    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise
    }

    this.isInitializing = true
    this.initializationPromise = this._initialize()
    
    try {
      await this.initializationPromise
      this.isReady = true
    } finally {
      this.isInitializing = false
    }
  }

  private async _initialize(): Promise<void> {
    console.log('🚀 Initializing ichiran service...')
    
    // Check if container already exists and is running
    if (await this.isContainerRunning()) {
      console.log('✅ Ichiran container already running')
      await this.waitForReady()
      return
    }

    // Check if container exists but is stopped
    if (await this.containerExists()) {
      console.log('🔄 Starting existing ichiran container...')
      await this.startContainer()
    } else {
      console.log('🏗️  Creating new ichiran container...')
      await this.createAndStartContainer()
    }

    await this.waitForReady()
    console.log('✅ Ichiran service ready!')
  }

  /**
   * Check if ichiran Docker container is running
   */
  async isContainerRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker ps --filter "name=${this.containerName}" --format "{{.Names}}"`)
      return stdout.trim() === this.containerName
    } catch (error) {
      console.error('Failed to check ichiran availability:', error)
      return false
    }
  }

  /**
   * Check if container exists (running or stopped)
   */
  async containerExists(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker ps -a --filter "name=${this.containerName}" --format "{{.Names}}"`)
      return stdout.trim() === this.containerName
    } catch (error) {
      return false
    }
  }

  /**
   * Start existing container
   */
  async startContainer(): Promise<void> {
    try {
      await execAsync(`docker start ${this.containerName}`)
    } catch (error) {
      throw new Error(`Failed to start ichiran container: ${error}`)
    }
  }

  /**
   * Create and start new container from ichiran directory
   */
  async createAndStartContainer(): Promise<void> {
    try {
      console.log(`📁 Using ichiran source at: ${this.ichiranPath}`)
      
      // Check if ichiran directory exists
      const fs = await import('fs/promises')
      try {
        await fs.access(this.ichiranPath)
      } catch (error) {
        throw new Error(`Ichiran directory not found at ${this.ichiranPath}. Please ensure ichiran is in the correct location.`)
      }
      
      // Build the images if they don't exist
      console.log('🔨 Building ichiran Docker images...')
      await execAsync(`cd "${this.ichiranPath}" && docker compose build`, { 
        timeout: 600000 // 10 minutes timeout for build
      })
      
      // Start the services with custom container name
      console.log('🚀 Starting ichiran services...')
      
      // Set environment variable to override container name
      process.env.COMPOSE_PROJECT_NAME = 'komu-ichiran'
      
      await execAsync(`cd "${this.ichiranPath}" && docker compose up -d`, {
        timeout: 600000 // 10 minutes timeout for startup
      })
      
      // Update container name to match docker-compose naming
      this.containerName = 'komu-ichiran-main-1'
      
    } catch (error) {
      throw new Error(`Failed to create ichiran container: ${error}`)
    }
  }

  /**
   * Wait for ichiran to be ready (database loaded, etc.)
   */
  async waitForReady(): Promise<void> {
    console.log('⏳ Waiting for ichiran to be ready...')
    
    const maxAttempts = 60 // 5 minutes with 5-second intervals
    let attempts = 0
    
    while (attempts < maxAttempts) {
      try {
        // Test if ichiran is responding
        const { stdout } = await execAsync(
          `docker exec ${this.containerName} ichiran-cli -f "test"`,
          { timeout: 10000 }
        )
        
        if (stdout.trim().length > 0) {
          console.log('✅ Ichiran is responding')
          return
        }
      } catch (error) {
        // Ichiran not ready yet, continue waiting
      }
      
      attempts++
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      
      if (attempts % 6 === 0) { // Log every 30 seconds
        console.log(`⏳ Still waiting for ichiran... (${attempts * 5}s elapsed)`)
      }
    }
    
    throw new Error('Ichiran failed to become ready within timeout period')
  }

  /**
   * Check if service is available and ready
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isReady) {
      try {
        await this.initialize()
      } catch (error) {
        console.error('Failed to initialize ichiran:', error)
        return false
      }
    }
    
    return this.isContainerRunning()
  }

  /**
   * Tokenize Japanese text using ichiran
   */
  async tokenize(text: string): Promise<TokenizeResponse> {
    // Ensure ichiran is initialized and ready
    await this.initialize()
    
    if (!await this.isContainerRunning()) {
      throw new Error('Ichiran service failed to start or is not responding.')
    }

    try {
      // Escape text for shell command
      const escapedText = text.replace(/"/g, '\\"').replace(/'/g, "\\'")
      
      // Get JSON output from ichiran
      const { stdout: jsonOutput } = await execAsync(
        `docker exec -i ${this.containerName} ichiran-cli -f "${escapedText}"`
      )

      // Get romanized output for reference
      const { stdout: romanizedOutput } = await execAsync(
        `docker exec -i ${this.containerName} ichiran-cli -i "${escapedText}"`
      )

      // Parse the raw JSON response
      const rawResult: IchiranRawResult = JSON.parse(jsonOutput.trim())
      
      // Extract romanized text (first line of the romanized output)
      const romanized = romanizedOutput.split('\n')[0]?.trim() || ''

      // Convert raw ichiran format to simplified tokens
      const tokens = this.parseTokens(rawResult)

      // Calculate total score (sum of all segmentation scores)
      const totalScore = this.calculateTotalScore(rawResult)

      return {
        success: true,
        original: text,
        romanized,
        tokens,
        totalScore,
        raw: rawResult
      }

    } catch (error) {
      console.error('Ichiran tokenization failed:', error)
      throw new Error(`Tokenization failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Parse raw ichiran output into simplified token format
   */
  private parseTokens(rawResult: IchiranRawResult): IchiranToken[] {
    const tokens: IchiranToken[] = []

    try {
      // Based on actual ichiran output: [[[[["token", {info}, []], ...], score]], "punctuation"]
      for (const outerSegmentation of rawResult) {
        if (Array.isArray(outerSegmentation)) {
          for (const segmentation of outerSegmentation) {
            if (Array.isArray(segmentation) && segmentation.length >= 1) {
              const firstElement = segmentation[0]
              
              if (Array.isArray(firstElement) && firstElement.length >= 1) {
                // The firstElement itself IS the array of token tuples
                for (const tokenTuple of firstElement) {
                  if (Array.isArray(tokenTuple) && tokenTuple.length >= 2) {
                    const romanized = tokenTuple[0]
                    const wordInfo = tokenTuple[1]
                    const alternatives = tokenTuple[2] || []
                    
                    if (wordInfo && typeof wordInfo === 'object') {
                      // Handle words with alternatives but no direct text
                      let word = wordInfo.text
                      if (!word && wordInfo.alternative && Array.isArray(wordInfo.alternative) && wordInfo.alternative.length > 0) {
                        word = wordInfo.alternative[0].text
                      }
                      
                      if (word) {
                        const token = {
                          word: word,
                          romanized: romanized || word,
                          info: wordInfo,
                          alternatives: Array.isArray(alternatives) ? alternatives : []
                        }
                        tokens.push(token)
                      }
                    }
                  }
                }
              }
            }
          }
        } else if (typeof outerSegmentation === 'string' && outerSegmentation.trim()) {
          // Handle punctuation/ellipses that appear as strings
          tokens.push({
            word: outerSegmentation,
            romanized: outerSegmentation,
            info: {
              text: outerSegmentation,
              kana: outerSegmentation,
              type: 'GAP'
            } as WordInfoWithGloss,
            alternatives: []
          })
        }
      }
    } catch (error) {
      console.error('Error parsing ichiran tokens:', error)
      console.error('Raw result structure:', JSON.stringify(rawResult, null, 2))
      
      // Fallback: try to extract any text we can find
      return this.extractFallbackTokens(rawResult)
    }

    return tokens
  }

  /**
   * Fallback parsing method for when structure doesn't match expectations
   */
  private extractFallbackTokens(rawResult: any): IchiranToken[] {
    const tokens: IchiranToken[] = []
    
    const extractTextRecursively = (obj: any): void => {
      if (typeof obj === 'string' && obj.trim().length > 0) {
        tokens.push({
          word: obj,
          romanized: obj,
          info: {
            text: obj,
            kana: obj,
            type: 'KANA'
          } as WordInfoWithGloss,
          alternatives: []
        })
      } else if (Array.isArray(obj)) {
        obj.forEach(extractTextRecursively)
      } else if (obj && typeof obj === 'object') {
        if (obj.text) {
          tokens.push({
            word: obj.text,
            romanized: obj.kana || obj.text,
            info: obj,
            alternatives: []
          })
        } else {
          Object.values(obj).forEach(extractTextRecursively)
        }
      }
    }
    
    extractTextRecursively(rawResult)
    return tokens
  }

  /**
   * Calculate total score from all segmentations
   */
  private calculateTotalScore(rawResult: IchiranRawResult): number {
    let totalScore = 0
    
    try {
      // Based on actual ichiran output: [[[[[token arrays], score]]]]
      for (const outerSegmentation of rawResult) {
        if (Array.isArray(outerSegmentation)) {
          for (const segmentation of outerSegmentation) {
            if (Array.isArray(segmentation) && segmentation.length >= 1) {
              const tokenArraysWithScore = segmentation[0]
              
              if (Array.isArray(tokenArraysWithScore) && tokenArraysWithScore.length >= 2) {
                const score = tokenArraysWithScore[1]
                if (typeof score === 'number') {
                  totalScore += score
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error calculating total score:', error)
    }
    
    return totalScore
  }

  /**
   * Get alternative readings for a specific word
   */
  async getAlternatives(text: string): Promise<WordInfoWithGloss[]> {
    const result = await this.tokenize(text)
    
    // Find the token and return all alternatives from components
    for (const token of result.tokens) {
      if (token.word === text && token.info.alternative) {
        return token.info.alternative || []
      }
    }
    
    return []
  }

  /**
   * Stop and cleanup ichiran service
   */
  async cleanup(): Promise<void> {
    if (!await this.containerExists()) {
      return
    }

    try {
      console.log('🧹 Stopping ichiran service...')
      
      // Stop the container using docker-compose
      process.env.COMPOSE_PROJECT_NAME = 'komu-ichiran'
      
      await execAsync(`cd "${this.ichiranPath}" && docker compose down`)
      console.log('✅ Ichiran service stopped')
      
      this.isReady = false
    } catch (error) {
      console.error('Failed to cleanup ichiran service:', error)
    }
  }

  /**
   * Restart ichiran service
   */
  async restart(): Promise<void> {
    await this.cleanup()
    this.isReady = false
    this.isInitializing = false
    this.initializationPromise = null
    await this.initialize()
  }
}

// Export singleton instance
export const ichiranService = new IchiranService()