import { Elysia } from 'elysia'
import path from 'path'
import fs from 'fs'

interface OCRRequest {
  mangaId: string
  pageNum: number
  imagePath: string
}

interface TextBlock {
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

const INFERENCE_SERVICE_URL = process.env.INFERENCE_SERVICE_URL || `http://localhost:${process.env.INFERENCE_PORT || '8847'}`

interface InferenceServiceResponse {
  success: boolean
  error?: string
  textBlocks?: any[]
  imageSize?: { width: number; height: number }
}

interface InferenceServiceError {
  detail: string
}

async function callInferenceService(imagePath: string): Promise<InferenceServiceResponse> {
  const formData = new FormData()
  
  // Read the image file and create a Blob
  const imageBuffer = fs.readFileSync(imagePath)
  const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
  formData.append('file', imageBlob, path.basename(imagePath))
  
  // Add the original path for debug image saving
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

export const ocrRoute = new Elysia({ prefix: '/api' })
  .post('/ocr', async ({ body, set }) => {
    try {
      const { mangaId, pageNum, imagePath } = body as OCRRequest
      
      console.log(`OCR request for manga ${mangaId}, page ${pageNum}`)
      
      // Construct the full path to the image
      const fullImagePath = path.join(process.cwd(), 'uploads', imagePath.replace('/uploads/', ''))
      
      // Check if image exists
      if (!fs.existsSync(fullImagePath)) {
        set.status = 404
        return { error: 'Image not found', path: fullImagePath }
      }
      
      console.log(`Processing image: ${fullImagePath}`)
      
      // Call the inference service
      const result = await callInferenceService(fullImagePath)
      
      if (!result.success) {
        set.status = 500
        return { error: result.error || 'OCR processing failed' }
      }
      
      return {
        success: true,
        textBlocks: result.textBlocks || [],
        imageSize: result.imageSize,
        processingTime: Date.now()
      }
      
    } catch (error) {
      console.error('OCR error:', error)
      set.status = 500
      return { 
        error: 'OCR processing failed', 
        details: error instanceof Error ? error.message : String(error)
      }
    }
  })