import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { ImageCropModal } from '@/components/ImageCropModal'
import { GripVertical, Trash2, Plus, Crop, ChevronLeft, Image } from 'lucide-react'

interface PageFile {
  file: File
  originalName: string
  preview: string
}

export default function OrganizePages() {
  const [pages, setPages] = useState<PageFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { t } = useTranslation()

  useEffect(() => {
    const images = location.state?.images as File[]
    if (!images || images.length === 0) {
      toast({
        title: t('notifications.organize.noImages'),
        description: t('notifications.organize.noImagesDesc'),
        variant: 'destructive'
      })
      navigate('/upload')
      return
    }

    // Sort by filename by default
    const sortedImages = [...images].sort((a, b) => a.name.localeCompare(b.name))
    
    const pageFiles: PageFile[] = sortedImages.map(file => ({
      file,
      originalName: file.name,
      preview: URL.createObjectURL(file)
    }))
    
    setPages(pageFiles)
    
    // Extract title from first filename
    const firstFileName = sortedImages[0].name
    const titleFromFile = firstFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    setTitle(titleFromFile)

    return () => {
      // Cleanup object URLs
      pageFiles.forEach(page => URL.revokeObjectURL(page.preview))
    }
  }, [location.state, navigate, toast])

  // Add global event listeners to clear drag state
  useEffect(() => {
    const handleGlobalDragEnd = () => setDraggedIndex(null)
    const handleGlobalMouseUp = () => setDraggedIndex(null)
    
    document.addEventListener('dragend', handleGlobalDragEnd)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('mouseleave', handleGlobalDragEnd)
    
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mouseleave', handleGlobalDragEnd)
    }
  }, [])

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    if (draggedIndex !== null && draggedIndex !== index) {
      const newPages = [...pages]
      const draggedPage = newPages[draggedIndex]
      newPages.splice(draggedIndex, 1)
      newPages.splice(index, 0, draggedPage)
      setPages(newPages)
      setDraggedIndex(index)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const removePage = (index: number) => {
    const pageToRemove = pages[index]
    URL.revokeObjectURL(pageToRemove.preview)
    setPages(prev => prev.filter((_, i) => i !== index))
  }

  const addNewPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
      const newPages = imageFiles.map(file => ({
        file,
        originalName: file.name,
        preview: URL.createObjectURL(file)
      }))
      setPages(prev => [...prev, ...newPages])
    }
    // Reset input
    e.target.value = ''
  }

  const openCropModal = (index: number) => {
    setSelectedPageIndex(index)
    setCropModalOpen(true)
  }

  const closeCropModal = () => {
    setCropModalOpen(false)
    setSelectedPageIndex(null)
  }

  const handleCroppedImage = (croppedFile: File) => {
    if (selectedPageIndex === null) return

    // Revoke old preview URL
    const oldPage = pages[selectedPageIndex]
    URL.revokeObjectURL(oldPage.preview)

    // Update the page with the new cropped file
    const newPreview = URL.createObjectURL(croppedFile)
    setPages(prev => prev.map((page, index) => 
      index === selectedPageIndex 
        ? { ...page, file: croppedFile, preview: newPreview }
        : page
    ))

    toast({
      title: t('notifications.organize.imageCropped'),
      description: t('notifications.organize.imageCroppedDesc')
    })
  }

  const handleUpload = async () => {
    if (pages.length === 0) {
      toast({
        title: t('notifications.organize.noPagesToUpload'),
        description: t('notifications.organize.noPagesToUploadDesc'),
        variant: 'destructive'
      })
      return
    }

    if (!title.trim()) {
      toast({
        title: t('notifications.organize.titleRequired'),
        description: t('notifications.organize.titleRequiredDesc'),
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      
      pages.forEach((page, index) => {
        formData.append(`pages`, page.file)
        formData.append(`pageOrder`, index.toString())
      })

      const response = await fetch('/api/manga/from-images', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      
      toast({
        title: t('notifications.organize.uploadSuccessful'),
        description: t('notifications.organize.uploadSuccessfulDesc', { title: result.title })
      })

      navigate(`/metadata/${result.id}`)
    } catch (error) {
      toast({
        title: t('notifications.organize.uploadFailed'),
        description: t('notifications.organize.uploadFailedDesc'),
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen bg-background pb-20"
    >
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button 
            variant="ghost" 
            onClick={() => navigate('/import')}
            className="mb-4 -ml-2 apple-body text-text-secondary hover:text-text-primary"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Import
          </Button>
          <h1 className="apple-title-2 text-text-primary font-bold mb-2">Organize Pages</h1>
          <p className="apple-body text-text-secondary">
            Arrange your pages in the correct order and set a title
          </p>
        </motion.div>

        {/* Title Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-surface-1 rounded-2xl p-6 border border-border/50">
            <label htmlFor="title" className="apple-callout font-medium text-text-primary mb-3 block">
              Manga Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter manga title"
              className="apple-body bg-surface-2 border-border/50 focus:border-accent text-text-primary placeholder:text-text-tertiary"
            />
          </div>
        </motion.div>

        {/* Pages Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-accent/10 rounded-xl">
                <Image className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="apple-headline font-semibold text-text-primary">
                  Pages ({pages.length})
                </h2>
                <p className="apple-caption-1 text-text-secondary">
                  Drag to reorder, tap to edit
                </p>
              </div>
            </div>
            
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={addNewPage}
                className="hidden"
                id="add-pages"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('add-pages')?.click()}
                className="apple-callout font-medium border-border/50 hover:border-border"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <AnimatePresence>
              {pages.map((page, index) => (
                <motion.div
                  key={`${page.originalName}-${index}`}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: draggedIndex === index ? 0.5 : 1,
                    scale: draggedIndex === index ? 0.95 : 1
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="group relative bg-card rounded-2xl shadow-sm overflow-hidden border border-border/50 hover:shadow-lg hover:border-border transition-all duration-300"
                  draggable={draggedIndex !== index}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                >
                  <div className="aspect-[3/4] relative">
                    <img
                      src={page.preview}
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Page Number */}
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-lg apple-caption-2 font-medium">
                      {index + 1}
                    </div>
                    
                    {/* Drag Handle */}
                    <motion.div 
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 w-8 p-0 cursor-move bg-surface-1/90 hover:bg-surface-1 text-text-primary border border-border/50 shadow-sm backdrop-blur-sm"
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    </motion.div>
                    
                    {/* Action Buttons */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      whileHover={{ opacity: 1, y: 0 }}
                      className="absolute bottom-3 left-3 right-3 flex justify-between opacity-0 group-hover:opacity-100 transition-all duration-200"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 w-8 p-0 bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openCropModal(index)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          title="Crop image"
                        >
                          <Crop className="h-4 w-4" />
                        </Button>
                      </motion.div>
                      
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 w-8 p-0 shadow-sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            removePage(index)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          title="Remove page"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    </motion.div>
                  </div>
                  
                  <div className="p-3 bg-surface-1">
                    <p className="apple-caption-2 text-text-secondary truncate" title={page.originalName}>
                      {page.originalName}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Bottom Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between items-center"
        >
          <Button 
            variant="outline" 
            onClick={() => navigate('/import')}
            className="apple-body font-medium border-border/50 hover:border-border"
          >
            Cancel
          </Button>
          
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || pages.length === 0 || !title.trim()}
            className="apple-body font-medium bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm px-6"
          >
            {isUploading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"
                />
                Uploading...
              </>
            ) : (
              `Upload ${pages.length} Page${pages.length === 1 ? '' : 's'}`
            )}
          </Button>
        </motion.div>

        {/* Crop Modal */}
        {selectedPageIndex !== null && (
          <ImageCropModal
            isOpen={cropModalOpen}
            onClose={closeCropModal}
            imageFile={pages[selectedPageIndex].file}
            imageName={pages[selectedPageIndex].originalName}
            onSave={handleCroppedImage}
          />
        )}
      </div>
    </motion.div>
  )
}