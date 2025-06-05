import { Elysia, t } from 'elysia'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

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

async function callInferenceServiceWithBuffer(imageBuffer: Buffer, filename: string): Promise<InferenceServiceResponse> {
  const formData = new FormData()
  
  // Create a Blob from the buffer
  const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
  formData.append('file', imageBlob, filename)
  
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

async function callInferenceServiceDirectOCR(imageBuffer: Buffer, filename: string): Promise<{ success: boolean; text?: string; error?: string }> {
  const formData = new FormData()
  
  // Create a Blob from the buffer
  const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
  formData.append('file', imageBlob, filename)
  
  const response = await fetch(`${INFERENCE_SERVICE_URL}/ocr/text-only`, {
    method: 'POST',
    body: formData
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' })) as InferenceServiceError
    throw new Error(`Inference service error: ${error.detail || response.statusText}`)
  }
  
  return await response.json()
}

export const ocrRoute = new Elysia({ prefix: '/api/ocr' })
  .post('/process', async ({ body, set }) => {
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
  
  .post('/analyze-image', async ({ body, set }) => {
    try {
      const file = (body as any).file as File
      
      if (!file) {
        set.status = 400
        return { error: 'No image file provided' }
      }
      
      console.log(`OCR request for uploaded image: ${file.name}`)
      
      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer()
      const imageBuffer = Buffer.from(arrayBuffer)
      
      // Save to temp folder for debugging
      const tempDir = path.join(process.cwd(), 'uploads', 'temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      
      const timestamp = Date.now()
      const tempFilePath = path.join(tempDir, `ocr_debug_${timestamp}_${file.name}`)
      fs.writeFileSync(tempFilePath, imageBuffer)
      console.log(`Debug: Saved uploaded image to ${tempFilePath}`)
      
      // Send the image to the direct OCR inference service
      const result = await callInferenceServiceDirectOCR(imageBuffer, file.name)
      
      if (!result.success) {
        set.status = 500
        return { error: result.error || 'OCR processing failed' }
      }
      
      const extractedText = result.text || ''
      
      console.log(`Direct OCR processing completed:`)
      console.log(`- Extracted text: "${extractedText}"`)
      
      return {
        success: true,
        text: extractedText,
        method: 'direct_ocr',
        debugImagePath: tempFilePath
      }
      
    } catch (error) {
      console.error('OCR image error:', error)
      set.status = 500
      return { 
        error: 'OCR image processing failed', 
        details: error instanceof Error ? error.message : String(error)
      }
    }
  })