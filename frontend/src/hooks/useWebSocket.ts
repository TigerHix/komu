import { useState, useEffect, useRef, useCallback } from 'react'

export interface OcrProgress {
  totalPages: number
  processedPages: number
  currentManga?: string
  currentPage?: number
  estimatedTimeRemaining?: number
  isProcessing: boolean
  isPaused: boolean
}

export interface MangaOcrProgress {
  mangaId: string
  totalPages: number
  processedPages: number
  isProcessing: boolean
}

interface QueueComplete {
  totalPages: number
  completedPages: number
  failedPages: number
}

interface UseWebSocketReturn {
  ocrProgress: OcrProgress | null
  queueComplete: QueueComplete | null
  mangaProgress: Record<string, MangaOcrProgress>
  pauseOcr: () => void
  resumeOcr: () => void
  clearQueueComplete: () => void
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null)
  const [queueComplete, setQueueComplete] = useState<QueueComplete | null>(null)
  const [mangaProgress, setMangaProgress] = useState<Record<string, MangaOcrProgress>>({})
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket(url)
      
      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected to', url)
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 WebSocket message received:', data)
          
          if (data.type === 'ocr-progress') {
            console.log('🔄 OCR Progress update:', data.data)
            setOcrProgress(data.data)
          } else if (data.type === 'manga-ocr-progress') {
            console.log('📚 Manga OCR Progress update:', data.data)
            // Convert array to record for easier lookup
            const progressRecord: Record<string, MangaOcrProgress> = {}
            data.data.forEach((progress: MangaOcrProgress) => {
              progressRecord[progress.mangaId] = progress
            })
            setMangaProgress(progressRecord)
          } else if (data.type === 'ocr-queue-complete') {
            console.log('✅ Queue complete:', data.data)
            setQueueComplete(data.data)
            setOcrProgress(null)
            // Clear manga progress when queue is complete
            setMangaProgress({})
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...')
        wsRef.current = null
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, 3000)
    }
  }, [url])

  const pauseOcr = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'pause_ocr' }))
    }
  }, [])

  const resumeOcr = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'resume_ocr' }))
    }
  }, [])

  const clearQueueComplete = useCallback(() => {
    setQueueComplete(null)
  }, [])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  return {
    ocrProgress,
    queueComplete,
    mangaProgress,
    pauseOcr,
    resumeOcr,
    clearQueueComplete
  }
}