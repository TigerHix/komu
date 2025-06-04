import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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
  
  
  // Grammar breakdown states
  const [showGrammarBreakdown, setShowGrammarBreakdown] = useState(false)
  const [grammarTokens, setGrammarTokens] = useState<GrammarToken[]>([])
  const [grammarAnalysisLoading, setGrammarAnalysisLoading] = useState(false)
  const [selectedSentence, setSelectedSentence] = useState('')
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null)
  
  const progressUpdateTimeoutRef = useRef<number | null>(null)

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

  // Prevent body scroll when grammar breakdown is open (PWA fix)
  useEffect(() => {
    if (showGrammarBreakdown) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [showGrammarBreakdown])

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

  // Sync URL when page changes
  useEffect(() => {
    if (manga && currentPage >= 0 && currentPage < manga.pages.length) {
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
    }
  }, [])

  const fetchManga = async () => {
    try {
      const response = await fetch(`/api/manga/${id}`)
      if (response.ok) {
        const data = await response.json()
        setManga(data)
        
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
      {/* Header */}
      <div className={`
        absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm p-4 pwa-safe-top pwa-safe-x
        transition-opacity duration-300
        ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-medium">{manga.title}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {currentPageData && ocrService.pageOcrStatus[currentPageData.id] === 'PROCESSING' && (
              <div className="flex items-center text-white/70 text-sm">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing page...
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-white hover:bg-white/20"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Popup */}
      {showSettings && (
        <div className="absolute top-16 right-4 z-20 bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="text-white space-y-3">
            <h3 className="font-medium mb-3">Reading Mode</h3>
            <div className="space-y-2">
              <Button
                variant={readingMode === 'rtl' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setReadingMode('rtl')}
                className="w-full justify-start text-white hover:bg-white/20"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Right to Left (RTL)
              </Button>
              <Button
                variant={readingMode === 'ltr' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setReadingMode('ltr')}
                className="w-full justify-start text-white hover:bg-white/20"
              >
                <Monitor className="h-4 w-4 mr-2" />
                Left to Right (LTR)
              </Button>
              <Button
                variant={readingMode === 'scrolling' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setReadingMode('scrolling')}
                className="w-full justify-start text-white hover:bg-white/20"
              >
                <Scroll className="h-4 w-4 mr-2" />
                Continuous Scrolling
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {renderContent()}

      {/* Navigation Footer */}
      <div className={`
        absolute bottom-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm p-4 pwa-safe-bottom pwa-safe-x
        transition-opacity duration-300
        ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}>
        <div className="flex items-center space-x-4">
          <div className="text-white text-sm font-medium min-w-fit">
            {currentPage + 1} / {manga.pages.length}
          </div>
          
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={manga.pages.length - 1}
              value={currentPage}
              onChange={(e) => {
                const newPage = parseInt(e.target.value)
                navigation.goToPage(newPage)
              }}
              className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-default slider"
              style={{
                background: `linear-gradient(to right, #ffffff 0%, #ffffff ${((currentPage + 1) / manga.pages.length) * 100}%, rgba(255,255,255,0.2) ${((currentPage + 1) / manga.pages.length) * 100}%, rgba(255,255,255,0.2) 100%)`
              }}
            />
          </div>
        </div>
      </div>

      {/* Grammar Breakdown Modal */}
      <GrammarBreakdown
        isOpen={showGrammarBreakdown}
        onClose={closeGrammarBreakdown}
        tokens={grammarTokens}
        loading={grammarAnalysisLoading}
      />

      <div id="grammar-breakdown-portal"></div>
    </div>
  )
}