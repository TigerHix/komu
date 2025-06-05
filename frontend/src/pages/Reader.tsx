import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { MangaCoverTransition } from '@/components/PageTransition'
import { ArrowLeft, Settings, Loader2, Monitor, BookOpen, Scroll, Bug } from 'lucide-react'
import { GrammarBreakdown } from '@/components/GrammarBreakdown'
import { SwiperGallery } from '@/components/SwiperGallery'
import { ScrollingGallery } from '@/components/ScrollingGallery'
import { TextPopoutModal } from '@/components/TextPopoutModal'
import { analyzeGrammar, cleanTextForAnalysis, type GrammarToken } from '@/utils/grammarAnalysis'
import { useOcrService } from '@/hooks/useOcrService'
import { useReaderNavigation } from '@/hooks/useReaderNavigation'
import { useReaderDebug } from '@/hooks/useReaderDebug'
import { useDarkMode } from '@/hooks/useDarkMode'
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
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  
  
  // Grammar breakdown states
  const [showGrammarBreakdown, setShowGrammarBreakdown] = useState(false)
  const [grammarTokens, setGrammarTokens] = useState<GrammarToken[]>([])
  const [grammarAnalysisLoading, setGrammarAnalysisLoading] = useState(false)
  const [selectedSentence, setSelectedSentence] = useState('')
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<TextBlock | null>(null)
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null)
  const [selectedTextBlockId, setSelectedTextBlockId] = useState<string | null>(null)
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null)
  const [showExitTransition, setShowExitTransition] = useState(false)
  const [sheetProgress, setSheetProgress] = useState(0)
  const [isEditingOcrText, setIsEditingOcrText] = useState(false)
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
  const { isDarkMode } = useDarkMode()

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
    onPageChange: handlePageChange,
    disableKeyboard: showGrammarBreakdown || showSettings || grammarAnalysisLoading || isEditingOcrText
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
  const handleBlockClick = useCallback(async (block: TextBlock, index: number, pageIndex?: number, clickPosition?: { x: number; y: number }) => {
    const text = block.text?.trim()
    if (!text) return

    const cleanedText = cleanTextForAnalysis(text)
    if (!cleanedText) return

    // Hide UI when clicking on text blocks
    setShowUI(false)

    const actualPageIndex = pageIndex ?? currentPage

    // Use the actual click position for animation
    if (clickPosition) {
      setClickPosition(clickPosition)
    } else {
      setClickPosition(null)
    }

    // Track which block was selected
    setSelectedBlockIndex(index)
    setSelectedBlock(block)
    setSelectedPageIndex(actualPageIndex)
    setSelectedSentence(text)
    setSelectedTextBlockId(block.id || null)
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
  }, [currentPage, readingMode, ocrService.scrollImageSizes, ocrService.singlePageImageSize])

  const closeGrammarBreakdown = useCallback(() => {
    setShowGrammarBreakdown(false)
    setGrammarTokens([])
    setSelectedSentence('')
    setGrammarAnalysisLoading(false)
    setSelectedBlockIndex(null)
    setSelectedBlock(null)
    setSelectedPageIndex(null)
    setSelectedTextBlockId(null)
    setClickPosition(null)
    setSheetProgress(0)
  }, [])

  // Handle text update from OCR editing
  const handleTextUpdate = useCallback(async (newText: string) => {
    // Update the selected sentence and re-analyze grammar
    setSelectedSentence(newText)
    setGrammarAnalysisLoading(true)
    setGrammarTokens([])

    // Ensure grammar breakdown modal stays open during re-analysis
    setShowGrammarBreakdown(true)

    try {
      const tokens = await analyzeGrammar(cleanTextForAnalysis(newText))
      setGrammarTokens(tokens)
    } catch (error) {
      console.error('Failed to re-analyze grammar:', error)
    } finally {
      setGrammarAnalysisLoading(false)
    }

    // Update the text block in the OCR service cache
    if (selectedBlock && selectedPageIndex !== null) {
      // Force refresh of OCR data to reflect the database update
      const actualPageIndex = selectedPageIndex ?? currentPage
      if (readingMode === 'scrolling') {
        ocrService.resetScrollPageData(actualPageIndex)
        if (manga?.pages[actualPageIndex]) {
          ocrService.checkScrollPageOcr(actualPageIndex, manga.pages[actualPageIndex])
        }
      } else {
        ocrService.resetSinglePageData()
        if (manga?.pages[actualPageIndex]) {
          ocrService.checkSinglePageOcr(manga.pages[actualPageIndex].id)
        }
      }
    }
  }, [selectedBlock, selectedPageIndex, currentPage, readingMode, manga, ocrService])

  // Handle refetch of text blocks after OCR text update  
  const handleRefetchTextBlocks = useCallback((newText: string, textBlockId?: string) => {
    const blockId = textBlockId || selectedTextBlockId
    const pageIndex = selectedPageIndex !== null ? selectedPageIndex : currentPage
    
    console.log('Reader: handleRefetchTextBlocks called', { 
      newText, 
      textBlockId,
      blockId,
      selectedTextBlockId, 
      selectedPageIndex, 
      pageIndex,
      currentPage, 
      readingMode 
    })
    
    if (blockId) {
      // Immediately update the text block in the OCR service cache
      console.log('Reader: Calling ocrService.updateTextBlock', { blockId, newText, pageIndex })
      ocrService.updateTextBlock(blockId, newText, pageIndex)
      
      // Update the selected block state immediately
      if (selectedBlock) {
        const updatedBlock = { ...selectedBlock, text: newText }
        setSelectedBlock(updatedBlock)
        console.log('Reader: Updated selected block with new text:', newText)
      }
    }
  }, [selectedTextBlockId, selectedPageIndex, currentPage, selectedBlock, ocrService, readingMode])

  // Lock body scroll with iOS fixed positioning for translucent status bar
  useEffect(() => {
    // Reset scroll position immediately when entering reader
    window.scrollTo(0, 0)
    
    // Store original styles
    const originalOverflow = document.body.style.overflow
    const originalPosition = document.body.style.position
    const originalTop = document.body.style.top
    const originalLeft = document.body.style.left
    
    // Apply iOS-style fixed positioning (like react-sheet-slide does)
    // Use 0 for scroll position since we just reset it
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = '0px'
    document.body.style.left = '0px'
    
    
    return () => {
      // Restore all original styles
      document.body.style.overflow = originalOverflow
      document.body.style.position = originalPosition
      document.body.style.top = originalTop
      document.body.style.left = originalLeft
      
      // Keep scroll at 0 when leaving reader
      window.scrollTo(0, 0)
    }
  }, [])
  
  // Add reader-mode class for black background
  useEffect(() => {
    document.documentElement.classList.add('reader-mode')
    
    return () => {
      document.documentElement.classList.remove('reader-mode')
    }
  }, [])

  // Let react-sheet-slide handle its own body scroll lock when open
  // No additional body manipulation needed

  // Handle click outside settings popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // Don't close if clicking on settings popup or settings button
      if (settingsRef.current && !settingsRef.current.contains(target) &&
          settingsButtonRef.current && !settingsButtonRef.current.contains(target)) {
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
        fetch(`/api/manga/${id}/reading-session`, {
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



  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
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
    // Determine if keyboard should be disabled
    const shouldDisableKeyboard = showGrammarBreakdown || showSettings || grammarAnalysisLoading || isEditingOcrText
    
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
            disableKeyboard={shouldDisableKeyboard}
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
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ 
              type: "spring",
              stiffness: 400,
              damping: 25,
              delay: 0.1
            }}
            className="absolute left-0 right-0 z-10 reader-gradient-toolbar reader-toolbar-height"
          >
            <div className="py-4" style={{ 
              paddingLeft: 'max(24px, env(safe-area-inset-left, 24px))', 
              paddingRight: 'max(24px, env(safe-area-inset-right, 24px))',
              paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))'
            }}>
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
                    <p className="apple-caption-1 text-white/70 mt-0.5">
                      {manga.type && manga.number ? 
                        `${manga.type} ${manga.number}` : 
                        `Page ${currentPage + 1} of ${manga.pages.length}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end">
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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ 
              type: "spring",
              stiffness: 500,
              damping: 30
            }}
            className="absolute z-20 bg-surface-1/95 backdrop-blur-xl rounded-2xl border border-border/20 shadow-xl overflow-hidden"
            style={{
              bottom: 'max(100px, calc(env(safe-area-inset-bottom, 24px) + 76px))',
              right: '16px',
              transformOrigin: 'bottom right'
            }}
          >
            <div className="p-6 min-w-[240px]">
              <h3 className="apple-headline text-text-primary font-semibold mb-4">Reading Mode</h3>
              <div className="space-y-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant={readingMode === 'rtl' ? 'accent' : 'accent-ghost'}
                    size="sm"
                    onClick={() => setReadingMode('rtl')}
                    className="w-full justify-start apple-callout font-medium transition-all duration-200 rounded-xl h-12"
                  >
                    <BookOpen className="h-4 w-4 mr-3" />
                    Right to Left (RTL)
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant={readingMode === 'ltr' ? 'accent' : 'accent-ghost'}
                    size="sm"
                    onClick={() => setReadingMode('ltr')}
                    className="w-full justify-start apple-callout font-medium transition-all duration-200 rounded-xl h-12"
                  >
                    <Monitor className="h-4 w-4 mr-3" />
                    Left to Right (LTR)
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant={readingMode === 'scrolling' ? 'accent' : 'accent-ghost'}
                    size="sm"
                    onClick={() => setReadingMode('scrolling')}
                    className="w-full justify-start apple-callout font-medium transition-all duration-200 rounded-xl h-12"
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

      {/* Floating Bottom Panel */}
      <AnimatePresence>
        {showUI && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ 
              type: "spring",
              stiffness: 500,
              damping: 30
            }}
            className="absolute z-10 reader-bottom-panel"
            style={{
              bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
              left: '16px',
              right: '16px'
            }}
            whileHover={{ y: -2 }}
          >
            <div className="px-6 py-4">
              <div className="flex items-center space-x-4">
                {/* Page Counter */}
                <div className="text-text-primary apple-caption-1 font-medium min-w-fit">
                  <span className="bg-muted px-3 py-1.5 rounded-full">
                    {progressBarValue + 1} / {manga.pages.length}
                  </span>
                </div>
                
                {/* Enhanced Progress Bar */}
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
                    className="w-full h-1.5 rounded-full appearance-none cursor-default slider transition-all duration-300 hover:h-2"
                    style={{
                      background: readingMode === 'rtl' 
                        ? `linear-gradient(to left, hsl(var(--accent)) 0%, hsl(var(--accent)) ${((progressBarValue + 1) / manga.pages.length) * 100}%, hsl(var(--muted)) ${((progressBarValue + 1) / manga.pages.length) * 100}%, hsl(var(--muted)) 100%)`
                        : `linear-gradient(to right, hsl(var(--accent)) 0%, hsl(var(--accent)) ${((progressBarValue + 1) / manga.pages.length) * 100}%, hsl(var(--muted)) ${((progressBarValue + 1) / manga.pages.length) * 100}%, hsl(var(--muted)) 100%)`
                    }}
                  />
                </div>

                {/* Settings Controls */}
                <div className="flex items-center">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      ref={settingsButtonRef}
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSettings(!showSettings)}
                      className="text-text-secondary hover:text-text-primary hover:bg-surface-2 p-2 rounded-xl transition-all duration-200"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text Popout Modal */}
      <TextPopoutModal
        isOpen={showGrammarBreakdown && selectedBlock !== null}
        selectedBlock={selectedBlock}
        selectedBlockIndex={selectedBlockIndex}
        imagePath={selectedPageIndex !== null && manga?.pages[selectedPageIndex] 
          ? manga.pages[selectedPageIndex].imagePath 
          : (currentPageData?.imagePath || '')
        }
        imageSize={selectedPageIndex !== null && readingMode === 'scrolling' 
          ? ocrService.scrollImageSizes[selectedPageIndex] || { width: 800, height: 1200 }
          : readingMode === 'scrolling' 
            ? ocrService.scrollImageSizes[currentPage] || { width: 800, height: 1200 }
            : ocrService.singlePageImageSize
        }
        onClose={() => {}}
        isBottomSheetExpanded={sheetProgress > 0.3}
        originalPosition={clickPosition}
        sheetProgress={sheetProgress}
        pageIndex={selectedPageIndex ?? currentPage}
      />

      {/* Grammar Breakdown Modal */}
      <GrammarBreakdown
        isOpen={showGrammarBreakdown}
        onClose={closeGrammarBreakdown}
        tokens={grammarTokens}
        loading={grammarAnalysisLoading}
        originalText={selectedSentence}
        textBlockId={selectedTextBlockId}
        onTextUpdate={handleTextUpdate}
        selectedBlock={selectedBlock}
        imagePath={selectedPageIndex !== null && manga?.pages[selectedPageIndex] 
          ? manga.pages[selectedPageIndex].imagePath 
          : (currentPageData?.imagePath || '')
        }
        imageSize={selectedPageIndex !== null && readingMode === 'scrolling' 
          ? ocrService.scrollImageSizes[selectedPageIndex] || { width: 800, height: 1200 }
          : readingMode === 'scrolling' 
            ? ocrService.scrollImageSizes[currentPage] || { width: 800, height: 1200 }
            : ocrService.singlePageImageSize
        }
        onSheetExpansionChange={(progress) => {
          console.log('Reader received sheet progress:', progress)
          setSheetProgress(progress)
        }}
        onEditingStateChange={setIsEditingOcrText}
        onRefetchTextBlocks={handleRefetchTextBlocks}
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