import { useRef, useCallback } from 'react'
import type { Swiper as SwiperType } from 'swiper'

interface UseCustomZoomProps {
  swiperRef: React.MutableRefObject<SwiperType | undefined>
  onBackgroundClick?: () => void
  maxZoomRatio?: number
}

export function useCustomZoom({ 
  swiperRef, 
  onBackgroundClick, 
  maxZoomRatio = 1.5 
}: UseCustomZoomProps) {
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isZoomedRef = useRef(false)
  const touchStartTimeRef = useRef<number>(0)
  const lastTouchMoveTimeRef = useRef<number>(0)
  const lastClickTimeRef = useRef<number>(0)

  // Track zoom state
  const handleZoomChange = useCallback((swiper: SwiperType, scale: number) => {
    isZoomedRef.current = scale > 1
  }, [])

  // Custom double-click zoom handler
  const handleDoubleClickZoom = useCallback((e: React.MouseEvent, slideElement: HTMLElement) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!swiperRef.current?.zoom) return
    
    const imgElements = slideElement.querySelectorAll('img') as NodeListOf<HTMLImageElement>
    if (imgElements.length === 0) return
    
    // Find which image was clicked
    let clickedImgRect: DOMRect | null = null
    for (const img of imgElements) {
      const imgRect = img.getBoundingClientRect()
      if (
        e.clientX >= imgRect.left &&
        e.clientX <= imgRect.right &&
        e.clientY >= imgRect.top &&
        e.clientY <= imgRect.bottom
      ) {
        clickedImgRect = imgRect
        break
      }
    }
    
    if (!clickedImgRect) return
    
    if (isZoomedRef.current) {
      // Zoom out
      swiperRef.current.zoom.out()
    } else {
      // First, zoom in to the default zoom level
      swiperRef.current.zoom.in()
      
      // Then manually adjust the position to center on the clicked point
      setTimeout(() => {
        const zoomContainer = slideElement.querySelector('.swiper-zoom-container') as HTMLElement
        if (zoomContainer) {
          const containerRect = zoomContainer.getBoundingClientRect()
          const scale = maxZoomRatio
          
          // Calculate the offset needed to center the clicked point
          const offsetX = (containerRect.width / 2 - (e.clientX - containerRect.left)) * (scale - 1) / scale
          const offsetY = (containerRect.height / 2 - (e.clientY - containerRect.top)) * (scale - 1) / scale
          
          // Apply the transform to center on the clicked position
          zoomContainer.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0px) scale(${scale})`
        }
      }, 0)
    }
  }, [swiperRef, maxZoomRatio])

  // Handle single/double click distinction
  const handleClick = useCallback((e: React.MouseEvent) => {
    const now = Date.now()
    const timeSinceLastMove = now - lastTouchMoveTimeRef.current
    const touchDuration = now - touchStartTimeRef.current
    const timeSinceLastClick = now - lastClickTimeRef.current
    
    // Only apply pan detection if we have recent timing data (within last 2 seconds)
    const hasRecentTiming = (now - touchStartTimeRef.current) < 2000
    
    if (hasRecentTiming && isZoomedRef.current && (timeSinceLastMove < 100 || touchDuration > 300)) {
      return
    }

    // Check for double-click (within 300ms)
    if (timeSinceLastClick < 300) {
      // Clear any existing single-click timeout
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }
      
      // Handle double-click zoom
      const slideElement = e.currentTarget as HTMLElement
      handleDoubleClickZoom(e, slideElement)
      lastClickTimeRef.current = 0 // Reset to prevent triple-click
      return
    }

    // Update last click time
    lastClickTimeRef.current = now

    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
    }

    // Set timeout for single click
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null
      // Only trigger background click for single clicks without panning
      onBackgroundClick?.()
    }, 250) // 250ms delay to detect double-click
  }, [onBackgroundClick, handleDoubleClickZoom])

  // Touch event handlers
  const handleTouchStart = useCallback(() => {
    touchStartTimeRef.current = Date.now()
  }, [])

  const handleTouchMove = useCallback(() => {
    lastTouchMoveTimeRef.current = Date.now()
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
    }
  }, [])

  return {
    handleClick,
    handleZoomChange,
    handleTouchStart,
    handleTouchMove,
    cleanup,
    isZoomedRef
  }
} 