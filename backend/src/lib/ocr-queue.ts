import { prisma } from './db'
import { wsManager } from './websocket'
import { EventEmitter } from 'events'
import path from 'path'
import fs from 'fs'

export interface QueueItem {
  pageId: string
  mangaId: string
  pageNum: number
  imagePath: string
  priority: 'normal' | 'high'
  addedAt: Date
}

export interface OcrProgress {
  totalPages: number
  processedPages: number
  currentManga?: string
  currentPage?: number
  estimatedTimeRemaining?: number
  isProcessing: boolean
  isPaused: boolean
}

export interface TextBlockData {
  bbox: [number, number, number, number]
  width: number
  height: number
  lines: number
  vertical: boolean
  font_size: number | null
  confidence: number
  text: string
  text_lines: string[]
}

interface InferenceServiceResponse {
  success: boolean
  error?: string
  textBlocks?: TextBlockData[]
  imageSize?: { width: number; height: number }
}

interface InferenceServiceError {
  detail: string
}

const INFERENCE_SERVICE_URL = process.env.INFERENCE_SERVICE_URL || `http://localhost:${process.env.INFERENCE_PORT || '8847'}`

class OcrQueueManager extends EventEmitter {
  private queue: QueueItem[] = []
  private isProcessing = false
  private isPaused = false
  private currentProcessing: QueueItem | null = null
  private concurrency = 4
  private maxConcurrency = 16
  private processingStartTime?: Date
  private processedCount = 0
  private totalCount = 0

  constructor() {
    super()
    this.loadConfiguration()
  }

  private loadConfiguration() {
    // TODO: Load from database/config when settings page is implemented
    this.concurrency = parseInt(process.env.OCR_CONCURRENCY || '4')
    this.maxConcurrency = parseInt(process.env.OCR_MAX_CONCURRENCY || '16')
  }

  async initialize() {
    await this.loadPendingPages()
    this.startProcessing()
  }

  private async loadPendingPages() {
    const pendingPages = await prisma.page.findMany({
      where: { ocrStatus: 'PENDING' },
      include: { manga: { select: { title: true } } },
      orderBy: { pageNum: 'asc' }
    })

    this.queue = pendingPages.map(page => ({
      pageId: page.id,
      mangaId: page.mangaId,
      pageNum: page.pageNum,
      imagePath: page.imagePath,
      priority: 'normal',
      addedAt: new Date()
    }))

    this.totalCount = this.queue.length
    this.processedCount = 0
    this.emitProgress()
  }

  addPage(pageId: string, mangaId: string, pageNum: number, imagePath: string, priority: 'normal' | 'high' = 'normal') {
    const existingIndex = this.queue.findIndex(item => item.pageId === pageId)
    
    if (existingIndex !== -1) {
      // Update priority if higher
      if (priority === 'high' && this.queue[existingIndex].priority === 'normal') {
        const item = this.queue.splice(existingIndex, 1)[0]
        item.priority = 'high'
        this.queue.unshift(item) // Add to front
      }
      return
    }

    const newItem: QueueItem = {
      pageId,
      mangaId,
      pageNum,
      imagePath,
      priority,
      addedAt: new Date()
    }

    if (priority === 'high') {
      this.queue.unshift(newItem) // Add to front
    } else {
      this.queue.push(newItem) // Add to back
    }

    this.totalCount++
    this.emitProgress()
    
    if (!this.isProcessing && !this.isPaused) {
      this.startProcessing()
    }
  }

  pause() {
    this.isPaused = true
    this.emitProgress()
  }

  resume() {
    this.isPaused = false
    this.emitProgress()
    if (!this.isProcessing) {
      this.startProcessing()
    }
  }

  setPriority(pageId: string) {
    const existingIndex = this.queue.findIndex(item => item.pageId === pageId)
    if (existingIndex !== -1) {
      const item = this.queue.splice(existingIndex, 1)[0]
      item.priority = 'high'
      this.queue.unshift(item) // Move to front
      this.emitProgress()
    }
  }

  private async startProcessing() {
    if (this.isProcessing || this.isPaused || this.queue.length === 0) {
      return
    }

    this.isProcessing = true
    this.processingStartTime = new Date()
    this.emitProgress()

    try {
      // Process with concurrency (for now, process one at a time)
      while (this.queue.length > 0 && !this.isPaused) {
        const item = this.queue.shift()!
        this.currentProcessing = item
        this.emitProgress()

        try {
          await this.processPage(item)
          this.processedCount++
        } catch (error) {
          console.error(`OCR failed for page ${item.pageId}:`, error)
          await this.markPageFailed(item.pageId)
        }

        this.currentProcessing = null
        this.emitProgress()
      }
    } finally {
      this.isProcessing = false
      this.currentProcessing = null
      this.emitProgress()
      
      // Check if queue is completely finished and broadcast completion
      await this.checkAndBroadcastCompletion()
    }
  }

  private async processPage(item: QueueItem) {
    console.log(`Processing OCR for manga ${item.mangaId}, page ${item.pageNum}`)

    // Mark as processing
    await prisma.page.update({
      where: { id: item.pageId },
      data: { 
        ocrStatus: 'PROCESSING',
        ocrStartedAt: new Date()
      }
    })

    // Construct full image path
    const fullImagePath = path.join(process.cwd(), 'uploads', item.imagePath.replace('/uploads/', ''))
    
    if (!fs.existsSync(fullImagePath)) {
      throw new Error(`Image not found: ${fullImagePath}`)
    }

    // Call inference service
    const result = await this.callInferenceService(fullImagePath)
    
    if (!result.success) {
      throw new Error(result.error || 'OCR processing failed')
    }

    // Store results in database
    await this.storeOcrResults(item.pageId, result.textBlocks || [])

    // Mark as completed and store image size
    await prisma.page.update({
      where: { id: item.pageId },
      data: { 
        ocrStatus: 'COMPLETED',
        ocrCompletedAt: new Date(),
        imageWidth: result.imageSize?.width,
        imageHeight: result.imageSize?.height
      }
    })

    console.log(`OCR completed for manga ${item.mangaId}, page ${item.pageNum}`)
  }

  private async callInferenceService(imagePath: string): Promise<InferenceServiceResponse> {
    const formData = new FormData()
    
    const imageBuffer = fs.readFileSync(imagePath)
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
    formData.append('file', imageBlob, path.basename(imagePath))
    formData.append('original_path', imagePath)
    
    const response = await fetch(`${INFERENCE_SERVICE_URL}/ocr/detect`, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' })) as InferenceServiceError
      throw new Error(`Inference service error: ${error.detail || response.statusText}`)
    }
    
    return await response.json() as InferenceServiceResponse
  }

  private async storeOcrResults(pageId: string, textBlocks: TextBlockData[]) {
    const data = textBlocks.map(block => ({
      pageId,
      text: block.text,
      bbox: JSON.stringify(block.bbox),
      width: block.width,
      height: block.height,
      lines: block.lines,
      vertical: block.vertical,
      fontSize: block.font_size,
      confidence: block.confidence,
      textLines: JSON.stringify(block.text_lines)
    }))

    if (data.length > 0) {
      await prisma.textBlock.createMany({ data })
    }
  }

  private async markPageFailed(pageId: string) {
    await prisma.page.update({
      where: { id: pageId },
      data: { ocrStatus: 'FAILED' }
    })
    
    // Broadcast failure status to frontend
    wsManager.broadcastPageUpdate(pageId, 'FAILED')
  }

  private async checkAndBroadcastCompletion() {
    // Only check completion if queue is empty and not processing
    if (this.queue.length === 0 && !this.isProcessing) {
      // Check if there are any pending pages in the database
      const pendingCount = await prisma.page.count({
        where: { ocrStatus: 'PENDING' }
      })
      
      // If no pending pages, queue is truly complete
      if (pendingCount === 0) {
        const stats = await prisma.page.groupBy({
          by: ['ocrStatus'],
          _count: true,
          where: {
            ocrStatus: {
              in: ['COMPLETED', 'FAILED']
            }
          }
        })
        
        const completedPages = stats.find(s => s.ocrStatus === 'COMPLETED')?._count || 0
        const failedPages = stats.find(s => s.ocrStatus === 'FAILED')?._count || 0
        const totalPages = completedPages + failedPages
        
        // Only broadcast if there were actually pages processed
        if (totalPages > 0) {
          // Create persistent completion status
          await prisma.ocrCompletionStatus.create({
            data: {
              totalPages,
              completedPages,
              failedPages,
              completedAt: new Date(),
              status: 'unread'
            }
          })

          // Send real-time notification
          wsManager.broadcastQueueComplete({
            totalPages,
            completedPages,
            failedPages
          })
        }
      }
    }
  }

  private emitProgress() {
    // Calculate total and processed dynamically for current queue session
    const totalPages = this.queue.length + this.processedCount + (this.currentProcessing ? 1 : 0)
    
    const progress: OcrProgress = {
      totalPages,
      processedPages: this.processedCount,
      currentManga: this.currentProcessing?.mangaId,
      currentPage: this.currentProcessing?.pageNum,
      isProcessing: this.isProcessing,
      isPaused: this.isPaused
    }

    // Calculate ETA
    if (this.isProcessing && this.processingStartTime && this.processedCount > 0) {
      const elapsed = Date.now() - this.processingStartTime.getTime()
      const avgTimePerPage = elapsed / this.processedCount
      const remainingPages = this.queue.length + (this.currentProcessing ? 1 : 0)
      progress.estimatedTimeRemaining = avgTimePerPage * remainingPages
    }

    this.emit('progress', progress)
  }

  getProgress(): OcrProgress {
    // Calculate total and processed dynamically for current queue session
    const totalPages = this.queue.length + this.processedCount + (this.currentProcessing ? 1 : 0)
    
    const progress: OcrProgress = {
      totalPages,
      processedPages: this.processedCount,
      currentManga: this.currentProcessing?.mangaId,
      currentPage: this.currentProcessing?.pageNum,
      isProcessing: this.isProcessing,
      isPaused: this.isPaused
    }

    if (this.isProcessing && this.processingStartTime && this.processedCount > 0) {
      const elapsed = Date.now() - this.processingStartTime.getTime()
      const avgTimePerPage = elapsed / this.processedCount
      const remainingPages = this.queue.length + (this.currentProcessing ? 1 : 0)
      progress.estimatedTimeRemaining = avgTimePerPage * remainingPages
    }

    return progress
  }

  setConcurrency(concurrency: number) {
    this.concurrency = Math.min(Math.max(1, concurrency), this.maxConcurrency)
  }

  getConcurrency() {
    return this.concurrency
  }

  getMaxConcurrency() {
    return this.maxConcurrency
  }
}

export const ocrQueue = new OcrQueueManager()