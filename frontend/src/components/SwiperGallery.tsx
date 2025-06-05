import { useEffect, useRef, useCallback } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Keyboard, Zoom, Virtual, Navigation, FreeMode, Mousewheel } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import { SvgTextOverlay } from './SvgTextOverlay'
import { TextBlock, Page, Dimensions } from '@/constants/reader'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/zoom'
import 'swiper/css/virtual'
import 'swiper/css/navigation'

interface SwiperGalleryProps {
  pages: Page[]
  currentPageIndex: number
  onPageChange: (newPageIndex: number) => void
  textBlocks: TextBlock[]
  imageSize: Dimensions | null
  onBlockClick: (block: TextBlock, index: number, pageIndex?: number) => void
  onBackgroundClick?: () => void
  readingMode?: 'rtl' | 'ltr' | 'scrolling'
  isGrammarOpen?: boolean
  selectedBlockIndex?: number | null
  disableKeyboard?: boolean
}

export function SwiperGallery({
  pages,
  currentPageIndex,
  onPageChange,
  textBlocks,
  imageSize,
  onBlockClick,
  onBackgroundClick,
  readingMode = 'rtl',
  isGrammarOpen = false,
  selectedBlockIndex = null,
  disableKeyboard = false
}: SwiperGalleryProps) {
  const swiperRef = useRef<SwiperType>()
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isZoomedRef = useRef(false)
  const touchStartTimeRef = useRef<number>(0)
  const lastTouchMoveTimeRef = useRef<number>(0)

  useEffect(() => {
    if (swiperRef.current && swiperRef.current.activeIndex !== currentPageIndex) {
      swiperRef.current.slideTo(currentPageIndex)
    }
  }, [currentPageIndex])

  // Handle dynamic keyboard enable/disable
  useEffect(() => {
    if (swiperRef.current && swiperRef.current.keyboard) {
      if (disableKeyboard) {
        swiperRef.current.keyboard.disable()
      } else {
        swiperRef.current.keyboard.enable()
      }
    }
  }, [disableKeyboard])

  // Track zoom state
  const handleZoomChange = useCallback((swiper: SwiperType, scale: number) => {
    isZoomedRef.current = scale > 1
    console.log('Zoom changed:', { scale, isZoomed: isZoomedRef.current })
  }, [])

  // Handle single/double click distinction
  const handleClick = useCallback((e: React.MouseEvent) => {
    const now = Date.now()
    const timeSinceLastMove = now - lastTouchMoveTimeRef.current
    const touchDuration = now - touchStartTimeRef.current
    
    console.log('Click event:', { 
      isZoomed: isZoomedRef.current,
      timeSinceLastMove,
      touchDuration,
      touchStartTime: touchStartTimeRef.current,
      lastTouchMoveTime: lastTouchMoveTimeRef.current,
      now
    })
    
    // Only apply pan detection if we have recent timing data (within last 2 seconds)
    const hasRecentTiming = (now - touchStartTimeRef.current) < 2000
    
    if (hasRecentTiming && isZoomedRef.current && (timeSinceLastMove < 100 || touchDuration > 300)) {
      console.log('Click ignored - likely panning')
      return
    }

    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
      console.log('Double-click detected, ignoring')
      // This is a double-click, don't trigger background click
      return
    }

    // Set timeout for single click
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null
      console.log('Single click confirmed, triggering toolbar toggle')
      // Only trigger background click for single clicks without panning
      onBackgroundClick?.()
    }, 250) // 250ms delay to detect double-click
  }, [onBackgroundClick])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="w-full h-full bg-black">
      <Swiper
        key={readingMode} // Force remount when reading mode changes
        modules={[Keyboard, Zoom, Virtual, Navigation, FreeMode, Mousewheel]}
        spaceBetween={0}
        slidesPerView={1}
        centeredSlides={true}
        initialSlide={currentPageIndex}
        direction={readingMode === 'scrolling' ? 'vertical' : 'horizontal'}
        dir={readingMode === 'ltr' ? 'ltr' : 'rtl'}
        
        virtual={{
          enabled: true,
          cache: false,
        }}
        
        freeMode={readingMode === 'scrolling'}
        mousewheel={readingMode === 'scrolling' ? { releaseOnEdges: true } : false}
        
        allowTouchMove={true}
        touchRatio={1}
        threshold={5}
        followFinger={true}
        grabCursor={true}
        
        resistance={true}
        resistanceRatio={0.3}
        speed={250}
        
        keyboard={{
          enabled: true,
          onlyInViewport: true,
        }}
        
        navigation={{
          enabled: false
        }}
        
        zoom={{
          maxRatio: 1.5,
          minRatio: 1,
          toggle: true,
          containerClass: 'swiper-zoom-container',
          zoomedSlideClass: 'swiper-slide-zoomed'
        }}
        
        onSwiper={(swiper) => {
          swiperRef.current = swiper
          // Set initial keyboard state
          if (swiper.keyboard) {
            if (disableKeyboard) {
              swiper.keyboard.disable()
            } else {
              swiper.keyboard.enable()
            }
          }
        }}

        onZoomChange={handleZoomChange}
        
        onTouchStart={() => {
          touchStartTimeRef.current = Date.now()
          console.log('Touch start at:', touchStartTimeRef.current)
        }}
        
        onTouchMove={() => {
          lastTouchMoveTimeRef.current = Date.now()
          console.log('Touch move at:', lastTouchMoveTimeRef.current)
        }}
        
        onSlideChangeTransitionEnd={(swiper) => {
          const newIndex = swiper.activeIndex
          if (newIndex !== currentPageIndex) {
            onPageChange(newIndex)
          }
        }}
        
        className="w-full h-full"
      >
        {pages.map((page, index) => (
          <SwiperSlide 
            key={page.id} 
            virtualIndex={index}
          >
            <div className="swiper-zoom-container">
              <div 
                className="swiper-zoom-target relative w-full h-full flex items-center justify-center"
                onClick={handleClick}
              >
                <img
                  src={page.imagePath}
                  alt={`Page ${index + 1}`}
                  className="w-full h-full object-contain"
                  draggable={false}
                  style={{
                    userSelect: 'none',
                    pointerEvents: 'none'
                  }}
                />
                
                {index === currentPageIndex && imageSize && textBlocks.length > 0 && (
                  <SvgTextOverlay
                    textBlocks={textBlocks}
                    imageSize={imageSize}
                    onBlockClick={onBlockClick}
                    isGrammarOpen={isGrammarOpen}
                    selectedBlockIndex={selectedBlockIndex}
                    pageIndex={currentPageIndex}
                    touchStartTime={touchStartTimeRef.current}
                    lastTouchMoveTime={lastTouchMoveTimeRef.current}
                    isZoomed={isZoomedRef.current}
                  />
                )}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}