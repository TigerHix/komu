import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { VariableSizeList } from 'react-window'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { SvgTextOverlay } from './SvgTextOverlay'
import { TextBlock, Page, Dimensions } from '@/constants/reader'

interface ScrollingGalleryProps {
  pages: Page[]
  currentPageIndex: number
  onPageChange: (newPageIndex: number) => void
  scrollTextBlocks: Record<number, TextBlock[]>
  scrollImageSizes: Record<number, Dimensions>
  onBlockClick: (block: TextBlock, index: number, pageIndex?: number) => void
  onBackgroundClick?: () => void
  readingMode?: 'rtl' | 'ltr' | 'scrolling'
  isGrammarOpen?: boolean
  selectedBlockIndex?: number | null
  selectedPageIndex?: number | null
  isTwoPageMode?: boolean
  pagePairingMode?: 'manga' | 'book'
}

interface ScrollingSlideProps {
  index: number
  style: React.CSSProperties
  data: {
    pages: Page[]
    scrollTextBlocks: Record<number, TextBlock[]>
    scrollImageSizes: Record<number, Dimensions>
    onBlockClick: (block: TextBlock, index: number, pageIndex?: number) => void
    onBackgroundClick?: () => void
    isGrammarOpen?: boolean
    selectedBlockIndex?: number | null
    selectedPageIndex?: number | null
    currentPageIndex: number
    isTwoPageMode?: boolean
    pagePairingMode?: 'manga' | 'book'
    readingMode?: 'rtl' | 'ltr' | 'scrolling'
    spreads: number[][]
  }
}

// Helper functions
const calculateSpreads = (pages: Page[], pagePairingMode: 'manga' | 'book'): number[][] => {
  const result: number[][] = []
  
  if (pagePairingMode === 'manga') {
    // Manga mode: page 0 alone, then 1+2, 3+4, 5+6, etc.
    result.push([0])
    for (let i = 1; i < pages.length; i += 2) {
      if (i + 1 < pages.length) {
        result.push([i, i + 1])
      } else {
        result.push([i])
      }
    }
  } else {
    // Book mode: 0+1, 2+3, 4+5, etc.
    for (let i = 0; i < pages.length; i += 2) {
      if (i + 1 < pages.length) {
        result.push([i, i + 1])
      } else {
        result.push([i])
      }
    }
  }
  
  return result
}

const findSpreadIndex = (spreads: number[][], pageIndex: number): number => {
  for (let i = 0; i < spreads.length; i++) {
    if (spreads[i].includes(pageIndex)) {
      return i
    }
  }
  return 0
}

// Sub-components
interface PageImageProps {
  page: Page
  pageIndex: number
  className: string
  style?: React.CSSProperties
}

const PageImage = ({ page, pageIndex, className, style }: PageImageProps) => (
  <img
    src={page.imagePath}
    alt={`Page ${pageIndex + 1}`}
    className={className}
    draggable={false}
    loading="lazy"
    decoding="async"
    style={{
      userSelect: 'none',
      pointerEvents: 'none',
      height: '100%',
      width: 'auto',
      ...style
    }}
  />
)

interface PageWithOverlayProps {
  page: Page
  pageIndex: number
  textBlocks: TextBlock[]
  imageSize: Dimensions | null
  onBlockClick: (block: TextBlock, index: number, pageIndex?: number) => void
  isGrammarOpen: boolean
  selectedBlockIndex: number | null
  showOverlay: boolean
  containerClassName: string
  imageStyle?: React.CSSProperties
}

const PageWithOverlay = ({
  page,
  pageIndex,
  textBlocks,
  imageSize,
  onBlockClick,
  isGrammarOpen,
  selectedBlockIndex,
  showOverlay,
  containerClassName,
  imageStyle
}: PageWithOverlayProps) => (
  <div className={containerClassName}>
    <PageImage
      page={page}
      pageIndex={pageIndex}
      className="max-h-full object-contain"
      style={imageStyle}
    />
    
    {showOverlay && imageSize && textBlocks.length > 0 && (
      <SvgTextOverlay
        textBlocks={textBlocks}
        imageSize={imageSize}
        onBlockClick={onBlockClick}
        isGrammarOpen={isGrammarOpen}
        selectedBlockIndex={selectedBlockIndex}
        pageIndex={pageIndex}
        touchStartTime={0}
        lastTouchMoveTime={0}
        isZoomed={false}
      />
    )}
  </div>
)

/**
 * Individual slide component for virtualized scrolling
 * Renders either a single manga page or a two-page spread with text overlays
 */
function ScrollingSlide({ index, style, data }: ScrollingSlideProps) {
  const { 
    pages, 
    scrollTextBlocks, 
    scrollImageSizes, 
    onBlockClick, 
    onBackgroundClick,
    isGrammarOpen = false,
    selectedBlockIndex = null,
    selectedPageIndex = null,
    currentPageIndex,
    isTwoPageMode = false,
    readingMode = 'scrolling',
    spreads
  } = data

  if (isTwoPageMode) {
    const spreadPages = spreads[index]
    const isCurrentSpread = spreadPages.includes(currentPageIndex)

    return (
      <div style={style} className="flex items-center justify-center bg-black">
        <div 
          className="relative w-full h-full flex items-center justify-center"
          onClick={onBackgroundClick}
        >
          {spreadPages.length === 1 ? (
            // Single page (first page in manga mode or last odd page)
            <PageWithOverlay
              page={pages[spreadPages[0]]}
              pageIndex={spreadPages[0]}
              textBlocks={scrollTextBlocks[spreadPages[0]] || []}
              imageSize={scrollImageSizes[spreadPages[0]] || null}
              onBlockClick={onBlockClick}
              isGrammarOpen={isGrammarOpen}
              selectedBlockIndex={selectedPageIndex === spreadPages[0] ? selectedBlockIndex : null}
              showOverlay={isCurrentSpread}
              containerClassName="relative h-full flex items-center justify-center max-w-full"
            />
          ) : (
            // Two pages side by side - positioned together like a book spread
            <div className="flex h-full items-center justify-center">
              {/* Left page */}
              <PageWithOverlay
                page={pages[readingMode === 'rtl' ? spreadPages[0] : spreadPages[1]]}
                pageIndex={readingMode === 'rtl' ? spreadPages[0] : spreadPages[1]}
                textBlocks={scrollTextBlocks[readingMode === 'rtl' ? spreadPages[0] : spreadPages[1]] || []}
                imageSize={scrollImageSizes[readingMode === 'rtl' ? spreadPages[0] : spreadPages[1]] || null}
                onBlockClick={onBlockClick}
                isGrammarOpen={isGrammarOpen}
                selectedBlockIndex={selectedPageIndex === (readingMode === 'rtl' ? spreadPages[0] : spreadPages[1]) ? selectedBlockIndex : null}
                showOverlay={isCurrentSpread}
                containerClassName="relative h-full flex items-center justify-end"
                imageStyle={{ maxWidth: '50vw' }}
              />
              
              {/* Right page */}
              <PageWithOverlay
                page={pages[readingMode === 'rtl' ? spreadPages[1] : spreadPages[0]]}
                pageIndex={readingMode === 'rtl' ? spreadPages[1] : spreadPages[0]}
                textBlocks={scrollTextBlocks[readingMode === 'rtl' ? spreadPages[1] : spreadPages[0]] || []}
                imageSize={scrollImageSizes[readingMode === 'rtl' ? spreadPages[1] : spreadPages[0]] || null}
                onBlockClick={onBlockClick}
                isGrammarOpen={isGrammarOpen}
                selectedBlockIndex={selectedPageIndex === (readingMode === 'rtl' ? spreadPages[1] : spreadPages[0]) ? selectedBlockIndex : null}
                showOverlay={isCurrentSpread}
                containerClassName="relative h-full flex items-center justify-start"
                imageStyle={{ maxWidth: '50vw' }}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Single page mode
  const pageTextBlocks = scrollTextBlocks[index] || []
  const pageImageSize = scrollImageSizes[index] || null

  return (
    <div style={style} className="flex items-center justify-center bg-black">
      <div 
        className="relative w-full h-full flex items-center justify-center"
        onClick={onBackgroundClick}
      >
        <PageWithOverlay
          page={pages[index]}
          pageIndex={index}
          textBlocks={pageTextBlocks}
          imageSize={pageImageSize}
          onBlockClick={onBlockClick}
          isGrammarOpen={isGrammarOpen}
          selectedBlockIndex={selectedPageIndex === index ? selectedBlockIndex : null}
          showOverlay={true}
          containerClassName="relative w-full h-full flex items-center justify-center"
        />
      </div>
    </div>
  )
}

/**
 * Custom scrolling gallery for manga reading
 * Features:
 * - Virtualized scrolling with react-window
 * - Zoom/pan functionality with react-zoom-pan-pinch
 * - Dynamic page height calculation
 * - Smooth page tracking and navigation
 * - Two-page spread support
 */
export function ScrollingGallery({
  pages,
  currentPageIndex,
  onPageChange,
  scrollTextBlocks,
  scrollImageSizes,
  onBlockClick,
  onBackgroundClick,
  isGrammarOpen = false,
  selectedBlockIndex = null,
  selectedPageIndex = null,
  isTwoPageMode = false,
  pagePairingMode = 'manga',
  readingMode = 'scrolling'
}: ScrollingGalleryProps) {
  const listRef = useRef<VariableSizeList>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentScale, setCurrentScale] = useState(1)
  const isScrollingInternally = useRef(false)
  
  // Drag-to-scroll state
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartScrollTop = useRef(0)
  const currentScrollOffset = useRef(0)
  
  // Velocity tracking for inertia
  const velocityTracker = useRef<Array<{ time: number; position: number }>>([])
  const inertiaAnimation = useRef<number | null>(null)
  const isInertiaScrolling = useRef(false)

  // Memoized calculations
  const spreads = useMemo(() => 
    isTwoPageMode ? calculateSpreads(pages, pagePairingMode) : [],
    [pages, isTwoPageMode, pagePairingMode]
  )

  const currentSpreadIndex = useMemo(() => 
    isTwoPageMode ? findSpreadIndex(spreads, currentPageIndex) : currentPageIndex,
    [currentPageIndex, isTwoPageMode, spreads]
  )

  const itemCount = isTwoPageMode ? spreads.length : pages.length

  /**
   * Stop any ongoing inertia animation
   */
  const stopInertia = useCallback(() => {
    if (inertiaAnimation.current) {
      cancelAnimationFrame(inertiaAnimation.current)
      inertiaAnimation.current = null
      isInertiaScrolling.current = false
    }
  }, [])

  /**
   * Calculate optimal height for each item (page or spread) based on aspect ratio
   */
  const getItemHeight = useCallback((index: number) => {
    if (!containerRef.current) return window.innerHeight
    
    const containerWidth = containerRef.current.offsetWidth
    const windowHeight = window.innerHeight
    const defaultAspectRatio = 1.4

    if (isTwoPageMode) {
      const spreadPages = spreads[index]
      
      if (spreadPages.length === 1) {
        // Single page
        const pageImageSize = scrollImageSizes[spreadPages[0]]
        if (pageImageSize) {
          const aspectRatio = pageImageSize.height / pageImageSize.width
          const heightForFullWidth = containerWidth * aspectRatio
          return Math.min(heightForFullWidth, windowHeight)
        }
      } else {
        // Two pages side by side - use the taller page's aspect ratio
        let maxAspectRatio = defaultAspectRatio
        for (const pageIndex of spreadPages) {
          const pageImageSize = scrollImageSizes[pageIndex]
          if (pageImageSize) {
            const aspectRatio = pageImageSize.height / pageImageSize.width
            maxAspectRatio = Math.max(maxAspectRatio, aspectRatio)
          }
        }
        // For two pages side by side, each takes half the width
        const heightForFullWidth = (containerWidth / 2) * maxAspectRatio
        return Math.min(heightForFullWidth, windowHeight)
      }
    } else {
      // Single page mode
      const pageImageSize = scrollImageSizes[index]
      if (pageImageSize) {
        const aspectRatio = pageImageSize.height / pageImageSize.width
        const heightForFullWidth = containerWidth * aspectRatio
        return Math.min(heightForFullWidth, windowHeight)
      }
    }
    
    // Default fallback
    const heightForFullWidth = containerWidth * defaultAspectRatio
    return Math.min(heightForFullWidth, windowHeight)
  }, [scrollImageSizes, isTwoPageMode, spreads])

  /**
   * Track scroll position and update current page
   */
  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    if (!listRef.current) return
    
    currentScrollOffset.current = scrollOffset
    
    if (!isDragging.current && !isInertiaScrolling.current && inertiaAnimation.current) {
      stopInertia()
    }
    
    isScrollingInternally.current = true
    
    // Find the most visible item
    let accumulated = 0
    const targetCount = isTwoPageMode ? spreads.length : pages.length
    
    for (let i = 0; i < targetCount; i++) {
      const itemHeight = getItemHeight(i)
      if (scrollOffset < accumulated + itemHeight * 0.5) {
        let newPageIndex: number
        
        if (isTwoPageMode) {
          // Navigate to first page of spread
          newPageIndex = spreads[i][0]
        } else {
          newPageIndex = i
        }
        
        if (newPageIndex !== currentPageIndex) {
          requestAnimationFrame(() => {
            onPageChange(newPageIndex)
          })
        }
        break
      }
      accumulated += itemHeight
    }
    
    setTimeout(() => {
      isScrollingInternally.current = false
    }, 150)
  }, [currentPageIndex, onPageChange, getItemHeight, stopInertia, isTwoPageMode, spreads, pages.length])

  // Mouse interaction handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || currentScale > 1) return
    
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartScrollTop.current = currentScrollOffset.current
    velocityTracker.current = [{ time: Date.now(), position: e.clientY }]
    
    stopInertia()
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    e.preventDefault()
  }, [stopInertia, currentScale])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !listRef.current) return
    
    const scrollDeltaY = dragStartY.current - e.clientY
    const newScrollTop = dragStartScrollTop.current + scrollDeltaY
    
    listRef.current.scrollTo(Math.max(0, newScrollTop))
    
    const now = Date.now()
    velocityTracker.current.push({ time: now, position: e.clientY })
    velocityTracker.current = velocityTracker.current.filter(point => now - point.time < 100)
    
    e.preventDefault()
  }, [])

  const calculateVelocity = useCallback(() => {
    if (velocityTracker.current.length < 2) return 0
    
    const recent = velocityTracker.current.slice(-3)
    const first = recent[0]
    const last = recent[recent.length - 1]
    
    const deltaTime = last.time - first.time
    const deltaPosition = last.position - first.position
    
    if (deltaTime === 0) return 0
    
    return (deltaPosition / deltaTime) * -12
  }, [])

  const animateInertia = useCallback((initialVelocity: number) => {
    if (!listRef.current) return
    
    let velocity = initialVelocity
    const friction = 0.96
    const minVelocity = 0.1
    
    isInertiaScrolling.current = true
    
    const animate = () => {
      if (!listRef.current || Math.abs(velocity) < minVelocity) {
        inertiaAnimation.current = null
        isInertiaScrolling.current = false
        return
      }
      
      const currentScroll = currentScrollOffset.current
      const newScroll = Math.max(0, currentScroll + velocity)
      
      listRef.current.scrollTo(newScroll)
      velocity *= friction
      
      inertiaAnimation.current = requestAnimationFrame(animate)
    }
    
    inertiaAnimation.current = requestAnimationFrame(animate)
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return
    
    isDragging.current = false
    
    const velocity = calculateVelocity()
    if (Math.abs(velocity) > 0.01) {
      animateInertia(velocity)
    }
    
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove, calculateVelocity, animateInertia])

  // Effects
  useEffect(() => {
    if (listRef.current && currentPageIndex >= 0 && !isScrollingInternally.current) {
      const targetIndex = isTwoPageMode ? currentSpreadIndex : currentPageIndex
      listRef.current.scrollToItem(targetIndex, 'center')
    }
  }, [currentPageIndex, currentSpreadIndex, isTwoPageMode])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0, true)
    }
  }, [scrollImageSizes, isTwoPageMode, pagePairingMode])

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      stopInertia()
    }
  }, [handleMouseMove, handleMouseUp, stopInertia])

  // Data passed to each slide component
  const itemData = useMemo(() => ({
    pages,
    scrollTextBlocks,
    scrollImageSizes,
    onBlockClick,
    onBackgroundClick,
    isGrammarOpen,
    selectedBlockIndex,
    selectedPageIndex,
    currentPageIndex,
    isTwoPageMode,
    pagePairingMode,
    readingMode,
    spreads
  }), [
    pages,
    scrollTextBlocks,
    scrollImageSizes,
    onBlockClick,
    onBackgroundClick,
    isGrammarOpen,
    selectedBlockIndex,
    selectedPageIndex,
    currentPageIndex,
    isTwoPageMode,
    pagePairingMode,
    readingMode,
    spreads
  ])

  return (
    <div ref={containerRef} className="w-full h-full bg-black">
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={3}
        doubleClick={{
          disabled: false,
          mode: 'toggle',
          step: 0.5,
        }}
        wheel={{
          wheelDisabled: currentScale <= 1,
          touchPadDisabled: currentScale <= 1,
          step: 0.1,
        }}
        onTransformed={(ref, state) => {
          setCurrentScale(state.scale)
        }}
        pinch={{
          disabled: false,
          step: 5,
        }}
        panning={{
          disabled: currentScale <= 1,
          velocityDisabled: true,
        }}
        limitToBounds={true}
        centerOnInit={true}
      >
        <TransformComponent
          wrapperClass="w-full h-full"
          contentClass="w-full h-full"
        >
          <div 
            onMouseDown={handleMouseDown}
            style={{ cursor: currentScale <= 1 ? 'grab' : 'default' }}
            className="w-full h-full"
          >
            <VariableSizeList
              ref={listRef}
              height={containerRef.current?.offsetHeight || window.innerHeight}
              width={containerRef.current?.offsetWidth || window.innerWidth}
              itemCount={itemCount}
              itemSize={getItemHeight}
              itemData={itemData}
              onScroll={handleScroll}
              overscanCount={1}
              useIsScrolling={true}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                willChange: 'scroll-position',
                transform: 'translateZ(0)',
              }}
              className="[&::-webkit-scrollbar]:hidden"
            >
              {ScrollingSlide}
            </VariableSizeList>
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}