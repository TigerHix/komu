import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { OcrStatusBlock } from '@/components/OcrStatusBlock'
import { MangaCoverTransition } from '@/components/PageTransition'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Book, Edit, Trash2, TestTube } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface MangaItem {
  id: string
  title: string
  type: string
  number?: number
  author?: string
  thumbnail?: string
  currentPage: number
  totalPages: number
  progressPercent: number
  createdAt: string
}

interface OcrCompletionStatus {
  id: string
  totalPages: number
  completedPages: number
  failedPages: number
  completedAt: string
  status: string
}

export default function Library() {
  const [manga, setManga] = useState<MangaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [ocrStatus, setOcrStatus] = useState<OcrCompletionStatus | null>(null)
  const [showCoverTransition, setShowCoverTransition] = useState(false)
  const [selectedCover, setSelectedCover] = useState<string | undefined>()
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [isAnimatingCard, setIsAnimatingCard] = useState<string | null>(null)
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'press' | 'overshoot'>('idle')
  const [isPressing, setIsPressing] = useState<string | null>(null)
  const [longPressCard, setLongPressCard] = useState<string | null>(null)
  const [hideBottomTabs, setHideBottomTabs] = useState(false)
  const [longPressTimeout, setLongPressTimeout] = useState<number | null>(null)
  const [buttonContainerHeight, setButtonContainerHeight] = useState(100)
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null)
  const [maxMovement, setMaxMovement] = useState<{ [key: string]: number }>({})
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  useEffect(() => {
    fetchManga()
    fetchOcrCompletionStatus()
  }, [])


  // Dismiss long press mode when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (longPressCard && event.target instanceof Element) {
        const cardElement = event.target.closest('[data-card-id]')
        if (!cardElement || cardElement.getAttribute('data-card-id') !== longPressCard) {
          setLongPressCard(null)
        }
      }
    }

    if (longPressCard) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [longPressCard])

  // Cleanup long press timeout on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeout) {
        clearTimeout(longPressTimeout)
      }
    }
  }, [longPressTimeout])

  // Measure button container height when it becomes visible
  useEffect(() => {
    if (longPressCard && buttonContainerRef.current) {
      const height = buttonContainerRef.current.offsetHeight
      setButtonContainerHeight(height)
    }
  }, [longPressCard])

  const fetchManga = async () => {
    try {
      const response = await fetch('/api/manga')
      if (response.ok) {
        const data = await response.json()
        setManga(data)
      }
    } catch (error) {
      console.error('Error fetching manga:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOcrCompletionStatus = async () => {
    try {
      const response = await fetch('/api/notifications/ocr-completion')
      if (response.ok) {
        const text = await response.text()
        if (text) {
          const data = JSON.parse(text)
          setOcrStatus(data)
        } else {
          setOcrStatus(null)
        }
      }
    } catch (error) {
      console.error('Error fetching OCR completion status:', error)
    }
  }

  const handleRetryFailed = async () => {
    try {
      const response = await fetch('/api/ocr/queue/retry-failed', { method: 'POST' })
      if (response.ok) {
        // Clear the status and refresh
        setOcrStatus(null)
        await fetch('/api/notifications/ocr-completion', { method: 'DELETE' })
      }
    } catch (error) {
      console.error('Error retrying failed pages:', error)
    }
  }

  const handleDismissStatus = async () => {
    try {
      const response = await fetch('/api/ocr/completion-status/dismiss', { method: 'POST' })
      if (response.ok) {
        setOcrStatus(null)
      }
    } catch (error) {
      console.error('Error dismissing status:', error)
    }
  }

  const deleteManga = async (id: string, title: string) => {
    if (!confirm(t('notifications.library.deleteConfirm', { title }))) {
      return
    }

    try {
      const response = await fetch(`/api/manga/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setManga(prev => prev.filter(item => item.id !== id))
      } else {
        alert(t('notifications.library.deleteFailed'))
      }
    } catch (error) {
      console.error('Error deleting manga:', error)
      alert(t('notifications.library.deleteFailed'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="font-bold tracking-wider text-accent"
            style={{
              fontSize: '2.5rem',
              letterSpacing: '0em',
              fontWeight: '800'
            }}
          >
            komu
          </motion.h1>
        </div>
        {/* OCR Completion Status Block */}
        {ocrStatus && (
          <OcrStatusBlock
            status={ocrStatus}
            onRetry={handleRetryFailed}
            onDismiss={handleDismissStatus}
          />
        )}

        <AnimatePresence mode="wait">
          {manga.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-20"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-6 bg-surface-2 rounded-3xl flex items-center justify-center shadow-sm"
              >
                <Book className="h-10 w-10 text-text-secondary" />
              </motion.div>
              <motion.h3 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="apple-title-3 text-text-primary mb-3"
              >
                {t('library.empty.title')}
              </motion.h3>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="apple-body text-text-secondary mb-8 max-w-md mx-auto"
              >
                {t('library.empty.description')}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Link to="/import">
                  <Button className="apple-callout font-medium bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-3 shadow-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('library.empty.uploadButton')}
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div 
              key="library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
            >
              {manga.map((item, index) => (
                <motion.div 
                  key={item.id} 
                  data-card-id={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  className="group relative"
                >
                  <motion.div 
                    whileHover={isAnimatingCard === item.id || isPressing === item.id ? {} : { y: -2, scale: 1.02 }}
                    animate={{
                      scale: isPressing === item.id ? 0.95 : 
                             isAnimatingCard === item.id ? 
                               (animationPhase === 'press' ? 0.95 : 
                                animationPhase === 'overshoot' ? 1.05 : 1) : 1,
                      y: isAnimatingCard === item.id || isPressing === item.id ? 0 : undefined
                    }}
                    onTouchStart={(e) => {
                      const touch = e.touches[0]
                      const startPos = { x: touch.clientX, y: touch.clientY }
                      setTouchStartPos(startPos)
                      setIsPressing(item.id)
                      
                      // Reset movement tracking for this card
                      setMaxMovement(prev => ({ ...prev, [item.id]: 0 }))
                      
                      // iOS-compatible long press implementation
                      const timeoutId = setTimeout(() => {
                        setIsPressing(null)
                        setLongPressCard(item.id)
                        setLongPressTimeout(null)
                        
                        // Add haptic feedback on supported devices
                        if (navigator.vibrate) {
                          navigator.vibrate(50)
                        }
                      }, 500) // 500ms for long press
                      
                      setLongPressTimeout(timeoutId)
                    }}
                    onTouchMove={(e) => {
                      // Track cumulative movement for this touch sequence
                      if (touchStartPos) {
                        const touch = e.touches[0]
                        const deltaX = Math.abs(touch.clientX - touchStartPos.x)
                        const deltaY = Math.abs(touch.clientY - touchStartPos.y)
                        const movement = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
                        
                        // Update maximum movement seen for this card
                        setMaxMovement(prev => ({
                          ...prev,
                          [item.id]: Math.max(prev[item.id] || 0, movement)
                        }))
                        
                        // Cancel long press if movement exceeds threshold
                        if (movement > 10 && longPressTimeout) {
                          clearTimeout(longPressTimeout)
                          setLongPressTimeout(null)
                          setIsPressing(null)
                        }
                      }
                    }}
                    onTouchEnd={(e) => {
                      // Clear long press timeout
                      if (longPressTimeout) {
                        clearTimeout(longPressTimeout)
                        setLongPressTimeout(null)
                      }
                      
                      // If long press is active, don't dismiss it - let outside click handle that
                      if (longPressCard === item.id) {
                        setIsPressing(null)
                        setTouchStartPos(null)
                        return
                      }
                      
                      // Check if there was significant movement during the touch sequence
                      const cardMaxMovement = maxMovement[item.id] || 0
                      if (cardMaxMovement > 15) { // 15px threshold
                        setIsPressing(null)
                        setTouchStartPos(null)
                        return
                      }
                      
                      setIsPressing(null)
                      setTouchStartPos(null)
                      
                      // Normal tap behavior - trigger bounce and navigation
                      if (isAnimatingCard) return
                      
                      setIsAnimatingCard(item.id)
                      setAnimationPhase('overshoot')
                      
                      setTimeout(() => {
                        setAnimationPhase('idle')
                        
                        setTimeout(() => {
                          setHideBottomTabs(true)
                          
                          setTimeout(() => {
                            if (item.thumbnail) {
                              setSelectedCover(item.thumbnail)
                              setPendingNavigation(`/reader/${item.id}`)
                              setShowCoverTransition(true)
                            } else {
                              navigate(`/reader/${item.id}`)
                            }
                            
                            setIsAnimatingCard(null)
                            setAnimationPhase('idle')
                          }, 150)
                        }, 150)
                      }, 150)
                    }}
                    onTouchCancel={() => {
                      // Clear long press timeout on touch cancel
                      if (longPressTimeout) {
                        clearTimeout(longPressTimeout)
                        setLongPressTimeout(null)
                      }
                      setIsPressing(null)
                      setTouchStartPos(null)
                    }}
                    // Fallback for desktop - keep framer-motion handlers
                    onTapStart={() => {
                      setIsPressing(item.id)
                      // Reset movement tracking for this card (desktop fallback)
                      setMaxMovement(prev => ({ ...prev, [item.id]: 0 }))
                    }}
                    onTap={() => {
                      setIsPressing(null)
                      // Don't open manga if in long press mode - let outside click handle dismissal
                      if (longPressCard === item.id) {
                        return
                      }
                      
                      // Check movement threshold (same as touch handlers)
                      const cardMaxMovement = maxMovement[item.id] || 0
                      if (cardMaxMovement > 15) {
                        return
                      }
                      
                      // Normal tap behavior - trigger bounce and navigation
                      if (isAnimatingCard) return
                      
                      setIsAnimatingCard(item.id)
                      setAnimationPhase('overshoot')
                      
                      setTimeout(() => {
                        setAnimationPhase('idle')
                        
                        setTimeout(() => {
                          setHideBottomTabs(true)
                          
                          setTimeout(() => {
                            if (item.thumbnail) {
                              setSelectedCover(item.thumbnail)
                              setPendingNavigation(`/reader/${item.id}`)
                              setShowCoverTransition(true)
                            } else {
                              navigate(`/reader/${item.id}`)
                            }
                            
                            setIsAnimatingCard(null)
                            setAnimationPhase('idle')
                          }, 150)
                        }, 150)
                      }, 150)
                    }}
                    onTapCancel={() => setIsPressing(null)}
                    transition={{ 
                      type: "spring",
                      stiffness: 400,
                      damping: 25
                    }}
                    className="bg-card rounded-2xl shadow-sm overflow-hidden border border-border/50 hover:shadow-lg hover:border-border select-none cursor-pointer"
                    style={{ 
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                  >
                    {/* Main card content - slides up on long press */}
                    <motion.div 
                      animate={{
                        y: longPressCard === item.id ? -buttonContainerHeight : 0
                      }}
                      transition={{ 
                        type: "spring",
                        stiffness: 400,
                        damping: 30
                      }}
                      className="relative"
                    >
                      {/* Cover image */}
                      <div className="block aspect-[3/4] bg-surface-2 relative overflow-hidden rounded-t-2xl">
                        <div
                          className="w-full h-full select-none"
                          style={{ 
                            touchAction: 'manipulation',
                            WebkitUserSelect: 'none',
                            WebkitTouchCallout: 'none',
                            WebkitTapHighlightColor: 'transparent'
                          }}
                        >
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-2 to-surface-3">
                              <Book className="h-12 w-12 text-text-tertiary" />
                            </div>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    
                      {/* Title and info area */}
                      <div className="p-4">
                        <h3 className="apple-callout font-semibold text-text-primary mb-2 line-clamp-2 leading-tight" lang="ja">
                          {item.title}
                        </h3>
                        <div className="space-y-1 mb-3">
                          <div className="apple-caption-1 text-text-secondary">
                            {item.number ? t(`metadata.types.${item.type.toLowerCase()}`, { number: item.number }) : `Unknown ${item.type}`}
                          </div>
                          <div className="apple-caption-1 text-text-tertiary line-clamp-1" lang="ja">
                            {item.author || t('library.unknownAuthor')}
                          </div>
                        </div>
                        {item.totalPages > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="apple-caption-2 text-text-secondary">
                                {item.progressPercent === 0 
                                  ? t('library.totalPages', { total: item.totalPages })
                                  : t('library.currentProgress', { current: item.currentPage + 1, total: item.totalPages })
                                }
                              </span>
                              <span className="apple-caption-2 font-medium text-text-primary">
                                {item.progressPercent}%
                              </span>
                            </div>
                            <Progress 
                              value={item.progressPercent} 
                              className="h-1.5 bg-surface-3" 
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Long press edit buttons - slide in from bottom */}
                    <motion.div
                      ref={buttonContainerRef}
                      initial={{ y: buttonContainerHeight, opacity: 0 }}
                      animate={{
                        y: longPressCard === item.id ? 0 : buttonContainerHeight,
                        opacity: longPressCard === item.id ? 1 : 0
                      }}
                      transition={{ 
                        type: "spring",
                        stiffness: 400,
                        damping: 30
                      }}
                      className="absolute bottom-0 left-0 right-0 p-3 bg-surface-1/95 backdrop-blur-sm rounded-b-2xl shadow-sm border-l border-r border-b border-border/50"
                    >
                      <div className="space-y-2">
                        <Link to={`/metadata/${item.id}`} className="block w-full">
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full"
                          >
                            <Button 
                              variant="outline" 
                              className="w-full apple-body font-medium border-border/50 hover:border-border justify-center"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {t('library.editMetadata')}
                            </Button>
                          </motion.div>
                        </Link>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full"
                        >
                          <Button 
                            variant="destructive"
                            className="w-full apple-body font-medium justify-center"
                            onClick={() => {
                              setLongPressCard(null)
                              deleteManga(item.id, item.title)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('library.deleteManga')}
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  </motion.div>
                
                  {/* Refined desktop hover buttons */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    className="hidden md:flex absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 gap-2"
                  >
                    <Link to={`/metadata/${item.id}`}>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-9 w-9 p-0 bg-surface-1/90 hover:bg-surface-1 text-text-primary border border-border/50 shadow-sm backdrop-blur-sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    </Link>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-9 w-9 p-0 shadow-sm backdrop-blur-sm"
                        onClick={() => deleteManga(item.id, item.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <MangaCoverTransition
        coverImage={selectedCover}
        isOpen={showCoverTransition}
        onComplete={() => {
          setShowCoverTransition(false)
          if (pendingNavigation) {
            navigate(pendingNavigation)
            setPendingNavigation(null)
          }
          setSelectedCover(undefined)
        }}
      />
    </div>
  )

  const handleCardTap = (item: MangaItem) => {
    if (isAnimatingCard) return
    
    setIsPressing(null)
    setTouchData(null)
    setIsAnimatingCard(item.id)
    setAnimationPhase('overshoot')
    
    setTimeout(() => {
      setAnimationPhase('idle')
      
      setTimeout(() => {
        if (item.thumbnail) {
          setSelectedCover(item.thumbnail)
          setPendingNavigation(`/reader/${item.id}`)
          setShowCoverTransition(true)
        } else {
          navigate(`/reader/${item.id}`)
        }
        
        setIsAnimatingCard(null)
        setAnimationPhase('idle')
      }, 150)
    }, 150)
  }
}