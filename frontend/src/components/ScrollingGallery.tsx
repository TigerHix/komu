import { useEffect, useRef, useCallback, useState } from 'react'
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
  }
}

/**
 * Individual slide component for virtualized scrolling
 * Renders a single manga page with text overlays and proper sizing
 */
function ScrollingSlide({ index, style, data }: ScrollingSlideProps) {
  const { 
    pages, 
    scrollTextBlocks, 
    scrollImageSizes, 
    onBlockClick, 
    onBackgroundClick,
    isGrammarOpen = false,
    selectedBlockIndex = null
  } = data
  const page = pages[index]
  
  // Get OCR data for this specific page
  const pageTextBlocks = scrollTextBlocks[index] || []
  const pageImageSize = scrollImageSizes[index] || null

  return (
    <div style={style} className="flex items-center justify-center bg-black">
      <div 
        className="relative w-full h-full flex items-center justify-center"
        onClick={onBackgroundClick}
      >
        <img
          src={page.imagePath}
          alt={`Page ${index + 1}`}
          className="max-w-full max-h-full object-contain"
          draggable={false}
          loading="lazy"
          decoding="async"
          style={{
            userSelect: 'none',
            pointerEvents: 'none',
            height: '100%',
            width: 'auto'
          }}
        />
        
        {pageImageSize && pageTextBlocks.length > 0 && (
          <SvgTextOverlay
            textBlocks={pageTextBlocks}
            imageSize={pageImageSize}
            onBlockClick={onBlockClick}
            isGrammarOpen={isGrammarOpen}
            selectedBlockIndex={selectedBlockIndex}
            pageIndex={index}
          />
        )}
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
  selectedBlockIndex = null
}: ScrollingGalleryProps) {
  const listRef = useRef<VariableSizeList>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentScale, setCurrentScale] = useState(1)
  const isScrollingInternally = useRef(false)

  /**
   * Calculate optimal height for each page based on aspect ratio
   * Priority: Fill window height, but constrain to window width if needed
   */
  const getItemHeight = useCallback((index: number) => {
    if (!containerRef.current) return window.innerHeight
    
    const containerWidth = containerRef.current.offsetWidth
    const windowHeight = window.innerHeight
    
    // Use actual image dimensions if available for this page
    const pageImageSize = scrollImageSizes[index]
    if (pageImageSize) {
      const aspectRatio = pageImageSize.height / pageImageSize.width
      const heightForFullWidth = containerWidth * aspectRatio
      
      return Math.min(heightForFullWidth, windowHeight)
    }
    
    // Default manga aspect ratio for other pages
    const defaultAspectRatio = 1.4
    const heightForFullWidth = containerWidth * defaultAspectRatio
    return Math.min(heightForFullWidth, windowHeight)
  }, [pages, scrollImageSizes])

  /**
   * Track scroll position and update current page
   * Prevents infinite loops with external navigation
   * Throttled for Safari performance
   */
  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    if (!listRef.current) return
    
    isScrollingInternally.current = true
    
    // Find the page that's most visible at current scroll position
    let accumulated = 0
    for (let i = 0; i < pages.length; i++) {
      const itemHeight = getItemHeight(i)
      if (scrollOffset < accumulated + itemHeight * 0.5) {
        if (i !== currentPageIndex) {
          // Use requestAnimationFrame to prevent Safari crashes from rapid updates
          requestAnimationFrame(() => {
            onPageChange(i)
          })
        }
        break
      }
      accumulated += itemHeight
    }
    
    // Reset flag to allow external navigation
    setTimeout(() => {
      isScrollingInternally.current = false
    }, 150) // Slightly longer timeout for Safari
  }, [pages.length, currentPageIndex, onPageChange, getItemHeight])

  /**
   * Handle external page changes (from URL, navigation buttons, etc.)
   * Only scroll if not currently user-scrolling to prevent conflicts
   */
  useEffect(() => {
    if (listRef.current && currentPageIndex >= 0 && !isScrollingInternally.current) {
      listRef.current.scrollToItem(currentPageIndex, 'center')
    }
  }, [currentPageIndex])

  // Recalculate list when image sizes change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0, true)
    }
  }, [scrollImageSizes])

  // Data passed to each slide component
  const itemData = {
    pages,
    scrollTextBlocks,
    scrollImageSizes,
    onBlockClick,
    onBackgroundClick,
    isGrammarOpen,
    selectedBlockIndex
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-black">
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={3}
        doubleClick={{
          disabled: false,
          mode: 'toggle',
          step: 0.5, // 1.5x zoom to match Swiper behavior
        }}
        wheel={{
          wheelDisabled: currentScale <= 1, // Allow scroll when not zoomed
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
          disabled: currentScale <= 1, // Allow native scrolling when not zoomed
          velocityDisabled: true, // Prevent conflicts with virtualized scrolling
        }}
        limitToBounds={true}
        centerOnInit={true}
      >
        <TransformComponent
          wrapperClass="w-full h-full"
          contentClass="w-full h-full"
        >
          <VariableSizeList
            ref={listRef}
            height={containerRef.current?.offsetHeight || window.innerHeight}
            width={containerRef.current?.offsetWidth || window.innerWidth}
            itemCount={pages.length}
            itemSize={getItemHeight}
            itemData={itemData}
            onScroll={handleScroll}
            overscanCount={1} // Reduce overscan for Safari memory management
            useIsScrolling={true} // Enable scroll state tracking
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              // Safari-specific optimizations
              willChange: 'scroll-position',
              transform: 'translateZ(0)', // Force hardware acceleration
            }}
            className="[&::-webkit-scrollbar]:hidden"
          >
            {ScrollingSlide}
          </VariableSizeList>
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}