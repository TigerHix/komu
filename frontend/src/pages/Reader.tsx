import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { MangaCoverTransition } from '@/components/PageTransition'
import { ArrowLeft, Settings, Loader2, Monitor, BookOpen, Scroll, Bug } from 'lucide-react'
import { GrammarBreakdown } from '@/components/GrammarBreakdown'
import { SwiperGallery } from '@/components/SwiperGallery'
import { ScrollingGallery } from '@/components/ScrollingGallery'
import { analyzeGrammar, containsJapanese, cleanTextForAnalysis, type GrammarToken } from '@/utils/grammarAnalysis'
import { useOcrService } from '@/hooks/useOcrService'
import { useReaderNavigation } from '@/hooks/useReaderNavigation'
import { useReaderDebug } from '@/hooks/useReaderDebug'
import { ReadingMode, Manga, TextBlock, READER_CONSTANTS } from '@/constants/reader'

export default function Reader() {
  const { id, page: urlPage } = useParams()
  const navigate = useNavigate()
  
  const [manga, setManga] = useState<Manga | null>(null)
  const [currentPage, setCurrentPage] = useState(() => {
    if (urlPage) {
      const pageNum = parseInt(urlPage, 10) - 1 // Convert to 0-based index
      return isNaN(pageNum) ? 0 : Math.max(0, pageNum)
    }
    return 0
  })
  const [loading, setLoading] = useState(true)
  const [showUI, setShowUI] = useState(true)
  const [readingMode, setReadingMode] = useState<ReadingMode>(() => {
    return (localStorage.getItem('readingMode') as ReadingMode) || 'rtl'
  })
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  
  
  // Grammar breakdown states
  const [showGrammarBreakdown, setShowGrammarBreakdown] = useState(false)
  const [grammarTokens, setGrammarTokens] = useState<GrammarToken[]>([])
  const [grammarAnalysisLoading, setGrammarAnalysisLoading] = useState(false)
  const [selectedSentence, setSelectedSentence] = useState('')
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null)
  const [showExitTransition, setShowExitTransition] = useState(false)
  const [progressBarValue, setProgressBarValue] = useState(() => {
    if (urlPage) {
      const pageNum = parseInt(urlPage, 10) - 1 // Convert to 0-based index
      return isNaN(pageNum) ? 0 : Math.max(0, pageNum)
    }
    return 0
  })
  
  const progressUpdateTimeoutRef = useRef<number | null>(null)
  const progressBarDebounceRef = useRef<number | null>(null)
  const isProgressBarDragging = useRef(false)

  // URL sync function
  const updateURL = useCallback((pageNum: number) => {
    const newPath = `/reader/${id}/${pageNum + 1}` // Convert to 1-based index for URL
    navigate(newPath, { replace: true })
  }, [id, navigate])

  // Debounced progress update function
  const updateReadingProgress = useCallback((pageNum: number) => {
    if (!id) return
    
    // Clear existing timeout
    if (progressUpdateTimeoutRef.current) {
      clearTimeout(progressUpdateTimeoutRef.current)
    }
    
    // Set new timeout for debounced update
    progressUpdateTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/manga/${id}/progress`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ currentPage: pageNum })
        })
      } catch (error) {
        console.error('Failed to update reading progress:', error)
      }
    }, 1000) // 1 second debounce
  }, [id])

  // Custom hooks
  const ocrService = useOcrService()
  const { debugCurrentState } = useReaderDebug()

  const handlePageChange = useCallback(() => {
    if (readingMode !== 'scrolling') {
      ocrService.resetSinglePageData()
    }
  }, [readingMode, ocrService.resetSinglePageData])

  const navigation = useReaderNavigation({
    manga,
    readingMode,
    currentPage,
    setCurrentPage,
    showUI,
    setShowUI,
    setShowSettings,
    onPageChange: handlePageChange
  })

  // Debounced page change function - this handles ALL side effects
  const debouncedPageChange = useCallback((pageNum: number) => {
    isProgressBarDragging.current = true
    
    // Clear existing debounce timeout
    if (progressBarDebounceRef.current) {
      clearTimeout(progressBarDebounceRef.current)
    }
    
    // Set new timeout for debounced page change (includes URL, OCR, progress tracking)
    progressBarDebounceRef.current = setTimeout(() => {
      isProgressBarDragging.current = false
      setCurrentPage(pageNum)
      handlePageChange()
    }, 300) // 300ms debounce as requested
  }, [handlePageChange])

  // Progress bar handler - immediate UI update, debounced everything else
  const handleProgressBarChange = useCallback((newPage: number) => {
    // Only immediate UI updates
    setProgressBarValue(newPage)
    
    // Debounced actual page change (triggers OCR, URL, etc.)
    debouncedPageChange(newPage)
  }, [debouncedPageChange])

  // Handle text block clicks for grammar analysis
  const handleBlockClick = useCallback(async (block: TextBlock, index: number) => {
    const text = block.text?.trim()
    if (!text || !containsJapanese(text)) return

    const cleanedText = cleanTextForAnalysis(text)
    if (!cleanedText) return

    // Hide UI when clicking on text blocks
    setShowUI(false)

    // Track which block was selected
    setSelectedBlockIndex(index)
    setSelectedSentence(text)
    setShowGrammarBreakdown(true)
    setGrammarAnalysisLoading(true)
    setGrammarTokens([])

    try {
      const tokens = await analyzeGrammar(cleanedText)
      setGrammarTokens(tokens)
    } catch (error) {
      console.error('Failed to analyze grammar:', error)
    } finally {
      setGrammarAnalysisLoading(false)
    }
  }, [])

  const closeGrammarBreakdown = useCallback(() => {
    setShowGrammarBreakdown(false)
    setGrammarTokens([])
    setSelectedSentence('')
    setGrammarAnalysisLoading(false)
    setSelectedBlockIndex(null)
  }, [])

  // Lock body scroll completely when in reader mode
  useEffect(() => {
    // Always lock body scroll in reader to prevent library scroll bleed-through
    const originalOverflow = document.body.style.overflow
    const originalPosition = document.body.style.position
    const originalWidth = document.body.style.width
    const originalHeight = document.body.style.height
    
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    
    return () => {
      // Restore original styles when leaving reader
      document.body.style.overflow = originalOverflow
      document.body.style.position = originalPosition
      document.body.style.width = originalWidth
      document.body.style.height = originalHeight
    }
  }, [])

  // Additional body scroll lock when grammar breakdown is open
  useEffect(() => {
    if (showGrammarBreakdown) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.height = '100%'
    }
  }, [showGrammarBreakdown])

  // Handle click outside settings popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettings])

  // Debug handler
  const handleDebug = useCallback(() => {
    debugCurrentState({
      textBlocks: ocrService.singlePageTextBlocks,
      imageSize: ocrService.singlePageImageSize
    })
  }, [debugCurrentState, ocrService.singlePageTextBlocks, ocrService.singlePageImageSize])

  // Save reading mode to localStorage
  useEffect(() => {
    localStorage.setItem('readingMode', readingMode)
  }, [readingMode])

  // Sync progressBarValue when currentPage changes from other sources (not progress bar)
  useEffect(() => {
    if (!isProgressBarDragging.current) {
      setProgressBarValue(currentPage)
    }
    // If user is dragging, keep progressBarValue as-is (shows drag position)
    // It will sync after the debounce completes
  }, [currentPage])

  // Sync URL when page changes (but skip if it's from progress bar drag)
  useEffect(() => {
    if (manga && currentPage >= 0 && currentPage < manga.pages.length && !isProgressBarDragging.current) {
      updateURL(currentPage)
    }
  }, [currentPage, manga, updateURL])

  // Update reading progress when page changes
  useEffect(() => {
    if (manga && currentPage >= 0 && currentPage < manga.pages.length) {
      updateReadingProgress(currentPage)
    }
  }, [currentPage, manga, updateReadingProgress])

  // Cleanup progress update timeout on unmount
  useEffect(() => {
    return () => {
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current)
      }
      if (progressBarDebounceRef.current) {
        clearTimeout(progressBarDebounceRef.current)
      }
    }
  }, [])

  const fetchManga = async () => {
    try {
      const response = await fetch(`/api/manga/${id}`)
      if (response.ok) {
        const data = await response.json()
        setManga(data)
        
        // Update lastReadAt timestamp when manga is opened
        fetch(`/api/manga/${id}/last-read`, {
          method: 'PUT'
        }).catch(error => console.error('Failed to update last read timestamp:', error))
        
        // Determine which page to show
        let targetPage = 0
        
        if (urlPage) {
          // URL page parameter takes precedence (user navigated to specific page)
          const pageNum = parseInt(urlPage, 10) - 1
          if (!isNaN(pageNum) && pageNum >= 0 && pageNum < data.pages.length) {
            targetPage = pageNum
          }
        } else {
          // No URL page, use saved reading progress
          targetPage = Math.max(0, Math.min(data.currentPage, data.pages.length - 1))
        }
        
        setCurrentPage(targetPage)
      }
    } catch (error) {
      console.error('Error fetching manga:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchManga()
    }
  }, [id])

  useEffect(() => {
    const timer = setTimeout(() => setShowUI(false), READER_CONSTANTS.UI_HIDE_DELAY)
    return () => clearTimeout(timer)
  }, [currentPage])

  // OCR status checking and page view tracking
  useEffect(() => {
    if (!manga || !manga.pages[currentPage]) return

    const currentPageData = manga.pages[currentPage]
    
    if (readingMode === 'scrolling') {
      // In scrolling mode, check OCR for current page and adjacent pages (for smooth scrolling)
      const pagesToCheck = [
        Math.max(0, currentPage - 1),
        currentPage,
        Math.min(manga.pages.length - 1, currentPage + 1)
      ]
      
      pagesToCheck.forEach((pageIdx) => {
        if (manga.pages[pageIdx]) {
          ocrService.checkScrollPageOcr(pageIdx, manga.pages[pageIdx])
        }
      })
    } else {
      // Single page modes use the existing logic
      ocrService.checkSinglePageOcr(currentPageData.id)
    }
    
    const cleanup = ocrService.startPageViewTracking(currentPageData.id)
    return cleanup
  }, [manga, currentPage, readingMode, ocrService.checkSinglePageOcr, ocrService.checkScrollPageOcr, ocrService.startPageViewTracking])

  // Reset states when switching reading modes
  useEffect(() => {
    ocrService.resetAllOcrData()
    setShowSettings(false)
  }, [readingMode, ocrService.resetAllOcrData])

  // Auto-close settings when toolbar/UI is hidden
  useEffect(() => {
    if (!showUI && showSettings) {
      setShowSettings(false)
    }
  }, [showUI, showSettings])

  // Dynamic theme color for PWA status bar
  useEffect(() => {
    // Check if we're in a PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone === true

    if (isPWA) {
      let themeColorMeta = document.querySelector('meta[name="theme-color"]')
      
      if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta')
        themeColorMeta.setAttribute('name', 'theme-color')
        document.head.appendChild(themeColorMeta)
      }

      // Set theme color based on UI visibility in reader
      if (showUI) {
        // Dark overlay color when UI is visible
        themeColorMeta.setAttribute('content', 'rgba(0, 0, 0, 0.8)')
      } else {
        // Pure black to match manga background for seamless integration
        themeColorMeta.setAttribute('content', '#000000')
      }
    }

    // Cleanup function to reset on unmount
    return () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    window.navigator.standalone === true
      if (isPWA) {
        const themeColorMeta = document.querySelector('meta[name="theme-color"]')
        if (themeColorMeta) {
          themeColorMeta.setAttribute('content', 'hsl(142, 65%, 28%)') // Reset to original accent color
        }
      }
    }
  }, [showUI])


  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!manga || manga.pages.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="mb-4">No pages found</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const currentPageData = manga.pages[currentPage]

  // Render reading mode content
  const renderContent = () => {
    const baseProps = {
      pages: manga.pages,
      currentPageIndex: currentPage,
      onPageChange: (newPage: number) => {
        setCurrentPage(newPage)
        handlePageChange()
      },
      onBlockClick: handleBlockClick,
      onBackgroundClick: () => setShowUI(!showUI),
      readingMode
    }

    return (
      <div className="h-full">
        {readingMode === 'scrolling' ? (
          <ScrollingGallery 
            {...baseProps}
            scrollTextBlocks={ocrService.scrollTextBlocks}
            scrollImageSizes={ocrService.scrollImageSizes}
            isGrammarOpen={showGrammarBreakdown}
            selectedBlockIndex={selectedBlockIndex}
          />
        ) : (
          <SwiperGallery 
            {...baseProps}
            textBlocks={ocrService.singlePageTextBlocks}
            imageSize={ocrService.singlePageImageSize}
            isGrammarOpen={showGrammarBreakdown}
            selectedBlockIndex={selectedBlockIndex}
          />
        )}
      </div>
    )
  }

  return (
    <div 
      className="ios-full-height bg-black relative overflow-hidden ios-user-select-none ios-touch-callout-none ios-tap-highlight-transparent ios-no-bounce"
    >
      {/* Refined Header with Apple-level polish */}
      <AnimatePresence>
        {showUI && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute top-0 left-0 right-0 z-10 bg-overlay backdrop-blur-xl"
          >
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Check if we have a cover image for reverse transition
                        const coverImage = manga?.pages?.[0]?.imagePath
                        if (coverImage) {
                          setShowExitTransition(true)
                        } else {
                          navigate(-1)
                        }
                      }}
                      className="text-white/90 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all duration-200"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  </motion.div>
                  <div className="min-w-0 flex-1">
                    <h1 className="apple-headline text-white font-semibold truncate">{manga.title}</h1>
                    <p className="apple-caption-1 text-white/70 mt-0.5">Page {currentPage + 1} of {manga.pages.length}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <AnimatePresence>
                    {currentPageData && ocrService.pageOcrStatus[currentPageData.id] === 'PROCESSING' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center text-white/70 apple-caption-1"
                      >
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSettings(!showSettings)}
                      className="text-white/90 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all duration-200"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refined Settings Popup */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            ref={settingsRef}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-20 right-6 z-20 bg-surface-1/95 backdrop-blur-xl rounded-2xl border border-border/20 shadow-xl overflow-hidden"
          >
            <div className="p-6 min-w-[240px]">
              <h3 className="apple-headline text-text-primary font-semibold mb-4">Reading Mode</h3>
              <div className="space-y-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant={readingMode === 'rtl' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setReadingMode('rtl')}
                    className={`w-full justify-start apple-callout font-medium transition-all duration-200 rounded-xl h-12 ${
                      readingMode === 'rtl' 
                        ? 'bg-accent text-accent-foreground shadow-sm' 
                        : 'text-text-primary hover:bg-surface-2'
                    }`}
                  >
                    <BookOpen className="h-4 w-4 mr-3" />
                    Right to Left (RTL)
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant={readingMode === 'ltr' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setReadingMode('ltr')}
                    className={`w-full justify-start apple-callout font-medium transition-all duration-200 rounded-xl h-12 ${
                      readingMode === 'ltr' 
                        ? 'bg-accent text-accent-foreground shadow-sm' 
                        : 'text-text-primary hover:bg-surface-2'
                    }`}
                  >
                    <Monitor className="h-4 w-4 mr-3" />
                    Left to Right (LTR)
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant={readingMode === 'scrolling' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setReadingMode('scrolling')}
                    className={`w-full justify-start apple-callout font-medium transition-all duration-200 rounded-xl h-12 ${
                      readingMode === 'scrolling' 
                        ? 'bg-accent text-accent-foreground shadow-sm' 
                        : 'text-text-primary hover:bg-surface-2'
                    }`}
                  >
                    <Scroll className="h-4 w-4 mr-3" />
                    Continuous Scrolling
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      {renderContent()}

      {/* Refined Navigation Footer */}
      <AnimatePresence>
        {showUI && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute bottom-0 left-0 right-0 z-10 bg-overlay backdrop-blur-xl pwa-safe-bottom"
          >
            <div className="px-6 py-4">
              <div className="flex items-center space-x-4">
                <div className="text-white apple-caption-1 font-medium min-w-fit bg-white/10 px-3 py-1.5 rounded-full">
                  {progressBarValue + 1} / {manga.pages.length}
                </div>
                
                <div className="flex flex-1 relative">
                  <input
                    type="range"
                    min="0"
                    max={manga.pages.length - 1}
                    value={readingMode === 'rtl' ? manga.pages.length - 1 - progressBarValue : progressBarValue}
                    onChange={(e) => {
                      const sliderValue = parseInt(e.target.value)
                      const newPage = readingMode === 'rtl' ? manga.pages.length - 1 - sliderValue : sliderValue
                      handleProgressBarChange(newPage)
                    }}
                    className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-default slider transition-all duration-200 hover:h-3"
                    style={{
                      background: readingMode === 'rtl' 
                        ? `linear-gradient(to left, hsl(var(--accent)) 0%, hsl(var(--accent)) ${((progressBarValue + 1) / manga.pages.length) * 100}%, rgba(255,255,255,0.2) ${((progressBarValue + 1) / manga.pages.length) * 100}%, rgba(255,255,255,0.2) 100%)`
                        : `linear-gradient(to right, hsl(var(--accent)) 0%, hsl(var(--accent)) ${((progressBarValue + 1) / manga.pages.length) * 100}%, rgba(255,255,255,0.2) ${((progressBarValue + 1) / manga.pages.length) * 100}%, rgba(255,255,255,0.2) 100%)`
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grammar Breakdown Modal */}
      <GrammarBreakdown
        isOpen={showGrammarBreakdown}
        onClose={closeGrammarBreakdown}
        tokens={grammarTokens}
        loading={grammarAnalysisLoading}
      />

      <div id="grammar-breakdown-portal"></div>
      
      {/* Exit Transition */}
      <MangaCoverTransition
        coverImage={manga?.pages?.[0]?.imagePath}
        isOpen={showExitTransition}
        isReversed={true}
        onComplete={() => {
          setShowExitTransition(false)
          navigate(-1)
        }}
      />
    </div>
  )
}