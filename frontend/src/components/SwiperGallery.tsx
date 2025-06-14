import { useEffect, useRef, useCallback } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Keyboard, Zoom, Virtual, Navigation, FreeMode, Mousewheel } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import { SvgTextOverlay } from './SvgTextOverlay'
import { TextBlock, Page, Dimensions } from '@/constants/reader'
import { useCustomZoom } from '@/hooks/useCustomZoom'

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

  // Use the custom zoom hook
  const { handleClick, handleZoomChange, handleTouchStart, handleTouchMove, cleanup, isZoomedRef } = useCustomZoom({
    swiperRef,
    onBackgroundClick,
    maxZoomRatio: 1.5
  })

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

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
          toggle: false, // Disable built-in double-click zoom
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        
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
                    touchStartTime={0}
                    lastTouchMoveTime={0}
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