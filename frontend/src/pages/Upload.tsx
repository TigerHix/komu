import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Upload as UploadIcon, FileText, Image } from 'lucide-react'

export default function Upload() {
  const [isDraggingPdf, setIsDraggingPdf] = useState(false)
  const [isDraggingImages, setIsDraggingImages] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const uploadFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file',
        variant: 'destructive'
      })
      return
    }

    // Check file size (512MB limit)
    const maxSize = 512 * 1024 * 1024 // 512MB in bytes
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: `File size is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed size is 512MB.`,
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      
      toast({
        title: 'Upload successful',
        description: `${result.title} has been uploaded successfully`
      })

      navigate(`/metadata/${result.id}`)
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your file',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handlePdfDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingPdf(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      uploadFile(files[0])
    }
  }, [])

  const handleImagesDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingImages(false)
    
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload image files only',
        variant: 'destructive'
      })
      return
    }
    
    navigate('/organize', { state: { images: imageFiles } })
  }, [toast])

  const handlePdfDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingPdf(true)
  }, [])

  const handlePdfDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingPdf(false)
  }, [])

  const handleImagesDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingImages(true)
  }, [])

  const handleImagesDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingImages(false)
  }, [])

  const handlePdfFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  const handleImagesFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
      if (imageFiles.length > 0) {
        navigate('/organize', { state: { images: imageFiles } })
      }
    }
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Status bar with accent color background */}
      <div className="bg-accent p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-accent-foreground">komu</h1>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-accent-foreground hover:bg-accent-foreground/10"
            >
              ← Back to Library
            </Button>
          </div>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Upload Manga</h2>
          <p className="text-muted-foreground mt-2">
            Upload a PDF file or multiple image files to add to your manga library
          </p>
        </div>

        <div className="space-y-6">
          {/* PDF Upload */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors relative
              ${isDraggingPdf 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }
              ${isUploading ? 'opacity-50 pointer-events-none' : ''}
            `}
            onDrop={handlePdfDrop}
            onDragOver={handlePdfDragOver}
            onDragLeave={handlePdfDragLeave}
          >
            <div className="flex flex-col items-center space-y-4">
              {isUploading ? (
                <>
                  <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
                  <p className="text-lg font-medium">Processing PDF...</p>
                  <p className="text-sm text-muted-foreground">
                    This may take a few moments
                  </p>
                </>
              ) : (
                <>
                  <div className="p-4 bg-primary/10 rounded-full">
                    <FileText className="h-12 w-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      Upload PDF File
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop your PDF here or click to browse
                    </p>
                  </div>
                </>
              )}
            </div>

            {!isUploading && (
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            )}
          </div>

          <div className="text-center text-muted-foreground">
            <span>or</span>
          </div>

          {/* Images Upload */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors relative
              ${isDraggingImages 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }
            `}
            onDrop={handleImagesDrop}
            onDragOver={handleImagesDragOver}
            onDragLeave={handleImagesDragLeave}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Image className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Upload Image Files
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag and drop multiple images here or click to browse
                </p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Image className="h-4 w-4" />
                <span>JPG, PNG, WebP, etc.</span>
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  )
}