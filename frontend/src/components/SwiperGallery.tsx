import { useEffect, useRef } from 'react'
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
  selectedBlockIndex = null
}: SwiperGalleryProps) {
  const swiperRef = useRef<SwiperType>()

  useEffect(() => {
    if (swiperRef.current && swiperRef.current.activeIndex !== currentPageIndex) {
      swiperRef.current.slideTo(currentPageIndex)
    }
  }, [currentPageIndex])

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
                onClick={onBackgroundClick}
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