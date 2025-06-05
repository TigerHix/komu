import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TextBlock } from '@/constants/reader'

interface TextPopoutModalProps {
  isOpen: boolean
  selectedBlock: TextBlock | null
  selectedBlockIndex: number | null
  imagePath: string
  imageSize: { width: number; height: number }
  onClose: () => void
  isBottomSheetExpanded?: boolean
  originalPosition?: { x: number; y: number } // Position of the original text block
  pageIndex: number // Which page the selected block is on
  sheetProgress?: number // Progress of sheet expansion (0-1)
}

export function TextPopoutModal({
  isOpen,
  selectedBlock,
  selectedBlockIndex,
  imagePath,
  imageSize,
  onClose,
  isBottomSheetExpanded = false,
  originalPosition,
  pageIndex,
  sheetProgress = 0
}: TextPopoutModalProps) {
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null)
  const [croppedDimensions, setCroppedDimensions] = useState<{ width: number; height: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Create cropped image when block is selected
  useEffect(() => {
    if (!isOpen || !selectedBlock || !imagePath) {
      setCroppedImageUrl(null)
      setCroppedDimensions(null)
      return
    }

    const createCroppedImage = async () => {
      try {
        // Create a new image element
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        // Wait for image to load
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
        })

        // Calculate crop dimensions with padding
        const padding = 10
        const [x1, y1, x2, y2] = selectedBlock.bbox
        const cropX = Math.max(0, x1 - padding)
        const cropY = Math.max(0, y1 - padding)
        const cropWidth = Math.min(imageSize.width - cropX, (x2 - x1) + (padding * 2))
        const cropHeight = Math.min(imageSize.height - cropY, (y2 - y1) + (padding * 2))

        // Create canvas for cropping
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size to crop dimensions
        canvas.width = cropWidth
        canvas.height = cropHeight

        // Draw the cropped portion
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight, // source rectangle
          0, 0, cropWidth, cropHeight // destination rectangle
        )

        // Store the actual cropped dimensions
        setCroppedDimensions({ width: cropWidth, height: cropHeight })

        // Convert to blob URL
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            setCroppedImageUrl(url)
          }
        }, 'image/jpeg', 0.9)

      } catch (error) {
        console.error('Failed to create cropped image:', error)
      }
    }

    createCroppedImage()

    // Cleanup blob URL when component unmounts or block changes
    return () => {
      if (croppedImageUrl) {
        URL.revokeObjectURL(croppedImageUrl)
      }
    }
  }, [isOpen, selectedBlock, imagePath, imageSize])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (croppedImageUrl) {
        URL.revokeObjectURL(croppedImageUrl)
      }
    }
  }, [])

  // Calculate display dimensions when we have valid data
  let displayWidth = 0
  let displayHeight = 0
  
  if (croppedDimensions) {
    const aspectRatio = croppedDimensions.width / croppedDimensions.height
    
    // Height is always 20vh
    displayHeight = window.innerHeight * 0.2 // 20vh
    // Width follows aspect ratio
    displayWidth = displayHeight * aspectRatio
    
    // If width exceeds 90vw, constrain by width instead
    const maxWidth = window.innerWidth * 0.9 // 90vw
    if (displayWidth > maxWidth) {
      displayWidth = maxWidth
      displayHeight = displayWidth / aspectRatio
    }
  }

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <AnimatePresence>
        {isOpen && selectedBlock && croppedImageUrl && croppedDimensions && (
          <motion.div
            key="textPopout"
            initial={{ 
              opacity: 0,
              scale: 0.1,
              x: originalPosition ? originalPosition.x - window.innerWidth / 2 : 0,
              y: originalPosition ? originalPosition.y - (window.innerHeight * 0.25) : 0,
            }}
            animate={{ 
              opacity: Math.max(0, 1 - sheetProgress), // Smooth fade based on progress
              scale: 1,
              x: 0,
              y: 0,
            }}
            exit={{ 
              opacity: 0,
              scale: 0.1,
              x: originalPosition ? originalPosition.x - window.innerWidth / 2 : 0,
              y: originalPosition ? originalPosition.y - (window.innerHeight * 0.25) : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
              opacity: { 
                duration: 0.3,
                ease: "easeOut"
              }
            }}
            className="fixed pointer-events-none flex items-center justify-center"
            style={{
              top: '25vh',
              left: '50vw',
              width: `${displayWidth}px`,
              height: `${displayHeight}px`,
              marginLeft: `-${displayWidth / 2}px`, // Half of width for perfect centering
              marginTop: `-${displayHeight / 2}px`,  // Half of height for perfect centering
              zIndex: 2 // Above backdrop (z-index: 1)
            }}
          >
          <motion.div
            initial={{ rotateY: 0, scale: 1.2 }}
            animate={{ 
              rotateY: [0, 2, -2, 0],
              scale: [1.2, 1.05, 1]
            }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
              delay: 0.2
            }}
            className="bg-surface-1/95 backdrop-blur-xl rounded-2xl border border-green-500/30 shadow-2xl overflow-hidden relative"
            style={{
              width: '100%',
              height: '100%',
              boxShadow: `
                0 0 20px rgba(34, 197, 94, 0.3),
                0 8px 32px rgba(0, 0, 0, 0.4),
                0 2px 8px rgba(0, 0, 0, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `
            }}
          >
            <motion.img
              src={croppedImageUrl}
              alt="Selected text"
              className="w-full h-full object-cover"
              style={{
                imageRendering: 'crisp-edges'
              }}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.2
              }}
            />
            
            {/* Optional: Add a subtle glow effect around the text area */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{
                duration: 1,
                ease: "easeInOut",
                delay: 0.3
              }}
              style={{
                background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.2) 0%, transparent 70%)',
                mixBlendMode: 'overlay'
              }}
            />
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}