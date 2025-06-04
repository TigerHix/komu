import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { ImageCropModal } from '@/components/ImageCropModal'
import { GripVertical, Trash2, Plus, Crop } from 'lucide-react'

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

  useEffect(() => {
    const images = location.state?.images as File[]
    if (!images || images.length === 0) {
      toast({
        title: 'No images found',
        description: 'Please go back and select images',
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
      title: 'Image cropped',
      description: 'The image has been successfully cropped'
    })
  }

  const handleUpload = async () => {
    if (pages.length === 0) {
      toast({
        title: 'No pages to upload',
        description: 'Please add at least one page',
        variant: 'destructive'
      })
      return
    }

    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your manga',
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

      const response = await fetch('/api/upload-images', {
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
        description: 'There was an error uploading your files',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/upload')}
            className="mb-4"
          >
            ← Back to Upload
          </Button>
          <h1 className="text-3xl font-bold">Organize Pages</h1>
          <p className="text-muted-foreground mt-2">
            Arrange your pages in the correct order and set a title
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Manga Title
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter manga title"
            className="max-w-md"
          />
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Pages ({pages.length})</h2>
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
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Pages
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {pages.map((page, index) => (
              <div
                key={`${page.originalName}-${index}`}
                className={`relative group border-2 rounded-lg overflow-hidden transition-all ${
                  draggedIndex === index ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                }`}
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
                  <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
                    {index + 1}
                  </div>
                  
                  {/* Drag handle */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0 cursor-move bg-black/70 hover:bg-black/80 text-white border-0"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <GripVertical className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Edit button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0 bg-primary hover:bg-primary/80 text-primary-foreground"
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
                    
                    {/* Remove button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0 bg-destructive hover:bg-destructive/80 text-destructive-foreground"
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
                  </div>
                </div>
                
                <div className="p-2 bg-card">
                  <p className="text-xs text-muted-foreground truncate" title={page.originalName}>
                    {page.originalName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate('/upload')}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || pages.length === 0 || !title.trim()}
            size="lg"
          >
            {isUploading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                Uploading...
              </>
            ) : (
              `Upload ${pages.length} Pages`
            )}
          </Button>
        </div>

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
    </div>
  )
}