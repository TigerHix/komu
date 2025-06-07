import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ImageCropModal } from '@/components/ImageCropModal'
import { Trash2, Plus, Crop, ChevronLeft, Image, Move, ArrowLeft, ArrowRight, X } from 'lucide-react'

interface PageFile {
  file: File
  originalName: string
  preview: string
  id: string // Add unique id for drag and drop
}

// Sortable Page Item Component
interface SortablePageItemProps {
  page: PageFile
  index: number
  totalPages: number
  onRemove: (index: number) => void
  onCrop: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onOpenMoveModal: (index: number) => void
}

function SortablePageItem({ page, index, totalPages, onRemove, onCrop, onMoveUp, onMoveDown, onOpenMoveModal }: SortablePageItemProps) {
  const { t } = useTranslation()
  const [longPressActive, setLongPressActive] = useState(false)
  const [isPressing, setIsPressing] = useState(false)
  const [longPressTimeout, setLongPressTimeout] = useState<number | null>(null)
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null)
  const [maxMovement, setMaxMovement] = useState(0)
  const [buttonContainerHeight, setButtonContainerHeight] = useState(100)
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  
  // Check if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id, disabled: isMobile })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Measure button container height when it becomes visible
  useEffect(() => {
    if (longPressActive && buttonContainerRef.current) {
      const height = buttonContainerRef.current.offsetHeight
      setButtonContainerHeight(height)
    }
  }, [longPressActive])

  // Cleanup long press timeout on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeout) {
        clearTimeout(longPressTimeout)
      }
    }
  }, [longPressTimeout])

  // Dismiss long press mode when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (longPressActive && event.target instanceof Element) {
        const cardElement = event.target.closest(`[data-page-id="${page.id}"]`)
        if (!cardElement) {
          setLongPressActive(false)
        }
      }
    }

    if (longPressActive) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [longPressActive, page.id])

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1,
        scale: 1
      }}
      transition={{ 
        duration: 0.2, 
        ease: "easeOut"
      }}
      className={`group relative ${isDragging ? 'z-50' : ''}`}
      data-page-id={page.id}
      {...attributes}
    >
                    <motion.div
         {...(!isMobile ? listeners : {})}
         animate={{
           scale: isPressing ? 0.95 : 1
         }}
        onTouchStart={(e) => {
          const touch = e.touches[0]
          const startPos = { x: touch.clientX, y: touch.clientY }
          setTouchStartPos(startPos)
          setIsPressing(true)
          setMaxMovement(0)
          
          // iOS-compatible long press implementation
          const timeoutId = setTimeout(() => {
            setIsPressing(false)
            setLongPressActive(true)
            setLongPressTimeout(null)
            
            // Add haptic feedback on supported devices
            if (navigator.vibrate) {
              navigator.vibrate(50)
            }
          }, 500) // 500ms for long press
          
          setLongPressTimeout(timeoutId as unknown as number)
        }}
        onTouchMove={(e) => {
          // Track cumulative movement for this touch sequence
          if (touchStartPos) {
            const touch = e.touches[0]
            const deltaX = Math.abs(touch.clientX - touchStartPos.x)
            const deltaY = Math.abs(touch.clientY - touchStartPos.y)
            const movement = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
            
            setMaxMovement(Math.max(maxMovement, movement))
            
            // Cancel long press if movement exceeds threshold
            if (movement > 10 && longPressTimeout) {
              clearTimeout(longPressTimeout)
              setLongPressTimeout(null)
              setIsPressing(false)
            }
          }
        }}
        onTouchEnd={() => {
          // Clear long press timeout
          if (longPressTimeout) {
            clearTimeout(longPressTimeout)
            setLongPressTimeout(null)
          }
          
          setIsPressing(false)
          setTouchStartPos(null)
        }}
        onTouchCancel={() => {
          // Clear long press timeout on touch cancel
          if (longPressTimeout) {
            clearTimeout(longPressTimeout)
            setLongPressTimeout(null)
          }
          setIsPressing(false)
          setTouchStartPos(null)
        }}
        transition={{ 
          type: "spring",
          stiffness: 400,
          damping: 30
        }}
                 className={`bg-card rounded-2xl shadow-sm overflow-hidden border border-border/50 hover:shadow-lg hover:border-border transition-all duration-200 select-none ${
           !isMobile ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
         } ${isDragging ? 'shadow-2xl ring-2 ring-accent/50 opacity-50 scale-105' : ''}`}
        style={{ 
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation'
        }}
      >
        <div className="aspect-[3/4] relative">
                     <img
             src={page.preview}
             alt={`Page ${index + 1}`}
             className="w-full h-full object-cover"
             style={{
               WebkitUserSelect: 'none',
               WebkitTouchCallout: 'none',
               '-webkit-user-drag': 'none',
               userSelect: 'none',
               pointerEvents: 'none'
             } as React.CSSProperties}
             draggable={false}
           />
          
          {/* Page Number */}
          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl apple-caption-2 font-bold shadow-sm">
            {index + 1}
          </div>
          
          {/* Desktop Action Buttons - Upper Right */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ opacity: 1, scale: 1 }}
            className="hidden md:flex absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 gap-2"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="secondary"
                size="sm"
                className="h-9 w-9 p-0 bg-surface-1/90 hover:bg-surface-1 text-text-primary border border-border/50 shadow-sm backdrop-blur-sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onCrop(index)
                }}
                title={t('organize.cropImage')}
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
                className="h-9 w-9 p-0 shadow-sm backdrop-blur-sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onRemove(index)
                }}
                title={t('organize.removePage')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
        
        <div className="p-4 bg-surface-1/50 backdrop-blur-sm">
          <p className="apple-caption-2 text-text-secondary truncate font-medium" title={page.originalName}>
            {page.originalName}
          </p>
        </div>

        {/* Mobile Long Press Buttons - Slide in from bottom */}
                 <motion.div
           ref={buttonContainerRef}
           initial={{ y: buttonContainerHeight, opacity: 0 }}
           animate={{
             y: longPressActive ? 0 : buttonContainerHeight,
             opacity: longPressActive ? 1 : 0
           }}
           transition={{ 
             type: "spring",
             stiffness: 400,
             damping: 30
           }}
           className="md:hidden absolute bottom-0 left-0 right-0 p-3 bg-surface-1/95 backdrop-blur-sm rounded-b-2xl shadow-sm border-l border-r border-b border-border/50"
         >
           <div className="space-y-2">
             {/* Reorder buttons - only show if more than 1 page */}
             {totalPages > 1 && (
               <div className="grid grid-cols-2 gap-2">
                 <motion.div
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                 >
                   <Button 
                     variant="outline" 
                     disabled={index === 0}
                     className="w-full apple-caption-1 font-medium border-border/50 hover:border-border justify-center disabled:opacity-50"
                     onClick={(e) => {
                       e.preventDefault()
                       e.stopPropagation()
                       setLongPressActive(false)
                       onMoveUp(index)
                     }}
                                        >
                       <ArrowLeft className="h-4 w-4" />
                     </Button>
                 </motion.div>
                 <motion.div
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                 >
                   <Button 
                     variant="outline" 
                     disabled={index === totalPages - 1}
                     className="w-full apple-caption-1 font-medium border-border/50 hover:border-border justify-center disabled:opacity-50"
                     onClick={(e) => {
                       e.preventDefault()
                       e.stopPropagation()
                       setLongPressActive(false)
                       onMoveDown(index)
                     }}
                                        >
                       <ArrowRight className="h-4 w-4" />
                     </Button>
                 </motion.div>
               </div>
             )}
             
             {/* Move To button - only show if more than 1 page */}
             {totalPages > 1 && (
               <motion.div
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
                 className="w-full"
               >
                 <Button 
                   variant="outline" 
                   className="w-full apple-body font-medium border-border/50 hover:border-border justify-center"
                   onClick={(e) => {
                     e.preventDefault()
                     e.stopPropagation()
                     setLongPressActive(false)
                     onOpenMoveModal(index)
                   }}
                 >
                   <Move className="h-4 w-4 mr-2" />
                   {t('organize.moveTo')}
                 </Button>
               </motion.div>
             )}
             
             <motion.div
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               className="w-full"
             >
               <Button 
                 variant="outline" 
                 className="w-full apple-body font-medium border-border/50 hover:border-border justify-center"
                 onClick={(e) => {
                   e.preventDefault()
                   e.stopPropagation()
                   setLongPressActive(false)
                   onCrop(index)
                 }}
               >
                 {t('organize.cropImage')}
               </Button>
             </motion.div>
             <motion.div
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               className="w-full"
             >
               <Button 
                 variant="destructive"
                 className="w-full apple-body font-medium justify-center"
                 onClick={(e) => {
                   e.preventDefault()
                   e.stopPropagation()
                   setLongPressActive(false)
                   onRemove(index)
                 }}
               >
                 {t('organize.removePage')}
               </Button>
             </motion.div>
           </div>
         </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default function OrganizePages() {
  const [pages, setPages] = useState<PageFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [movePageIndex, setMovePageIndex] = useState<number | null>(null)
  const [selectedDestination, setSelectedDestination] = useState<number>(1)
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  // Check if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // Sensors for drag and drop - disable on mobile
  const sensors = useSensors(
    ...(!isMobile ? [
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    ] : [])
  )

  useEffect(() => {
    const images = location.state?.images as File[]
    if (!images || images.length === 0) {
      toast.error(t('notifications.organize.noImages'), {
        description: t('notifications.organize.noImagesDesc')
      })
      navigate('/import')
      return
    }

    // Sort by filename by default
    const sortedImages = [...images].sort((a, b) => a.name.localeCompare(b.name))
    
    const pageFiles: PageFile[] = sortedImages.map((file, index) => ({
      file,
      originalName: file.name,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${Date.now()}-${index}` // Add unique id for drag and drop
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
  }, [location.state, navigate])

  const removePage = (index: number) => {
    const pageToRemove = pages[index]
    URL.revokeObjectURL(pageToRemove.preview)
    setPages(prev => prev.filter((_, i) => i !== index))
    toast.error(t('notifications.organize.pageRemoved'), {
      description: t('notifications.organize.pageRemovedDesc')
    })
  }

  const movePageUp = (index: number) => {
    if (index === 0) return // Already at top
    setPages(prev => {
      const newPages = [...prev]
      const temp = newPages[index]
      newPages[index] = newPages[index - 1]
      newPages[index - 1] = temp
      return newPages
    })
  }

  const movePageDown = (index: number) => {
    if (index === pages.length - 1) return // Already at bottom
    setPages(prev => {
      const newPages = [...prev]
      const temp = newPages[index]
      newPages[index] = newPages[index + 1]
      newPages[index + 1] = temp
      return newPages
    })
  }

  const addNewPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
      const newPages = imageFiles.map((file, index) => ({
        file,
        originalName: file.name,
        preview: URL.createObjectURL(file),
        id: `${file.name}-${Date.now()}-${index}` // Add unique id for drag and drop
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
    // Delay clearing the selected page to allow exit animations to complete
    setTimeout(() => {
      setSelectedPageIndex(null)
    }, 250)
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

    toast.success(t('notifications.organize.imageCropped'), {
      description: t('notifications.organize.imageCroppedDesc')
    })
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }

    setActiveId(null)
  }

  const openMoveModal = (index: number) => {
    setMovePageIndex(index)
    setSelectedDestination(index + 1)
    setMoveModalOpen(true)
  }

  const handleUpload = async () => {
    if (pages.length === 0) {
      toast.error(t('notifications.organize.noPagesToUpload'), {
        description: t('notifications.organize.noPagesToUploadDesc')
      })
      return
    }

    if (!title.trim()) {
      toast.error(t('notifications.organize.titleRequired'), {
        description: t('notifications.organize.titleRequiredDesc')
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
      
      toast.success(t('notifications.organize.uploadSuccessful'), {
        description: t('notifications.organize.uploadSuccessfulDesc', { title: result.title })
      })

      navigate(`/metadata/${result.id}`)
    } catch (error) {
      toast.error(t('notifications.organize.uploadFailed'), {
        description: t('notifications.organize.uploadFailedDesc')
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
            className="mb-6 -ml-2 apple-body text-text-secondary hover:text-text-primary"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('organize.backToImport')}
          </Button>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="apple-title-2 text-text-primary font-bold mb-3"
          >
            {t('organize.title')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="apple-body text-text-secondary"
          >
            {t('organize.description')}
          </motion.p>
        </motion.div>

        {/* Title Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="bg-surface-1 rounded-3xl p-6 border border-border/50 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-accent/10 rounded-xl">
                <Image className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="apple-callout font-semibold text-text-primary">
                  {t('organize.mangaTitle')}
                </h3>
                <p className="apple-caption-1 text-text-secondary">
                  {t('organize.titleDescription')}
                </p>
              </div>
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('organize.titlePlaceholder')}
              className="apple-body bg-surface-2 border-border/50 focus:border-accent text-text-primary placeholder:text-text-tertiary"
              lang="ja"
            />
          </div>
        </motion.div>

        {/* Pages Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-sm">
                <Image className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h2 className="apple-headline font-bold text-text-primary">
                  {t('organize.pagesSection', { count: pages.length })}
                </h2>
                                 <div className="flex items-center space-x-2">
                   <p className="apple-footnote text-text-secondary">
                     {isMobile ? t('organize.pagesDescriptionMobile') : t('organize.pagesDescription')}
                   </p>
                 </div>
              </div>
            </div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
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
                className="apple-callout font-medium border-border/50 hover:border-border shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('organize.addMore')}
              </Button>
            </motion.div>
          </motion.div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <AnimatePresence>
                  {pages.map((page, index) => (
                                         <SortablePageItem
                       key={page.id}
                       page={page}
                       index={index}
                       totalPages={pages.length}
                       onRemove={removePage}
                       onCrop={openCropModal}
                       onMoveUp={movePageUp}
                       onMoveDown={movePageDown}
                       onOpenMoveModal={openMoveModal}
                     />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>

            <DragOverlay>
              {activeId ? (
                <div className="bg-card rounded-3xl shadow-2xl overflow-hidden border-2 border-accent/50 opacity-90 transform rotate-3 scale-105">
                  <div className="aspect-[3/4] relative">
                    {(() => {
                      const activePage = pages.find(p => p.id === activeId)
                                               return activePage ? (
                           <img
                             src={activePage.preview}
                             alt="Dragging page"
                             className="w-full h-full object-cover"
                             style={{
                               WebkitUserSelect: 'none',
                               WebkitTouchCallout: 'none',
                               '-webkit-user-drag': 'none',
                               userSelect: 'none',
                               pointerEvents: 'none'
                             } as React.CSSProperties}
                             draggable={false}
                           />
                         ) : null
                    })()}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </motion.div>

        {/* Bottom Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-between items-center pt-4"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              variant="outline" 
              onClick={() => navigate('/import')}
              className="apple-body font-medium border-border/50 hover:border-border shadow-sm px-6"
            >
              {t('common.cancel')}
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              onClick={handleUpload} 
              disabled={isUploading || pages.length === 0 || !title.trim()}
              className="apple-body font-medium bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm px-8"
            >
              {isUploading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"
                  />
                  {t('organize.uploading')}
                </>
              ) : (
                pages.length === 1 
                  ? t('organize.uploadPage', { count: pages.length })
                  : t('organize.uploadPages', { count: pages.length })
              )}
            </Button>
          </motion.div>
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

        {/* Move To Modal */}
        <AnimatePresence mode="wait">
          {moveModalOpen && movePageIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setMoveModalOpen(false)
                  setTimeout(() => setMovePageIndex(null), 250)
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
                className="bg-surface-1 rounded-2xl shadow-2xl w-full max-w-md mx-auto border border-border overflow-hidden flex flex-col"
                style={{
                  boxShadow: `
                    0 25px 50px -12px rgba(0, 0, 0, 0.25),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1)
                  `,
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
                      <Move className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="apple-headline font-semibold text-text-primary">{t('organize.moveTo')}</h3>
                      <p className="apple-caption-1 text-text-secondary">
                        {t('organize.movePageDescription', { from: movePageIndex + 1 })}
                      </p>
                    </div>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setMoveModalOpen(false)
                        setTimeout(() => setMovePageIndex(null), 250)
                      }}
                      className="h-8 w-8 p-0 rounded-lg hover:bg-surface-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </motion.div>

                {/* Modal Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  className="px-4 md:px-6 py-4 space-y-4"
                >
                  <div className="space-y-3">
                    <label className="apple-callout text-text-secondary font-medium">
                      {t('organize.selectDestination')}:
                    </label>
                    <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                      {Array.from({ length: pages.length }, (_, i) => i + 1).map((pageNum) => (
                        <motion.div
                          key={pageNum}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant={selectedDestination === pageNum ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setSelectedDestination(pageNum)}
                            disabled={pageNum === movePageIndex + 1}
                            className={`w-full apple-caption-1 font-medium rounded-xl ${
                              selectedDestination === pageNum 
                                ? 'bg-accent hover:bg-accent/90 text-white' 
                                : 'border border-border hover:bg-surface-2'
                            } ${
                              pageNum === movePageIndex + 1 
                                ? 'opacity-50 cursor-not-allowed' 
                                : ''
                            }`}
                          >
                            {pageNum}
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                    className="text-xs text-text-tertiary bg-accent/5 border border-accent/20 rounded-lg p-3"
                  >
                    💡 {t('organize.movePageTip')}
                  </motion.div>
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
                      onClick={() => {
                        setMoveModalOpen(false)
                        setTimeout(() => setMovePageIndex(null), 250)
                      }}
                      className="w-full apple-callout font-medium"
                    >
                      {t('common.cancel')}
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1"
                  >
                    <Button
                      onClick={() => {
                        const newPages = [...pages]
                        const pageToMove = newPages.splice(movePageIndex, 1)[0]
                        newPages.splice(selectedDestination - 1, 0, pageToMove)
                        setPages(newPages)
                        setMoveModalOpen(false)
                        setTimeout(() => setMovePageIndex(null), 250)
                        toast.success(t('notifications.organize.pageMoved'), {
                          description: t('notifications.organize.pageMovedDesc', { 
                            from: movePageIndex + 1, 
                            to: selectedDestination 
                          })
                        })
                      }}
                      disabled={selectedDestination === movePageIndex + 1}
                      className="w-full bg-accent hover:bg-accent/90 text-white apple-callout font-medium"
                    >
                      <Move className="h-4 w-4 mr-2" />
                      {t('organize.movePageButton')}
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}