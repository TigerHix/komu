import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Upload, FileText, Image, CheckCircle, AlertCircle } from 'lucide-react'

interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  message: string
}

export default function Import() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  })
  const [dragActive, setDragActive] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      // Handle multiple files or single file
      if (files.length === 1) {
        handleFileUpload(files[0])
      } else {
        // For multiple files, we could implement batch upload
        // For now, just upload the first one
        handleFileUpload(files[0])
        toast({
          title: "Multiple files detected",
          description: `Processing ${files[0].name}. Multiple file upload coming soon!`,
        })
      }
    }
  }, [toast])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      if (files.length === 1) {
        handleFileUpload(files[0])
      } else {
        // Handle multiple selected files
        handleFileUpload(files[0])
        toast({
          title: "Multiple files selected",
          description: `Processing ${files[0].name}. Multiple file upload coming soon!`,
        })
      }
    }
  }, [toast])

  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    setUploadStatus({
      status: 'uploading',
      progress: 0,
      message: 'Uploading file...'
    })

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      
      setUploadStatus({
        status: 'processing',
        progress: 50,
        message: 'Processing manga...'
      })

      // Simulate processing time
      setTimeout(() => {
        setUploadStatus({
          status: 'success',
          progress: 100,
          message: 'Upload complete!'
        })
        
        toast({
          title: "Upload successful",
          description: "Your manga has been added to the library.",
        })
        
        // Navigate to organize pages if needed
        if (data.needsOrganization) {
          navigate('/organize')
        } else {
          navigate('/')
        }
      }, 2000)

    } catch (error) {
      console.error('Upload failed:', error)
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: 'Upload failed. Please try again.'
      })
      
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusIcon = () => {
    switch (uploadStatus.status) {
      case 'uploading':
      case 'processing':
        return <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Upload className="h-8 w-8 text-accent" />
        </motion.div>
      case 'success':
        return <CheckCircle className="h-8 w-8 text-accent" />
      case 'error':
        return <AlertCircle className="h-8 w-8 text-destructive" />
      default:
        return <Upload className="h-8 w-8 text-text-secondary" />
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen bg-background pb-20"
    >
      <div className="max-w-2xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="apple-title-2 text-text-primary font-bold mb-2">Import Manga</h1>
          <p className="apple-body text-text-secondary">
            Upload your manga files to start reading
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Upload Area */}
          <motion.div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            animate={{
              borderColor: dragActive ? 'hsl(var(--accent))' : 'hsl(var(--border))',
              backgroundColor: dragActive ? 'hsl(var(--accent) / 0.05)' : 'hsl(var(--surface-1))'
            }}
            className="relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-200"
          >
            <input
              type="file"
              id="file-upload"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".pdf,image/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'}
            />
            
            <motion.div
              animate={{ scale: dragActive ? 1.1 : 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex justify-center">
                {getStatusIcon()}
              </div>
              
              <div className="space-y-2">
                <h3 className="apple-headline text-text-primary font-semibold">
                  {uploadStatus.status === 'idle' && (dragActive ? 'Drop your file here' : 'Choose a file or drag it here')}
                  {uploadStatus.status === 'uploading' && 'Uploading...'}
                  {uploadStatus.status === 'processing' && 'Processing...'}
                  {uploadStatus.status === 'success' && 'Upload complete!'}
                  {uploadStatus.status === 'error' && 'Upload failed'}
                </h3>
                
                <p className="apple-subhead text-text-secondary">
                  {uploadStatus.status === 'idle' && 'Supports PDF files and multiple image files. JPG, PNG, GIF, WebP supported!'}
                  {uploadStatus.status !== 'idle' && uploadStatus.message}
                </p>
              </div>
              
              {uploadStatus.status === 'idle' && (
                <Button className="mt-4">
                  Browse Files
                </Button>
              )}
            </motion.div>
          </motion.div>

          {/* Progress Bar */}
          {(uploadStatus.status === 'uploading' || uploadStatus.status === 'processing') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <div className="flex justify-between text-sm">
                <span className="apple-footnote text-text-secondary">{uploadStatus.message}</span>
                <span className="apple-footnote text-text-primary font-medium">{uploadStatus.progress}%</span>
              </div>
              <div className="w-full bg-surface-3 rounded-full h-2">
                <motion.div
                  className="bg-accent h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadStatus.progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          )}

          {/* Supported Formats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="bg-surface-2 rounded-2xl p-4 text-center">
              <FileText className="h-6 w-6 text-accent mx-auto mb-2" />
              <h4 className="apple-callout font-medium text-text-primary mb-1">Documents</h4>
              <p className="apple-caption-1 text-text-secondary">PDF files</p>
            </div>
            <div className="bg-surface-2 rounded-2xl p-4 text-center">
              <Image className="h-6 w-6 text-accent mx-auto mb-2" />
              <h4 className="apple-callout font-medium text-text-primary mb-1">Images</h4>
              <p className="apple-caption-1 text-text-secondary">JPG, PNG, GIF, WebP</p>
            </div>
          </motion.div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-surface-2 rounded-2xl p-6"
          >
            <h3 className="apple-callout font-semibold text-text-primary mb-3">Tips for best results</h3>
            <ul className="space-y-2 apple-footnote text-text-secondary">
              <li>• High-resolution images work best for OCR text extraction</li>
              <li>• PDF files are automatically converted to individual pages</li>
              <li>• Multiple image files can be uploaded together</li>
              <li>• Images will be organized in the order you upload them</li>
              <li>• Use the organize page to reorder if needed</li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}