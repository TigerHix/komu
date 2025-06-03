import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home, Settings, ZoomIn, ZoomOut, RotateCcw, Loader2, Monitor, BookOpen, Scroll } from 'lucide-react'
import { GrammarBreakdown } from '@/components/GrammarBreakdown'
import { analyzeGrammar, containsJapanese, cleanTextForAnalysis, type GrammarToken } from '@/utils/grammarAnalysis'

type ReadingMode = 'rtl' | 'ltr' | 'scrolling'

interface Page {
  id: string
  pageNum: number
  imagePath: string
  ocrStatus?: string
}

interface Manga {
  id: string
  title: string
  type: string
  number?: number
  pages: Page[]
}

interface TextBlock {
  bbox: [number, number, number, number]
  text: string
}

export default function Reader() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [manga, setManga] = useState<Manga | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showUI, setShowUI] = useState(true)
  const [readingMode, setReadingMode] = useState<ReadingMode>(() => {
    return (localStorage.getItem('readingMode') as ReadingMode) || 'rtl'
  })
  const [showSettings, setShowSettings] = useState(false)
  
  // Single page mode states (RTL/LTR)
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([])
  const [showTextBlocks, setShowTextBlocks] = useState(false)
  const [imageSize, setImageSize] = useState<{width: number, height: number} | null>(null)
  const [pageOcrStatus, setPageOcrStatus] = useState<Record<string, string>>({})
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastTap, setLastTap] = useState(0)
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  
  // Scrolling mode states
  const [scrollZoom, setScrollZoom] = useState(1)
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set())
  const [scrollTextBlocks, setScrollTextBlocks] = useState<Record<number, TextBlock[]>>({})
  const [scrollImageSizes, setScrollImageSizes] = useState<Record<number, {width: number, height: number}>>({})
  
  // Grammar breakdown states
  const [showGrammarBreakdown, setShowGrammarBreakdown] = useState(false)
  const [grammarTokens, setGrammarTokens] = useState<GrammarToken[]>([])
  const [grammarAnalysisLoading, setGrammarAnalysisLoading] = useState(false)
  const [selectedSentence, setSelectedSentence] = useState('')
  
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Handle text block clicks for grammar analysis
  const handleBlockClick = useCallback(async (block: TextBlock, index: number) => {
    const text = block.text?.trim()
    if (!text || !containsJapanese(text)) return

    // Clean text for analysis (remove punctuation, etc.)
    const cleanedText = cleanTextForAnalysis(text)
    if (!cleanedText) return

    setSelectedSentence(text)
    setShowGrammarBreakdown(true)
    setGrammarAnalysisLoading(true)
    setGrammarTokens([])

    try {
      const tokens = await analyzeGrammar(cleanedText)
      setGrammarTokens(tokens)
    } catch (error) {
      console.error('Failed to analyze grammar:', error)
      // You could show an error message here
    } finally {
      setGrammarAnalysisLoading(false)
    }
  }, [])

  const closeGrammarBreakdown = useCallback(() => {
    setShowGrammarBreakdown(false)
    setGrammarTokens([])
    setSelectedSentence('')
    setGrammarAnalysisLoading(false)
  }, [])

  // Save reading mode to localStorage
  useEffect(() => {
    localStorage.setItem('readingMode', readingMode)
  }, [readingMode])

  // Page viewing detection - notify backend when user views page for 1+ second
  const notifyPageView = useCallback(async (pageId: string) => {
    try {
      await fetch(`/api/reader/view-page/${pageId}`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error notifying page view:', error)
    }
  }, [])

  // Check OCR status and load existing results for single page modes
  const checkOcrStatus = useCallback(async (pageId: string) => {
    try {
      const response = await fetch(`/api/ocr/page/${pageId}/status`)
      if (response.ok) {
        const status = await response.json()
        setPageOcrStatus(prev => ({
          ...prev,
          [pageId]: status.ocrStatus
        }))

        // If completed, load the results
        if (status.ocrStatus === 'COMPLETED') {
          const resultsResponse = await fetch(`/api/ocr/page/${pageId}/results`)
          if (resultsResponse.ok) {
            const data = await resultsResponse.json()
            setTextBlocks(data.textBlocks || [])
            setShowTextBlocks(data.textBlocks?.length > 0)
            // Use the actual image size from OCR results
            if (data.imageSize) {
              setImageSize(data.imageSize)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking OCR status:', error)
    }
  }, [])

  // Check OCR status for scrolling mode (multiple pages)
  const checkScrollOcrStatus = useCallback(async (pageNum: number) => {
    if (!manga) return
    
    const page = manga.pages[pageNum]
    if (!page) return

    try {
      const response = await fetch(`/api/ocr/page/${page.id}/status`)
      if (response.ok) {
        const status = await response.json()
        setPageOcrStatus(prev => ({
          ...prev,
          [page.id]: status.ocrStatus
        }))

        // If completed, load the results
        if (status.ocrStatus === 'COMPLETED') {
          const resultsResponse = await fetch(`/api/ocr/page/${page.id}/results`)
          if (resultsResponse.ok) {
            const data = await resultsResponse.json()
            setScrollTextBlocks(prev => ({
              ...prev,
              [pageNum]: data.textBlocks || []
            }))
            if (data.imageSize) {
              setScrollImageSizes(prev => ({
                ...prev,
                [pageNum]: data.imageSize
              }))
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking OCR status:', error)
    }
  }, [manga])

  const fetchManga = async () => {
    try {
      const response = await fetch(`/api/manga/${id}`)
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

  useEffect(() => {
    if (id) {
      fetchManga()
    }
  }, [id])

  useEffect(() => {
    const timer = setTimeout(() => setShowUI(false), 3000)
    return () => clearTimeout(timer)
  }, [currentPage])

  // Page viewing detection and OCR status checking for single page modes
  useEffect(() => {
    if (!manga || !manga.pages[currentPage] || readingMode === 'scrolling') return

    const currentPageData = manga.pages[currentPage]
    
    // Clear previous timer
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current)
    }

    // Check OCR status immediately
    checkOcrStatus(currentPageData.id)

    // Set timer to notify page view after 1 second
    viewTimerRef.current = setTimeout(() => {
      notifyPageView(currentPageData.id)
    }, 1000)

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current)
      }
    }
  }, [manga, currentPage, checkOcrStatus, notifyPageView, readingMode])

  // Navigation functions
  const nextPage = useCallback(() => {
    if (manga && currentPage < manga.pages.length - 1) {
      setCurrentPage(prev => prev + 1)
      setShowUI(false)
      if (readingMode !== 'scrolling') {
        setShowTextBlocks(false)
        setTextBlocks([])
        setImageSize(null)
        setHoveredBlock(null)
        setZoom(1)
        setPanX(0)
        setPanY(0)
      }
    }
  }, [manga, currentPage, readingMode])

  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1)
      setShowUI(false)
      if (readingMode !== 'scrolling') {
        setShowTextBlocks(false)
        setTextBlocks([])
        setImageSize(null)
        setHoveredBlock(null)
        setZoom(1)
        setPanX(0)
        setPanY(0)
      }
    }
  }, [currentPage, readingMode])

  // Click area detection for single page modes
  const handlePageClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (readingMode === 'scrolling') return
    
    // Don't navigate when zoomed in or if we just finished dragging
    if (zoom > 1 || isDragging) {
      return
    }

    // Find the image element to get its actual displayed bounds
    const imgElement = e.currentTarget.querySelector('img') as HTMLImageElement
    if (!imgElement) return

    const imgRect = imgElement.getBoundingClientRect()
    const containerRect = e.currentTarget.getBoundingClientRect()
    
    const clickX = e.clientX - containerRect.left
    const clickY = e.clientY - containerRect.top
    
    // Check if click is inside the image bounds
    const isInsideImage = e.clientX >= imgRect.left && e.clientX <= imgRect.right && 
                         e.clientY >= imgRect.top && e.clientY <= imgRect.bottom

    if (isInsideImage) {
      // Click inside image - use image-based thirds for center toggle
      const imgClickX = e.clientX - imgRect.left
      const leftThird = imgRect.width / 3
      const rightThird = imgRect.width * 2 / 3

      // Center third of image - toggle toolbar
      if (imgClickX >= leftThird && imgClickX <= rightThird) {
        setShowUI(!showUI)
        return
      }
    }

    // For navigation, use container-based left/right halves (works for both inside and outside image)
    const containerCenterX = containerRect.width / 2
    
    if (readingMode === 'rtl') {
      // RTL: left = next, right = previous
      if (clickX < containerCenterX) {
        nextPage()
      } else {
        prevPage()
      }
    } else {
      // LTR: left = previous, right = next
      if (clickX < containerCenterX) {
        prevPage()
      } else {
        nextPage()
      }
    }
    
    // Close settings when navigating
    setShowSettings(false)
  }, [readingMode, zoom, isDragging, showUI, nextPage, prevPage])

  // Click area detection for scrolling mode - handle clicks on individual page images
  const handleScrollPageClick = useCallback((e: React.MouseEvent<HTMLElement>, pageIndex: number) => {
    if (readingMode !== 'scrolling' || !scrollContainerRef.current) return

    // Find the specific image that was clicked
    const imgElement = e.currentTarget as HTMLImageElement
    const imgRect = imgElement.getBoundingClientRect()
    const clickY = e.clientY - imgRect.top
    
    // Check if click is outside the image bounds
    if (clickY < 0 || clickY > imgRect.height || 
        e.clientX < imgRect.left || e.clientX > imgRect.right) {
      return
    }

    const topThird = imgRect.height / 3
    const bottomThird = imgRect.height * 2 / 3

    // Center third - toggle toolbar
    if (clickY >= topThird && clickY <= bottomThird) {
      setShowUI(!showUI)
      return
    }

    // Calculate scroll to next/previous page
    const containerHeight = scrollContainerRef.current.clientHeight
    const scrollStep = containerHeight * 0.8 // Scroll by 80% of container height

    if (clickY < topThird) {
      // Top third - scroll to previous page
      scrollContainerRef.current.scrollBy({
        top: -scrollStep,
        behavior: 'smooth'
      })
    } else {
      // Bottom third - scroll to next page
      scrollContainerRef.current.scrollBy({
        top: scrollStep,
        behavior: 'smooth'
      })
    }
    
    // Close settings when navigating
    setShowSettings(false)
  }, [readingMode, showUI])

  // Zoom constraints - minimum 100%
  const constrainZoom = useCallback((newZoom: number) => {
    return Math.max(1, Math.min(5, newZoom))
  }, [])

  // Pan constraints - prevent any black borders when zoomed
  const constrainPan = useCallback((newPanX: number, newPanY: number, currentZoom: number) => {
    if (currentZoom <= 1) {
      return { x: 0, y: 0 }
    }

    // Get image element
    const imgElement = document.querySelector('img[alt*="Page"]') as HTMLImageElement
    if (!imgElement) return { x: 0, y: 0 }

    const rect = imgElement.getBoundingClientRect()
    const currentWidth = rect.width
    const currentHeight = rect.height
    
    // Viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // If image dimension is smaller than viewport, don't allow panning in that direction
    let constrainedX = newPanX
    let constrainedY = newPanY
    
    // For horizontal: if image width <= viewport width, no horizontal panning
    if (currentWidth <= viewportWidth) {
      constrainedX = 0
    } else {
      // Allow panning but limit to prevent black borders
      const maxPanX = (currentWidth - viewportWidth) / 2 / currentZoom
      constrainedX = Math.max(-maxPanX, Math.min(maxPanX, newPanX))
    }
    
    // For vertical: if image height <= viewport height, no vertical panning  
    if (currentHeight <= viewportHeight) {
      constrainedY = 0
    } else {
      // Allow panning but limit to prevent black borders
      const maxPanY = (currentHeight - viewportHeight) / 2 / currentZoom
      constrainedY = Math.max(-maxPanY, Math.min(maxPanY, newPanY))
    }
    
    return { x: constrainedX, y: constrainedY }
  }, [])

  // Zoom handlers for single page modes
  const handleWheel = useCallback((e: WheelEvent) => {
    if (readingMode === 'scrolling' || showGrammarBreakdown) return
    
    e.preventDefault()
    const delta = e.deltaY * -0.005
    const newZoom = constrainZoom(zoom + delta)
    setZoom(newZoom)
    
    // Constrain pan when zoom changes
    if (newZoom > 1) {
      const constrainedPan = constrainPan(panX, panY, newZoom)
      setPanX(constrainedPan.x)
      setPanY(constrainedPan.y)
    } else {
      setPanX(0)
      setPanY(0)
    }
  }, [zoom, panX, panY, readingMode, constrainZoom, constrainPan, showGrammarBreakdown])

  // Scroll and zoom handlers for scrolling mode
  const handleScrollWheel = useCallback((e: WheelEvent) => {
    if (readingMode !== 'scrolling' || !scrollContainerRef.current || showGrammarBreakdown) return

    const rect = scrollContainerRef.current.getBoundingClientRect()
    const isOverPage = e.clientX >= rect.left && e.clientX <= rect.right &&
                      e.clientY >= rect.top && e.clientY <= rect.bottom

    if (isOverPage) {
      // Inside page area - zoom
      e.preventDefault()
      const delta = e.deltaY * -0.005
      const newZoom = constrainZoom(scrollZoom + delta)
      setScrollZoom(newZoom)
    }
    // Outside page area - let browser handle scroll naturally
  }, [readingMode, scrollZoom, constrainZoom, showGrammarBreakdown])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (readingMode === 'scrolling' || showGrammarBreakdown) return
    
    // Find the image element to check if click is on image
    const imgElement = e.currentTarget.querySelector('img') as HTMLImageElement
    if (!imgElement) return

    const imgRect = imgElement.getBoundingClientRect()
    
    // Only zoom if click is inside the image bounds
    const isInsideImage = e.clientX >= imgRect.left && e.clientX <= imgRect.right && 
                         e.clientY >= imgRect.top && e.clientY <= imgRect.bottom
    
    if (!isInsideImage) return
    
    e.preventDefault()
    if (zoom === 1) {
      setZoom(2)
      // Center zoom on click point relative to image
      const imgCenterX = imgRect.left + imgRect.width / 2
      const imgCenterY = imgRect.top + imgRect.height / 2
      const centerX = (e.clientX - imgCenterX) * -1
      const centerY = (e.clientY - imgCenterY) * -1
      setPanX(centerX)
      setPanY(centerY)
    } else {
      setZoom(1)
      setPanX(0)
      setPanY(0)
    }
  }, [zoom, readingMode, showGrammarBreakdown])

  // Mouse drag handlers for single page modes
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readingMode === 'scrolling' || zoom <= 1 || showGrammarBreakdown) return
    
    setIsDragging(true)
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY })
    e.preventDefault()
  }, [readingMode, zoom, panX, panY, showGrammarBreakdown])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1 && !showGrammarBreakdown) {
      const newPanX = e.clientX - dragStart.x
      const newPanY = e.clientY - dragStart.y
      const constrainedPan = constrainPan(newPanX, newPanY, zoom)
      setPanX(constrainedPan.x)
      setPanY(constrainedPan.y)
    }
  }, [isDragging, dragStart, zoom, constrainPan, showGrammarBreakdown])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (readingMode === 'scrolling' || showGrammarBreakdown) return
    
    const now = Date.now()
    const timeSinceLastTap = now - lastTap
    
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected - check if on image
      const imgElement = e.currentTarget.querySelector('img') as HTMLImageElement
      if (imgElement) {
        const imgRect = imgElement.getBoundingClientRect()
        const touch = e.touches[0]
        
        // Only zoom if tap is inside the image bounds
        const isInsideImage = touch.clientX >= imgRect.left && touch.clientX <= imgRect.right && 
                             touch.clientY >= imgRect.top && touch.clientY <= imgRect.bottom
        
        if (isInsideImage) {
          e.preventDefault()
          if (zoom === 1) {
            setZoom(2)
            const imgCenterX = imgRect.left + imgRect.width / 2
            const imgCenterY = imgRect.top + imgRect.height / 2
            const centerX = (touch.clientX - imgCenterX) * -1
            const centerY = (touch.clientY - imgCenterY) * -1
            setPanX(centerX)
            setPanY(centerY)
          } else {
            setZoom(1)
            setPanX(0)
            setPanY(0)
          }
        }
      }
    } else if (zoom > 1 && e.touches.length === 1) {
      setIsDragging(true)
      const touch = e.touches[0]
      setDragStart({ x: touch.clientX - panX, y: touch.clientY - panY })
    }
    
    setLastTap(now)
  }, [lastTap, zoom, panX, panY, readingMode, showGrammarBreakdown])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (readingMode === 'scrolling' || showGrammarBreakdown) return
    
    if (isDragging && zoom > 1 && e.touches.length === 1) {
      e.preventDefault()
      const touch = e.touches[0]
      const newPanX = touch.clientX - dragStart.x
      const newPanY = touch.clientY - dragStart.y
      const constrainedPan = constrainPan(newPanX, newPanY, zoom)
      setPanX(constrainedPan.x)
      setPanY(constrainedPan.y)
    }
  }, [isDragging, dragStart, zoom, readingMode, constrainPan, showGrammarBreakdown])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Event listeners
  useEffect(() => {
    const handleWheelGlobal = (e: WheelEvent) => {
      if (readingMode === 'scrolling') {
        handleScrollWheel(e)
      } else {
        handleWheel(e)
      }
    }
    window.addEventListener('wheel', handleWheelGlobal, { passive: false })
    return () => window.removeEventListener('wheel', handleWheelGlobal)
  }, [handleWheel, handleScrollWheel, readingMode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (readingMode === 'rtl') {
          nextPage()
        } else {
          prevPage()
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        if (readingMode === 'rtl') {
          prevPage()
        } else {
          nextPage()
        }
      } else if (e.key === 'Escape') {
        navigate('/')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextPage, prevPage, navigate, readingMode])

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Lazy loading for scrolling mode
  useEffect(() => {
    if (readingMode !== 'scrolling' || !manga) return

    const handleScroll = () => {
      if (!scrollContainerRef.current) return

      const container = scrollContainerRef.current
      const containerTop = container.scrollTop
      const containerHeight = container.clientHeight
      const visibleTop = containerTop
      const visibleBottom = containerTop + containerHeight

      // Load pages that are within viewport or close to it
      const loadBuffer = containerHeight // Load one screen ahead/behind
      const loadTop = visibleTop - loadBuffer
      const loadBottom = visibleBottom + loadBuffer

      manga.pages.forEach((page, index) => {
        if (loadedPages.has(index)) return

        // Estimate page position (this is approximate - in real implementation,
        // you'd track actual element positions)
        const estimatedPageTop = index * containerHeight * 0.8 // Rough estimate
        const estimatedPageBottom = estimatedPageTop + containerHeight * 0.8

        if (estimatedPageBottom >= loadTop && estimatedPageTop <= loadBottom) {
          setLoadedPages(prev => new Set([...prev, index]))
          checkScrollOcrStatus(index)
        }
      })
    }

    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      handleScroll() // Initial load
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }, [readingMode, manga, loadedPages, checkScrollOcrStatus])

  // Initialize first few pages for scrolling mode
  useEffect(() => {
    if (readingMode === 'scrolling' && manga && loadedPages.size === 0) {
      // Load first 3 pages initially
      const initialPages = new Set([0, 1, 2].filter(i => i < manga.pages.length))
      setLoadedPages(initialPages)
      initialPages.forEach(pageNum => checkScrollOcrStatus(pageNum))
    }
  }, [readingMode, manga, loadedPages.size, checkScrollOcrStatus])

  // Reset states when switching reading modes
  useEffect(() => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
    setScrollZoom(1)
    setTextBlocks([])
    setShowTextBlocks(false)
    setImageSize(null)
    setHoveredBlock(null)
    setLoadedPages(new Set())
    setScrollTextBlocks({})
    setScrollImageSizes({})
    setShowSettings(false)
  }, [readingMode])

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
          <Button onClick={() => navigate('/')}>
            Return to Library
          </Button>
        </div>
      </div>
    )
  }

  const currentPageData = manga.pages[currentPage]

  // Render reading mode content
  const renderContent = () => {
    if (readingMode === 'scrolling') {
      return (
        <div 
          ref={scrollContainerRef}
          className="h-full overflow-y-auto overflow-x-hidden"
          style={{
            zoom: scrollZoom,
          }}
        >
          <div className="flex flex-col items-center space-y-4 py-4">
            {manga.pages.map((page, index) => {
              if (!loadedPages.has(index)) {
                // Placeholder for unloaded pages
                return (
                  <div 
                    key={page.id}
                    className="w-full h-screen bg-gray-800 flex items-center justify-center"
                  >
                    <div className="text-white">Loading page {index + 1}...</div>
                  </div>
                )
              }

              const pageTextBlocks = scrollTextBlocks[index] || []
              const pageImageSize = scrollImageSizes[index]

              return (
                <div key={page.id} className="relative">
                  <img
                    src={page.imagePath}
                    alt={`Page ${index + 1}`}
                    className="max-w-full max-h-screen object-contain cursor-default"
                    draggable={false}
                    onClick={(e) => handleScrollPageClick(e, index)}
                    onLoad={(e) => {
                      const img = e.currentTarget
                      const rect = img.getBoundingClientRect()
                      img.dataset.displayWidth = rect.width.toString()
                      img.dataset.displayHeight = rect.height.toString()
                    }}
                  />
                  
                  {/* OCR Text Blocks for this page */}
                  {pageTextBlocks.length > 0 && pageImageSize && (
                    <>
                      {pageTextBlocks.map((block, blockIndex) => {
                        const imgElement = document.querySelector(`img[alt="Page ${index + 1}"]`) as HTMLImageElement
                        if (!imgElement) return null

                        const imgStyle = window.getComputedStyle(imgElement)
                        const displayWidth = parseFloat(imgStyle.width)
                        const displayHeight = parseFloat(imgStyle.height)
                        
                        const scaleX = displayWidth / pageImageSize.width
                        const scaleY = displayHeight / pageImageSize.height
                        
                        const scaledLeft = block.bbox[0] * scaleX
                        const scaledTop = block.bbox[1] * scaleY
                        const scaledWidth = (block.bbox[2] - block.bbox[0]) * scaleX
                        const scaledHeight = (block.bbox[3] - block.bbox[1]) * scaleY

                        const handleScrollTextBlockClick = (e: React.MouseEvent) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (block.text?.trim()) {
                            handleBlockClick(block, blockIndex)
                          }
                        }

                        return (
                          <div
                            key={blockIndex}
                            className="absolute border-2 border-green-500 bg-green-500/10 cursor-pointer transition-all duration-200 hover:bg-green-500/30 hover:border-green-400"
                            style={{
                              left: `${scaledLeft}px`,
                              top: `${scaledTop}px`,
                              width: `${scaledWidth}px`,
                              height: `${scaledHeight}px`,
                            }}
                            onMouseEnter={() => setHoveredBlock(blockIndex)}
                            onMouseLeave={() => setHoveredBlock(null)}
                            onClick={handleScrollTextBlockClick}
                          >
                            <div className="absolute top-0 left-0 bg-green-500 text-white text-xs px-1 rounded-br">
                              {blockIndex + 1}
                            </div>
                            {hoveredBlock === blockIndex && block.text && (
                              <div 
                                className={`absolute bg-black/90 text-white text-sm p-3 rounded-lg shadow-lg z-50 pointer-events-none transition-opacity duration-200 ${
                                  scaledTop > 80 ? 'bottom-full mb-2' : 'top-full mt-2'
                                }`}
                                style={{
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: 'max-content',
                                  maxWidth: '400px',
                                  minWidth: '200px'
                                }}
                              >
                                <div className="whitespace-pre-wrap break-words">
                                  {block.text}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    // Single page modes (RTL/LTR)
    return (
      <div className="flex items-center justify-center h-full overflow-hidden">
        <div 
          className="relative w-full h-full flex items-center justify-center"
          style={{
            transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
          onClick={handlePageClick}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            ref={(img) => {
              if (img && showTextBlocks && imageSize) {
                const rect = img.getBoundingClientRect()
                img.dataset.displayWidth = rect.width.toString()
                img.dataset.displayHeight = rect.height.toString()
                img.dataset.offsetLeft = (rect.left - img.parentElement!.getBoundingClientRect().left).toString()
                img.dataset.offsetTop = (rect.top - img.parentElement!.getBoundingClientRect().top).toString()
              }
            }}
            src={currentPageData.imagePath}
            alt={`Page ${currentPage + 1}`}
            className="max-w-full max-h-full object-contain"
            draggable={false}
            style={{ 
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
            }}
          />
          
          {/* Text Blocks Overlay */}
          {showTextBlocks && textBlocks.length > 0 && imageSize && (
            <>
              {textBlocks.map((block, index) => {
                const imgElement = document.querySelector('img[alt*="Page"]') as HTMLImageElement
                if (!imgElement) return null

                const _ = windowSize.width + windowSize.height

                const imgStyle = window.getComputedStyle(imgElement)
                const displayWidth = parseFloat(imgStyle.width)
                const displayHeight = parseFloat(imgStyle.height)
                
                const scaleX = displayWidth / imageSize.width
                const scaleY = displayHeight / imageSize.height
                
                const scaledLeft = block.bbox[0] * scaleX
                const scaledTop = block.bbox[1] * scaleY
                const scaledWidth = (block.bbox[2] - block.bbox[0]) * scaleX
                const scaledHeight = (block.bbox[3] - block.bbox[1]) * scaleY

                const handleTextBlockClick = (e: React.MouseEvent) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (block.text?.trim()) {
                    handleBlockClick(block, index)
                  }
                }

                return (
                  <div
                    key={index}
                    className="absolute border-2 border-green-500 bg-green-500/10 cursor-pointer transition-all duration-200 hover:bg-green-500/30 hover:border-green-400"
                    style={{
                      left: `calc(50% - ${displayWidth/2}px + ${scaledLeft}px)`,
                      top: `calc(50% - ${displayHeight/2}px + ${scaledTop}px)`,
                      width: `${scaledWidth}px`,
                      height: `${scaledHeight}px`,
                    }}
                    onMouseEnter={() => setHoveredBlock(index)}
                    onMouseLeave={() => setHoveredBlock(null)}
                    onClick={handleTextBlockClick}
                  >
                    <div className="absolute top-0 left-0 bg-green-500 text-white text-xs px-1 rounded-br">
                      {index + 1}
                    </div>
                    {hoveredBlock === index && block.text && (
                      <div 
                        className={`absolute bg-black/90 text-white text-sm p-3 rounded-lg shadow-lg z-50 pointer-events-none transition-opacity duration-200 ${
                          scaledTop > 80 ? 'bottom-full mb-2' : 'top-full mt-2'
                        }`}
                        style={{
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 'max-content',
                          maxWidth: '400px',
                          minWidth: '200px'
                        }}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {block.text}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div 
      className="h-screen bg-black relative overflow-hidden select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Header */}
      <div className={`
        absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm p-4
        transition-opacity duration-300
        ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-white hover:bg-white/20"
            >
              <Home className="h-4 w-4 mr-2" />
              Library
            </Button>
            <div>
              <h1 className="font-medium">{manga.title}</h1>
              <p className="text-sm text-white/70">
                {manga.type} {manga.number} • Page {currentPage + 1} of {manga.pages.length} • {readingMode.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {((readingMode !== 'scrolling' && zoom !== 1) || (readingMode === 'scrolling' && scrollZoom !== 1)) && (
              <div className="text-sm text-white/70 mr-2">
                {Math.round((readingMode === 'scrolling' ? scrollZoom : zoom) * 100)}%
              </div>
            )}
            {readingMode !== 'scrolling' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newZoom = constrainZoom(zoom + 0.5)
                    setZoom(newZoom)
                    if (newZoom > 1) {
                      const constrainedPan = constrainPan(panX, panY, newZoom)
                      setPanX(constrainedPan.x)
                      setPanY(constrainedPan.y)
                    }
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newZoom = constrainZoom(zoom - 0.5)
                    setZoom(newZoom)
                    if (newZoom <= 1) {
                      setPanX(0)
                      setPanY(0)
                    } else {
                      const constrainedPan = constrainPan(panX, panY, newZoom)
                      setPanX(constrainedPan.x)
                      setPanY(constrainedPan.y)
                    }
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setZoom(1); setPanX(0); setPanY(0) }}
                  className="text-white hover:bg-white/20"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
            {readingMode === 'scrolling' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScrollZoom(prev => constrainZoom(prev + 0.5))}
                  className="text-white hover:bg-white/20"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScrollZoom(prev => constrainZoom(prev - 0.5))}
                  className="text-white hover:bg-white/20"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScrollZoom(1)}
                  className="text-white hover:bg-white/20"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
            {currentPageData && pageOcrStatus[currentPageData.id] === 'PROCESSING' && (
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

      {/* Navigation Footer - only for single page modes */}
      {readingMode !== 'scrolling' && (
        <div className={`
          absolute bottom-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm p-4
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
                  setCurrentPage(newPage)
                  if (readingMode !== 'scrolling') {
                    setShowTextBlocks(false)
                    setTextBlocks([])
                    setImageSize(null)
                    setHoveredBlock(null)
                    setZoom(1)
                    setPanX(0)
                    setPanY(0)
                  }
                }}
                className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-default slider"
                style={{
                  background: `linear-gradient(to right, #ffffff 0%, #ffffff ${((currentPage + 1) / manga.pages.length) * 100}%, rgba(255,255,255,0.2) ${((currentPage + 1) / manga.pages.length) * 100}%, rgba(255,255,255,0.2) 100%)`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Grammar Breakdown Modal */}
      <GrammarBreakdown
        isOpen={showGrammarBreakdown}
        onClose={closeGrammarBreakdown}
        sentence={selectedSentence}
        tokens={grammarTokens}
        loading={grammarAnalysisLoading}
      />
    </div>
  )
}