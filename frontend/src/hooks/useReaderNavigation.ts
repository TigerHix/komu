import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReadingMode, Manga, READER_CONSTANTS } from '@/constants/reader'
import { 
  isClickInImage, 
  calculateZoomCenter 
} from '@/utils/coordinates'

interface NavigationProps {
  manga: Manga | null
  readingMode: ReadingMode
  currentPage: number
  setCurrentPage: (page: number) => void
  showUI: boolean
  setShowUI: (show: boolean) => void
  setShowSettings: (show: boolean) => void
  onPageChange?: () => void
  zoom?: number
  isDragging?: boolean
  onDoubleClickZoom?: (centerX: number, centerY: number) => void
}

export function useReaderNavigation({
  manga,
  readingMode,
  currentPage,
  setCurrentPage,
  showUI,
  setShowUI,
  setShowSettings,
  onPageChange,
  zoom = 1,
  isDragging = false,
  onDoubleClickZoom
}: NavigationProps) {
  const navigate = useNavigate()
  const [lastTap, setLastTap] = useState(0)

  const nextPage = useCallback(() => {
    if (manga && currentPage < manga.pages.length - 1) {
      setCurrentPage(currentPage + 1)
      setShowUI(false)
      onPageChange?.()
    }
  }, [manga, currentPage, setCurrentPage, setShowUI, onPageChange])

  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
      setShowUI(false)
      onPageChange?.()
    }
  }, [currentPage, setCurrentPage, setShowUI, onPageChange])

  const goToPage = useCallback((pageIndex: number) => {
    if (manga && pageIndex >= 0 && pageIndex < manga.pages.length) {
      setCurrentPage(pageIndex)
      onPageChange?.()
    }
  }, [manga, setCurrentPage, onPageChange])

  const handleSinglePageClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (zoom > 1 || isDragging) return

    const imgElement = e.currentTarget.querySelector('img') as HTMLImageElement
    if (!imgElement) return

    const imgRect = imgElement.getBoundingClientRect()
    const containerRect = e.currentTarget.getBoundingClientRect()
    
    const clickX = e.clientX - containerRect.left
    const isInsideImage = isClickInImage(e.clientX, e.clientY, imgRect)

    if (isInsideImage) {
      // Only toggle UI when clicking on image
      setShowUI(!showUI)
      return
    }

    // Navigation only when clicking outside image - use container-based left/right halves
    const containerCenterX = containerRect.width / 2
    
    if (readingMode === 'rtl') {
      if (clickX < containerCenterX) {
        nextPage()
      } else {
        prevPage()
      }
    } else {
      if (clickX < containerCenterX) {
        prevPage()
      } else {
        nextPage()
      }
    }
    
    setShowSettings(false)
  }, [readingMode, zoom, isDragging, showUI, nextPage, prevPage, setShowUI, setShowSettings])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const imgElement = e.currentTarget.querySelector('img') as HTMLImageElement
    if (!imgElement) return

    const imgRect = imgElement.getBoundingClientRect()
    
    if (!isClickInImage(e.clientX, e.clientY, imgRect)) return
    
    e.preventDefault()
    const zoomCenter = calculateZoomCenter(e.clientX, e.clientY, imgRect)
    onDoubleClickZoom?.(zoomCenter.x, zoomCenter.y)
  }, [onDoubleClickZoom])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTap
    
    if (timeSinceLastTap < READER_CONSTANTS.DOUBLE_TAP_THRESHOLD && timeSinceLastTap > 0) {
      const imgElement = e.currentTarget.querySelector('img') as HTMLImageElement
      if (imgElement) {
        const imgRect = imgElement.getBoundingClientRect()
        const touch = e.touches[0]
        
        if (isClickInImage(touch.clientX, touch.clientY, imgRect)) {
          e.preventDefault()
          const zoomCenter = calculateZoomCenter(touch.clientX, touch.clientY, imgRect)
          onDoubleClickZoom?.(zoomCenter.x, zoomCenter.y)
        }
      }
    }
    
    setLastTap(now)
  }, [lastTap, onDoubleClickZoom])

  // Keyboard navigation - disabled for scrolling mode
  useEffect(() => {
    if (readingMode === 'scrolling') return // Let react-window handle scrolling

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

  return {
    nextPage,
    prevPage,
    goToPage,
    handleSinglePageClick,
    handleDoubleClick,
    handleTouchStart,
  }
}