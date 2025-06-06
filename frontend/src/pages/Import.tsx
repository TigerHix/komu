import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Upload, FileText, Image, CheckCircle, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const validateFiles = useCallback((files: File[]) => {
    if (files.length === 0) {
      return { valid: false, error: 'No files provided' }
    }

    const pdfFiles = files.filter(f => f.type === 'application/pdf')
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    const otherFiles = files.filter(f => f.type !== 'application/pdf' && !f.type.startsWith('image/'))

    // Check for unsupported file types
    if (otherFiles.length > 0) {
      return { 
        valid: false, 
        error: `Unsupported file types: ${otherFiles.map(f => f.name).join(', ')}` 
      }
    }

    // Check for mixed file types
    if (pdfFiles.length > 0 && imageFiles.length > 0) {
      return { 
        valid: false, 
        error: 'Cannot mix PDF and image files. Please upload either PDFs or images, not both.' 
      }
    }

    // Check for multiple PDFs
    if (pdfFiles.length > 1) {
      return { 
        valid: false, 
        error: 'Multiple PDF files not supported. Please upload one PDF at a time.' 
      }
    }

    // Must have at least one valid file
    if (pdfFiles.length === 0 && imageFiles.length === 0) {
      return { 
        valid: false, 
        error: 'No supported files found. Please upload PDF or image files.' 
      }
    }

    return { valid: true, pdfFiles, imageFiles }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    const validation = validateFiles(files)
    
    if (!validation.valid) {
      toast({
        title: t('import.messages.invalidFiles'),
        description: validation.error,
        variant: "destructive",
      })
      return
    }

    if (validation.pdfFiles && validation.pdfFiles.length > 0) {
      handleFileUpload(validation.pdfFiles[0])
    } else if (validation.imageFiles && validation.imageFiles.length > 0) {
      handleMultipleFileUpload(validation.imageFiles)
    }
  }, [toast, validateFiles, t, navigate])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    const fileArray = Array.from(files)
    const validation = validateFiles(fileArray)
    
    if (!validation.valid) {
      toast({
        title: t('import.messages.invalidFiles'),
        description: validation.error,
        variant: "destructive",
      })
      return
    }

    if (validation.pdfFiles && validation.pdfFiles.length > 0) {
      handleFileUpload(validation.pdfFiles[0])
    } else if (validation.imageFiles && validation.imageFiles.length > 0) {
      handleMultipleFileUpload(validation.imageFiles)
    }
  }, [toast, validateFiles, t, navigate])

  const handleFileUpload = async (file: File) => {
    // For PDFs, handle directly. For images, use the multiple file handler
    if (file.type === 'application/pdf') {
      setUploadStatus({
        status: 'uploading',
        progress: 0,
        message: t('import.messages.uploading')
      })

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/manga/from-pdf', {
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
          message: t('import.messages.processing')
        })

        // Simulate processing time
        setTimeout(() => {
          setUploadStatus({
            status: 'success',
            progress: 100,
            message: t('import.messages.success')
          })
          
          toast({
            title: t('notifications.uploadComplete'),
            description: t('notifications.uploadComplete'),
          })
          
          // Navigate to metadata edit page
          navigate(`/metadata/${data.id}`)
        }, 2000)

      } catch (error) {
        console.error('Upload failed:', error)
        setUploadStatus({
          status: 'error',
          progress: 0,
          message: t('import.messages.error')
        })
        
        toast({
          title: t('notifications.error.upload'),
          description: t('notifications.error.upload'),
          variant: "destructive",
        })
      }
    } else if (file.type.startsWith('image/')) {
      // Route single images through the multiple file handler
      handleMultipleFileUpload([file])
    } else {
      throw new Error('Unsupported file type')
    }
  }

  const handleMultipleFileUpload = async (files: File[]) => {
    // For multiple images, navigate to organize pages
    if (files.length > 1) {
      setUploadStatus({
        status: 'success',
        progress: 100,
        message: t('import.messages.success')
      })
      
      setTimeout(() => {
        navigate('/organize', { state: { images: files } })
      }, 500)
      return
    }

    // For single image, upload directly
    setUploadStatus({
      status: 'uploading',
      progress: 0,
      message: t('import.messages.uploading')
    })

    try {
      const formData = new FormData()
      
      // Generate title from file name
      const title = files[0].name.replace(/\.[^/.]+$/, '')
      formData.append('title', title)
      formData.append('pages', files[0])

      const response = await fetch('/api/manga/from-images', {
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
        message: t('import.messages.processing')
      })

      // Simulate processing time
      setTimeout(() => {
        setUploadStatus({
          status: 'success',
          progress: 100,
          message: t('import.messages.success')
        })
        
        toast({
          title: t('notifications.uploadComplete'),
          description: t('notifications.uploadComplete'),
        })
        
        // Navigate to metadata edit page
        navigate(`/metadata/${data.id}`)
      }, 2000)

    } catch (error) {
      console.error('Upload failed:', error)
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: t('import.messages.error')
      })
      
      toast({
        title: t('notifications.error.upload'),
        description: t('notifications.error.upload'),
        variant: "destructive",
      })
    }
  }

  const getStatusIcon = () => {
    const iconProps = { className: "h-8 w-8" }
    switch (uploadStatus.status) {
      case 'uploading':
      case 'processing':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Upload {...iconProps} className="h-8 w-8 text-accent" />
          </motion.div>
        )
      case 'success':
        return <CheckCircle {...iconProps} className="h-8 w-8 text-accent" />
      case 'error':
        return <AlertCircle {...iconProps} className="h-8 w-8 text-destructive" />
      default:
        return <Upload {...iconProps} className="h-8 w-8 text-text-secondary" />
    }
  }

  const getStatusTitle = () => {
    const { status } = uploadStatus
    if (status === 'idle') return dragActive ? t('import.dropzone.dragActive') : t('import.dropzone.idle')
    return t(`import.dropzone.${status}`)
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
          <h1 className="apple-title-2 text-text-primary font-bold mb-2">{t('import.title')}</h1>
          <p className="apple-body text-text-secondary">
            {t('import.subtitle')}
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
                  {getStatusTitle()}
                </h3>
                
                <p className="apple-subhead text-text-secondary">
                  {uploadStatus.status === 'idle' ? t('import.dropzone.description') : uploadStatus.message}
                </p>
              </div>
              
              {uploadStatus.status === 'idle' && (
                <Button className="mt-4">
                  {t('import.dropzone.browse')}
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
              <h4 className="apple-callout font-medium text-text-primary mb-1">{t('import.formats.documents')}</h4>
              <p className="apple-caption-1 text-text-secondary">{t('import.formats.documentDesc')}</p>
            </div>
            <div className="bg-surface-2 rounded-2xl p-4 text-center">
              <Image className="h-6 w-6 text-accent mx-auto mb-2" />
              <h4 className="apple-callout font-medium text-text-primary mb-1">{t('import.formats.images')}</h4>
              <p className="apple-caption-1 text-text-secondary">{t('import.formats.imageDesc')}</p>
            </div>
          </motion.div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-surface-2 rounded-2xl p-6"
          >
            <h3 className="apple-callout font-semibold text-text-primary mb-3">{t('import.tips.title')}</h3>
            <ul className="space-y-2 apple-footnote text-text-secondary">
              <li>• {t('import.tips.tip1')}</li>
              <li>• {t('import.tips.tip2')}</li>
              <li>• {t('import.tips.tip3')}</li>
              <li>• {t('import.tips.tip4')}</li>
              <li>• {t('import.tips.tip5')}</li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}