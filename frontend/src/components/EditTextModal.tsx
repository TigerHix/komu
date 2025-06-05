import React, { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EditContext {
  originalText: string
  textBlockId: string | undefined
  selectedBlock: any
  imagePath: string | undefined
  imageSize: { width: number; height: number } | undefined
}

interface EditTextModalProps {
  isOpen: boolean
  editContext: EditContext | null
  onSave: (editedText: string) => Promise<void>
  onCancel: () => void
}

export function EditTextModal({ isOpen, editContext, onSave, onCancel }: EditTextModalProps) {
  const [editedText, setEditedText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isPerformingOcr, setIsPerformingOcr] = useState(false)
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Set edited text when modal opens
  useEffect(() => {
    if (isOpen && editContext) {
      setEditedText(editContext.originalText)
      // Focus after modal animation starts
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.select()
        }
      }, 100)
    }
  }, [isOpen, editContext])

  // Create cropped image when modal opens
  const createCroppedImage = useCallback(async () => {
    if (!editContext?.selectedBlock || !editContext?.imagePath || !editContext?.imageSize) {
      return
    }

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = editContext.imagePath!.startsWith('/') ? editContext.imagePath! : `/${editContext.imagePath!}`
      })

      const canvas = canvasRef.current || document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Calculate crop dimensions with padding
      const padding = 10
      const [x1, y1, x2, y2] = editContext.selectedBlock.bbox
      const cropX = Math.max(0, x1 - padding)
      const cropY = Math.max(0, y1 - padding)
      const cropWidth = Math.min(editContext.imageSize!.width - cropX, (x2 - x1) + (padding * 2))
      const cropHeight = Math.min(editContext.imageSize!.height - cropY, (y2 - y1) + (padding * 2))

      canvas.width = cropWidth
      canvas.height = cropHeight

      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      )

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          setCroppedImageUrl(url)
        }
      }, 'image/jpeg', 0.9)

    } catch (error) {
      console.error('Failed to create cropped image:', error)
    }
  }, [editContext])

  useEffect(() => {
    if (isOpen && !croppedImageUrl) {
      createCroppedImage()
    }
  }, [isOpen, createCroppedImage, croppedImageUrl])

  // Clean up cropped image URL when modal closes
  useEffect(() => {
    if (!isOpen && croppedImageUrl) {
      URL.revokeObjectURL(croppedImageUrl)
      setCroppedImageUrl(null)
    }
  }, [isOpen, croppedImageUrl])

  const handlePerformOcr = useCallback(async () => {
    if (!editContext?.selectedBlock || !editContext?.imagePath || !editContext?.imageSize) {
      console.error('Missing context for OCR')
      return
    }

    setIsPerformingOcr(true)
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = editContext.imagePath!.startsWith('/') ? editContext.imagePath! : `/${editContext.imagePath!}`
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('Failed to get canvas context')
        return
      }

      // Calculate crop dimensions with padding
      const padding = 10
      const [x1, y1, x2, y2] = editContext.selectedBlock.bbox
      const cropX = Math.max(0, x1 - padding)
      const cropY = Math.max(0, y1 - padding)
      const cropWidth = Math.min(editContext.imageSize!.width - cropX, (x2 - x1) + (padding * 2))
      const cropHeight = Math.min(editContext.imageSize!.height - cropY, (y2 - y1) + (padding * 2))

      canvas.width = cropWidth
      canvas.height = cropHeight

      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      )

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!)
        }, 'image/jpeg', 0.9)
      })

      const formData = new FormData()
      formData.append('file', blob, 'cropped_text.jpg')

      const response = await fetch('/api/ocr/analyze-image', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        if (result.text) {
          setEditedText(result.text.trim())
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
        }
      } else {
        console.error('OCR request failed:', response.status)
      }
    } catch (error) {
      console.error('Error performing OCR:', error)
    } finally {
      setIsPerformingOcr(false)
    }
  }, [editContext])

  const handleSave = useCallback(async () => {
    if (!editedText.trim()) return
    
    setIsSaving(true)
    try {
      await onSave(editedText.trim())
    } finally {
      setIsSaving(false)
    }
  }, [editedText, onSave])

  const handleCancel = useCallback(() => {
    setEditedText(editContext?.originalText || '')
    onCancel()
  }, [editContext, onCancel])

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancel()
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ 
              type: "spring",
              stiffness: 500,
              damping: 30,
              mass: 1
            }}
            className="bg-surface-1 rounded-2xl shadow-2xl w-full max-w-lg mx-auto border border-border overflow-hidden select-text"
            style={{
              boxShadow: `
                0 25px 50px -12px rgba(0, 0, 0, 0.25),
                0 0 0 1px rgba(255, 255, 255, 0.05),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `
            }}
          >
            {/* Modal Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="px-6 pt-6 pb-4 select-text"
            >
              <h3 className="apple-headline font-semibold text-text-primary select-text">Edit OCR Text</h3>
            </motion.div>
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="px-6 pb-2 space-y-6 select-text"
            >
              {/* Original Image Section */}
              <div className="space-y-3 select-text">
                <label className="apple-callout text-text-secondary font-medium select-text">Original Image:</label>
                <div className="relative rounded-xl border-2 border-border overflow-hidden bg-surface-2 select-text">
                  {croppedImageUrl ? (
                    <motion.img
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      src={croppedImageUrl}
                      alt="Cropped text region"
                      className="w-full h-auto max-h-32 object-contain"
                      style={{ imageRendering: 'crisp-edges' }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-24 text-text-tertiary select-text">
                      <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                      <span className="ml-2 text-sm select-text">Processing image...</span>
                    </div>
                  )}
                </div>
                
                {/* OCR Button */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-3"
                >
                  <Button
                    onClick={handlePerformOcr}
                    disabled={isPerformingOcr || isSaving}
                    variant="ghost"
                    className="w-full apple-callout font-medium border border-border hover:bg-surface-2"
                  >
                    {isPerformingOcr ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                        Performing OCR...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Perform OCR
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
              
              {/* Text Section */}
              <div className="space-y-3 select-text">
                <label className="apple-callout text-text-secondary font-medium select-text">Text:</label>
                <textarea
                  ref={textareaRef}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full p-4 bg-surface-2 border border-border rounded-xl text-text-primary apple-body resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 select-text"
                  rows={3}
                  placeholder="Enter the text..."
                  disabled={isSaving || isPerformingOcr}
                  style={{ 
                    minHeight: '100px'
                  }}
                />
              </div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                className="text-xs text-text-tertiary bg-accent/5 border border-accent/20 rounded-lg p-3 select-text"
              >
                💡 Tip: Correct any OCR errors to improve grammar analysis accuracy
              </motion.div>
            </motion.div>
            
            {/* Modal Footer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="flex gap-3 p-6 pt-4"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1"
              >
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isSaving || isPerformingOcr}
                  className="w-full apple-callout font-medium"
                >
                  Cancel
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1"
              >
                <Button
                  onClick={handleSave}
                  disabled={isSaving || isPerformingOcr || editedText.trim() === ''}
                  className="w-full bg-accent hover:bg-accent/90 text-white apple-callout font-medium"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
          
          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}