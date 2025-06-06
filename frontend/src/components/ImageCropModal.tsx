import { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ReactCrop, { 
  Crop, 
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop'
import { Button } from '@/components/ui/button'
import { X, RotateCcw, Check, Crop as CropIcon } from 'lucide-react'
import 'react-image-crop/dist/ReactCrop.css'

interface ImageCropModalProps {
  isOpen: boolean
  onClose: () => void
  imageFile: File
  imageName: string
  onSave: (croppedFile: File) => void
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function ImageCropModal({ isOpen, onClose, imageFile, imageName, onSave }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [aspect, setAspect] = useState<number | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imgSrc, setImgSrc] = useState('')

  const onSelectFile = useCallback(() => {
    if (imageFile) {
      const reader = new FileReader()
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || ''),
      )
      reader.readAsDataURL(imageFile)
    }
  }, [imageFile])

  // Load image when modal opens
  useEffect(() => {
    if (isOpen && imageFile) {
      onSelectFile()
    }
  }, [isOpen, imageFile, onSelectFile])

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget
      setCrop(centerAspectCrop(width, height, aspect))
    }
  }

  const getCroppedImg = useCallback(
    async (image: HTMLImageElement, crop: PixelCrop): Promise<Blob | null> => {
      const canvas = canvasRef.current
      if (!canvas || !crop) return null

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      const pixelRatio = window.devicePixelRatio || 1

      canvas.width = Math.floor(crop.width * scaleX * pixelRatio)
      canvas.height = Math.floor(crop.height * scaleY * pixelRatio)

      ctx.scale(pixelRatio, pixelRatio)
      ctx.imageSmoothingQuality = 'high'

      const cropX = crop.x * scaleX
      const cropY = crop.y * scaleY

      ctx.drawImage(
        image,
        cropX,
        cropY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width * scaleX,
        crop.height * scaleY,
      )

      return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      })
    },
    []
  )

  const handleSave = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return

    setIsSaving(true)
    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop)
      if (croppedBlob) {
        // Create a new File from the cropped blob
        const croppedFile = new File([croppedBlob], imageName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        })
        onSave(croppedFile)
        
        // Brief delay to show success state before closing
        setTimeout(onClose, 100)
      }
    } catch (error) {
      console.error('Error cropping image:', error)
      setIsSaving(false)
    }
    // Don't set isSaving to false here since we want to keep the saving state
    // until the modal closes to prevent multiple clicks
  }, [completedCrop, getCroppedImg, imageName, onSave, onClose])

  const resetCrop = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current
      setCrop(centerAspectCrop(width, height, aspect || width / height))
    }
  }

  const handleCancel = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4"
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
            className="bg-surface-1 rounded-2xl shadow-2xl w-full max-w-4xl mx-auto border border-border overflow-hidden flex flex-col"
            style={{
              boxShadow: `
                0 25px 50px -12px rgba(0, 0, 0, 0.25),
                0 0 0 1px rgba(255, 255, 255, 0.05),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `,
              maxHeight: '95vh'
            }}
          >
            {/* Modal Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex items-center justify-between px-4 md:px-6 pt-4 md:pt-6 pb-4 flex-shrink-0 border-b border-border/50"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/10 rounded-xl">
                  <CropIcon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="apple-headline font-semibold text-text-primary">Crop Image</h3>
                  <p className="apple-caption-1 text-text-secondary">{imageName}</p>
                </div>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCancel}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-surface-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>

            {/* Modal Content - Scrollable */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 md:space-y-6 min-h-0"
              style={{ 
                maxHeight: 'calc(95vh - 160px)',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {/* Aspect Ratio Controls */}
              <div className="space-y-3">
                <label className="apple-callout text-text-secondary font-medium">Aspect Ratio:</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={aspect === undefined ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setAspect(undefined)}
                      className={`apple-caption-1 font-medium rounded-xl ${
                        aspect === undefined 
                          ? 'bg-accent hover:bg-accent/90 text-white' 
                          : 'border border-border hover:bg-surface-2'
                      }`}
                    >
                      Free
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={aspect === 3/4 ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setAspect(3/4)}
                      className={`apple-caption-1 font-medium rounded-xl ${
                        aspect === 3/4 
                          ? 'bg-accent hover:bg-accent/90 text-white' 
                          : 'border border-border hover:bg-surface-2'
                      }`}
                    >
                      3:4
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={aspect === 2/3 ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setAspect(2/3)}
                      className={`apple-caption-1 font-medium rounded-xl ${
                        aspect === 2/3 
                          ? 'bg-accent hover:bg-accent/90 text-white' 
                          : 'border border-border hover:bg-surface-2'
                      }`}
                    >
                      2:3
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={aspect === 1 ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setAspect(1)}
                      className={`apple-caption-1 font-medium rounded-xl ${
                        aspect === 1 
                          ? 'bg-accent hover:bg-accent/90 text-white' 
                          : 'border border-border hover:bg-surface-2'
                      }`}
                    >
                      1:1
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetCrop}
                      className="apple-caption-1 font-medium border border-border hover:bg-surface-2 rounded-xl"
                    >
                      <RotateCcw className="h-3 w-3 mr-1.5" />
                      Reset
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Crop Area */}
              <div className="space-y-3">
                <label className="apple-callout text-text-secondary font-medium">Crop Area:</label>
                <div className="border-2 border-border rounded-xl overflow-hidden bg-surface-2" style={{ maxHeight: 'min(50vh, 400px)' }}>
                  {imgSrc ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-auto"
                      style={{ maxHeight: 'min(50vh, 400px)' }}
                    >
                      <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={aspect}
                        className="max-w-full"
                      >
                        <img
                          ref={imgRef}
                          alt="Crop preview"
                          src={imgSrc}
                          style={{ 
                            maxHeight: 'min(50vh, 400px)', 
                            maxWidth: '100%', 
                            display: 'block',
                            width: 'auto',
                            height: 'auto'
                          }}
                          onLoad={onImageLoad}
                        />
                      </ReactCrop>
                    </motion.div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-text-tertiary">
                      <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                      <span className="ml-2 text-sm">Loading image...</span>
                    </div>
                  )}
                </div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                  className="text-xs text-text-tertiary bg-accent/5 border border-accent/20 rounded-lg p-3"
                >
                  💡 Tip: Click and drag to select the crop area. Use aspect ratio buttons for common proportions.
                </motion.div>
              </div>
            </motion.div>

            {/* Modal Footer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="flex gap-3 p-4 md:p-6 md:pt-4 flex-shrink-0 border-t border-border/50 bg-surface-1"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1"
              >
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isSaving}
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
                  disabled={isSaving || !completedCrop}
                  className="w-full bg-accent hover:bg-accent/90 text-white apple-callout font-medium"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Apply Crop
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Hidden canvas for cropping */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}