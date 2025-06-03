import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Upload as UploadIcon, FileText } from 'lucide-react'

export default function Upload() {
  const [isDragging, setIsDragging] = useState(false)
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      uploadFile(files[0])
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            ← Back to Library
          </Button>
          <h1 className="text-3xl font-bold">Upload Manga</h1>
          <p className="text-muted-foreground mt-2">
            Upload a PDF file to add it to your manga library
          </p>
        </div>

        <div
          className={`
            border-2 border-dashed rounded-lg p-12 text-center transition-colors relative
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }
            ${isUploading ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
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
                  <UploadIcon className="h-12 w-12 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Drag and drop your PDF here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse files
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>PDF files only</span>
                </div>
              </>
            )}
          </div>

          {!isUploading && (
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          )}
        </div>
      </div>
    </div>
  )
}