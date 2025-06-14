import { useEffect, useRef, useCallback } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Keyboard, Zoom, Virtual, Navigation } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import { SvgTextOverlay } from './SvgTextOverlay'
import { TextBlock, Page, Dimensions } from '@/constants/reader'
import { useCustomZoom } from '@/hooks/useCustomZoom'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/zoom'
import 'swiper/css/virtual'

interface TwoPageGalleryProps {
  pages: Page[]
  currentPageIndex: number
  onPageChange: (newPageIndex: number) => void
  textBlocks: Record<number, TextBlock[]>
  imageSizes: Record<number, Dimensions | null>
  onBlockClick: (block: TextBlock, index: number, pageIndex?: number) => void
  onBackgroundClick?: () => void
  readingMode?: 'rtl' | 'ltr'
  isGrammarOpen?: boolean
  selectedBlockIndex?: number | null
  selectedPageIndex?: number | null
  disableKeyboard?: boolean
  pagePairingMode: 'manga' | 'book' // 'manga': 1, 2/3, 4/5... | 'book': 1/2, 3/4, 5/6...
}

export function TwoPageGallery({
  pages,
  currentPageIndex,
  onPageChange,
  textBlocks,
  imageSizes,
  onBlockClick,
  onBackgroundClick,
  readingMode = 'rtl',
  isGrammarOpen = false,
  selectedBlockIndex = null,
  selectedPageIndex = null,
  disableKeyboard = false,
  pagePairingMode = 'manga'
}: TwoPageGalleryProps) {
  const swiperRef = useRef<SwiperType>()

  // Use the custom zoom hook
  const { handleClick, handleZoomChange, handleTouchStart, handleTouchMove, cleanup, isZoomedRef } = useCustomZoom({
    swiperRef,
    onBackgroundClick,
    maxZoomRatio: 1.5
  })

  // Calculate which spread contains the current page
  const getCurrentSpreadIndex = useCallback(() => {
    if (pagePairingMode === 'manga') {
      // Manga mode: page 0 alone, then 1+2, 3+4, 5+6, etc.
      if (currentPageIndex === 0) return 0
      return Math.floor((currentPageIndex - 1) / 2) + 1
    } else {
      // Book mode: 0+1, 2+3, 4+5, etc.
      return Math.floor(currentPageIndex / 2)
    }
  }, [currentPageIndex, pagePairingMode])

  // Calculate total number of spreads
  const getTotalSpreads = useCallback(() => {
    if (pagePairingMode === 'manga') {
      // First page alone + remaining pages in pairs
      return Math.ceil((pages.length - 1) / 2) + 1
    } else {
      // All pages in pairs
      return Math.ceil(pages.length / 2)
    }
  }, [pages.length, pagePairingMode])

  // Get page indices for a given spread
  const getSpreadPages = useCallback((spreadIndex: number) => {
    if (pagePairingMode === 'manga') {
      if (spreadIndex === 0) {
        return [0] // First page alone
      } else {
        const firstPageIndex = (spreadIndex - 1) * 2 + 1
        const secondPageIndex = firstPageIndex + 1
        return secondPageIndex < pages.length ? [firstPageIndex, secondPageIndex] : [firstPageIndex]
      }
    } else {
      const firstPageIndex = spreadIndex * 2
      const secondPageIndex = firstPageIndex + 1
      return secondPageIndex < pages.length ? [firstPageIndex, secondPageIndex] : [firstPageIndex]
    }
  }, [pages.length, pagePairingMode])

  const currentSpreadIndex = getCurrentSpreadIndex()

  useEffect(() => {
    if (swiperRef.current && swiperRef.current.activeIndex !== currentSpreadIndex) {
      swiperRef.current.slideTo(currentSpreadIndex)
    }
  }, [currentSpreadIndex])

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

  // Handle spread navigation
  const handleSpreadChange = useCallback((newSpreadIndex: number) => {
    const spreadPages = getSpreadPages(newSpreadIndex)
    // Navigate to the first page of the new spread
    onPageChange(spreadPages[0])
  }, [getSpreadPages, onPageChange])

  return (
    <div className="w-full h-full bg-black">
      <Swiper
        key={`${readingMode}-${pagePairingMode}`} // Force remount when mode changes
        modules={[Keyboard, Zoom, Virtual, Navigation]}
        spaceBetween={0}
        slidesPerView={1}
        centeredSlides={true}
        initialSlide={currentSpreadIndex}
        direction="horizontal"
        dir={readingMode === 'ltr' ? 'ltr' : 'rtl'}
        
        virtual={{
          enabled: true,
          cache: false,
        }}
        
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
          const newSpreadIndex = swiper.activeIndex
          if (newSpreadIndex !== currentSpreadIndex) {
            handleSpreadChange(newSpreadIndex)
          }
        }}
        
        className="w-full h-full"
      >
        {Array.from({ length: getTotalSpreads() }, (_, spreadIndex) => {
          const spreadPages = getSpreadPages(spreadIndex)
          const isCurrentSpread = spreadIndex === currentSpreadIndex
          
          return (
            <SwiperSlide 
              key={`spread-${spreadIndex}`} 
              virtualIndex={spreadIndex}
            >
              <div className="swiper-zoom-container">
                <div 
                  className="swiper-zoom-target relative w-full h-full flex items-center justify-center gap-1"
                  onClick={handleClick}
                >
                  {spreadPages.length === 1 ? (
                    // Single page (first page in manga mode or last odd page)
                    <div className="relative h-full flex items-center justify-center">
                      <img
                        src={pages[spreadPages[0]].imagePath}
                        alt={`Page ${spreadPages[0] + 1}`}
                        className="max-w-full max-h-full object-contain"
                        draggable={false}
                        style={{
                          userSelect: 'none',
                          pointerEvents: 'none'
                        }}
                      />
                      
                      {isCurrentSpread && imageSizes[spreadPages[0]] && textBlocks[spreadPages[0]]?.length > 0 && (
                        <SvgTextOverlay
                          textBlocks={textBlocks[spreadPages[0]]}
                          imageSize={imageSizes[spreadPages[0]]!}
                          onBlockClick={onBlockClick}
                          isGrammarOpen={isGrammarOpen}
                          selectedBlockIndex={selectedPageIndex === spreadPages[0] ? selectedBlockIndex : null}
                          pageIndex={spreadPages[0]}
                          touchStartTime={0}
                          lastTouchMoveTime={0}
                          isZoomed={isZoomedRef.current}
                        />
                      )}
                    </div>
                  ) : (
                    // Two pages side by side
                    <div className="flex h-full items-center justify-center">
                      {/* Left page */}
                      <div className="relative h-full flex items-center justify-center flex-1">
                        <img
                          src={pages[readingMode === 'rtl' ? spreadPages[0] : spreadPages[1]].imagePath}
                          alt={`Page ${(readingMode === 'rtl' ? spreadPages[0] : spreadPages[1]) + 1}`}
                          className="max-w-full max-h-full object-contain"
                          draggable={false}
                          style={{
                            userSelect: 'none',
                            pointerEvents: 'none'
                          }}
                        />
                        
                        {isCurrentSpread && imageSizes[readingMode === 'rtl' ? spreadPages[0] : spreadPages[1]] && textBlocks[readingMode === 'rtl' ? spreadPages[0] : spreadPages[1]]?.length > 0 && (
                          <SvgTextOverlay
                            textBlocks={textBlocks[readingMode === 'rtl' ? spreadPages[0] : spreadPages[1]]}
                            imageSize={imageSizes[readingMode === 'rtl' ? spreadPages[0] : spreadPages[1]]!}
                            onBlockClick={onBlockClick}
                            isGrammarOpen={isGrammarOpen}
                            selectedBlockIndex={selectedPageIndex === (readingMode === 'rtl' ? spreadPages[0] : spreadPages[1]) ? selectedBlockIndex : null}
                            pageIndex={readingMode === 'rtl' ? spreadPages[0] : spreadPages[1]}
                            touchStartTime={0}
                            lastTouchMoveTime={0}
                            isZoomed={isZoomedRef.current}
                          />
                        )}
                      </div>
                      
                      {/* Right page */}
                      <div className="relative h-full flex items-center justify-center flex-1">
                        <img
                          src={pages[readingMode === 'rtl' ? spreadPages[1] : spreadPages[0]].imagePath}
                          alt={`Page ${(readingMode === 'rtl' ? spreadPages[1] : spreadPages[0]) + 1}`}
                          className="max-w-full max-h-full object-contain"
                          draggable={false}
                          style={{
                            userSelect: 'none',
                            pointerEvents: 'none'
                          }}
                        />
                        
                        {isCurrentSpread && imageSizes[readingMode === 'rtl' ? spreadPages[1] : spreadPages[0]] && textBlocks[readingMode === 'rtl' ? spreadPages[1] : spreadPages[0]]?.length > 0 && (
                          <SvgTextOverlay
                            textBlocks={textBlocks[readingMode === 'rtl' ? spreadPages[1] : spreadPages[0]]}
                            imageSize={imageSizes[readingMode === 'rtl' ? spreadPages[1] : spreadPages[0]]!}
                            onBlockClick={onBlockClick}
                            isGrammarOpen={isGrammarOpen}
                            selectedBlockIndex={selectedPageIndex === (readingMode === 'rtl' ? spreadPages[1] : spreadPages[0]) ? selectedBlockIndex : null}
                            pageIndex={readingMode === 'rtl' ? spreadPages[1] : spreadPages[0]}
                            touchStartTime={0}
                            lastTouchMoveTime={0}
                            isZoomed={isZoomedRef.current}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </SwiperSlide>
          )
        })}
      </Swiper>
    </div>
  )
} 