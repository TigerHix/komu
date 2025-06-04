import { useState, useRef, useCallback } from 'react'
import ReactCrop, { 
  Crop, 
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop'
import { Button } from '@/components/ui/button'
import { X, RotateCcw, Check } from 'lucide-react'
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
  useState(() => {
    if (isOpen && imageFile) {
      onSelectFile()
    }
  })

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

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop)
      if (croppedBlob) {
        // Create a new File from the cropped blob
        const croppedFile = new File([croppedBlob], imageName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        })
        onSave(croppedFile)
        onClose()
      }
    } catch (error) {
      console.error('Error cropping image:', error)
    }
  }, [completedCrop, getCroppedImg, imageName, onSave, onClose])

  const resetCrop = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current
      setCrop(centerAspectCrop(width, height, aspect || width / height))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Crop Image</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* File name */}
          <div className="text-sm text-muted-foreground">
            {imageName}
          </div>

          {/* Aspect ratio controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Aspect Ratio:</span>
            <Button
              variant={aspect === undefined ? "default" : "outline"}
              size="sm"
              onClick={() => setAspect(undefined)}
            >
              Free
            </Button>
            <Button
              variant={aspect === 3/4 ? "default" : "outline"}
              size="sm"
              onClick={() => setAspect(3/4)}
            >
              3:4
            </Button>
            <Button
              variant={aspect === 2/3 ? "default" : "outline"}
              size="sm"
              onClick={() => setAspect(2/3)}
            >
              2:3
            </Button>
            <Button
              variant={aspect === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setAspect(1)}
            >
              1:1
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetCrop}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>

          {/* Crop area */}
          <div className="max-h-[60vh] overflow-auto border rounded-lg bg-gray-50">
            {imgSrc && (
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
                  style={{ maxHeight: '60vh', maxWidth: '100%' }}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            Click and drag to select crop area
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!completedCrop}>
              <Check className="h-4 w-4 mr-1" />
              Apply Crop
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for cropping */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </div>
  )
}