import { TextBlock, Coordinates, Dimensions, BoundingBox } from '@/constants/reader'

export interface ImageInfo {
  element: HTMLImageElement
  displaySize: Dimensions
  originalSize: Dimensions
  position: Coordinates
}

/**
 * Gets comprehensive image information from DOM element
 */
export function getImageInfo(imgElement: HTMLImageElement, originalSize: Dimensions): ImageInfo {
  const rect = imgElement.getBoundingClientRect()
  const parentRect = imgElement.parentElement?.getBoundingClientRect() || rect
  
  return {
    element: imgElement,
    displaySize: {
      width: rect.width,
      height: rect.height
    },
    originalSize,
    position: {
      x: rect.left - parentRect.left,
      y: rect.top - parentRect.top
    }
  }
}

/**
 * Calculates scaling factors between original and displayed image
 */
export function getScalingFactors(originalSize: Dimensions, displaySize: Dimensions) {
  return {
    x: displaySize.width / originalSize.width,
    y: displaySize.height / originalSize.height
  }
}

/**
 * Converts text block bbox to screen coordinates
 */
export function textBlockToScreenCoords(
  block: TextBlock,
  imageInfo: ImageInfo
): BoundingBox {
  const scale = getScalingFactors(imageInfo.originalSize, imageInfo.displaySize)
  
  return {
    left: block.bbox[0] * scale.x,
    top: block.bbox[1] * scale.y,
    width: (block.bbox[2] - block.bbox[0]) * scale.x,
    height: (block.bbox[3] - block.bbox[1]) * scale.y
  }
}

// Note: Single page text overlays now use SVG approach in SvgTextOverlay component
// This eliminates the need for complex coordinate transformations

/**
 * Determines if a click is within image bounds
 */
export function isClickInImage(
  clickX: number,
  clickY: number,
  imageRect: DOMRect
): boolean {
  return clickX >= imageRect.left && 
         clickX <= imageRect.right && 
         clickY >= imageRect.top && 
         clickY <= imageRect.bottom
}

/**
 * Gets click position relative to image
 */
export function getRelativeClickPosition(
  clientX: number,
  clientY: number,
  imageRect: DOMRect
): Coordinates {
  return {
    x: clientX - imageRect.left,
    y: clientY - imageRect.top
  }
}

/**
 * Determines click area (left/center/right thirds)
 */
export function getClickArea(relativeX: number, imageWidth: number): 'left' | 'center' | 'right' {
  const leftThird = imageWidth / 3
  const rightThird = imageWidth * 2 / 3
  
  if (relativeX < leftThird) return 'left'
  if (relativeX > rightThird) return 'right'
  return 'center'
}

/**
 * Determines vertical click area (top/center/bottom thirds)
 */
export function getVerticalClickArea(relativeY: number, imageHeight: number): 'top' | 'center' | 'bottom' {
  const topThird = imageHeight / 3
  const bottomThird = imageHeight * 2 / 3
  
  if (relativeY < topThird) return 'top'
  if (relativeY > bottomThird) return 'bottom'
  return 'center'
}

/**
 * Safely queries for image element with error handling
 */
export function findImageElement(selector: string): HTMLImageElement | null {
  const element = document.querySelector(selector) as HTMLImageElement
  return element?.tagName === 'IMG' ? element : null
}

/**
 * Calculates zoom center point for double-click zoom
 */
export function calculateZoomCenter(
  clickX: number,
  clickY: number,
  imageRect: DOMRect
): Coordinates {
  const imgCenterX = imageRect.left + imageRect.width / 2
  const imgCenterY = imageRect.top + imageRect.height / 2
  
  return {
    x: (clickX - imgCenterX) * -1,
    y: (clickY - imgCenterY) * -1
  }
}

/**
 * Calculate the screen coordinates of a text block for animation purposes
 * This accounts for different reading modes and coordinate transformations
 */
export function calculateTextBlockScreenPosition(
  textBlock: TextBlock,
  imageSize: Dimensions,
  readingMode: 'rtl' | 'ltr' | 'scrolling',
  pageIndex: number,
  currentPageIndex: number
): Coordinates | null {
  try {
    // Get the text block center coordinates in SVG space
    const [x1, y1, x2, y2] = textBlock.bbox
    const centerX = (x1 + x2) / 2
    const centerY = (y1 + y2) / 2

    if (readingMode === 'scrolling') {
      // In scrolling mode, find the page element by looking at react-window structure
      const listContainer = document.querySelector('[style*="transform"]')
      if (!listContainer) {
        console.warn('Could not find react-window list container')
        return null
      }

      // Find all page slides within the virtualized list
      const pageSlides = listContainer.querySelectorAll('div[style*="height"]')
      const targetPageSlide = Array.from(pageSlides)[pageIndex] as HTMLElement

      if (!targetPageSlide) {
        console.warn('Could not find page slide for index:', pageIndex)
        return null
      }

      // Get the image element within this page slide
      const imgElement = targetPageSlide.querySelector('img') as HTMLImageElement
      if (!imgElement) {
        console.warn('Could not find image element in page slide:', pageIndex)
        return null
      }

      // Get the image's bounding rect
      const imgRect = imgElement.getBoundingClientRect()
      
      // Calculate the scale factor between SVG coordinates and displayed image
      const scaleX = imgRect.width / imageSize.width
      const scaleY = imgRect.height / imageSize.height

      // Convert SVG coordinates to screen coordinates
      const screenX = imgRect.left + (centerX * scaleX)
      const screenY = imgRect.top + (centerY * scaleY)

      return { x: screenX, y: screenY }

    } else {
      // For swiper modes (RTL/LTR), only consider the current active page
      if (pageIndex !== currentPageIndex) {
        // Text block is not on the current page, can't calculate position
        return null
      }

      // Find the active swiper slide
      const activeSlide = document.querySelector('.swiper-slide-active')
      if (!activeSlide) {
        console.warn('Could not find active swiper slide')
        return null
      }

      // Check if we're in two-page mode (multiple images in the slide)
      const imgElements = activeSlide.querySelectorAll('img') as NodeListOf<HTMLImageElement>
      let imgElement: HTMLImageElement | null = null

      if (imgElements.length === 1) {
        // Single page mode
        imgElement = imgElements[0]
      } else if (imgElements.length === 2) {
        // Two-page mode - find the correct image by page number
        const targetPageAlt = `Page ${pageIndex + 1}`
        
        for (const img of imgElements) {
          if (img.alt === targetPageAlt) {
            imgElement = img
            break
          }
        }
        
        if (!imgElement) {
          console.warn('Could not find image element for page:', pageIndex)
          return null
        }
      } else {
        console.warn('Unexpected number of images in slide:', imgElements.length)
        return null
      }

      if (!imgElement) {
        console.warn('Could not find image element in active slide')
        return null
      }

      // Get the image's bounding rect
      const imgRect = imgElement.getBoundingClientRect()
      
      // Calculate the scale factor between SVG coordinates and displayed image
      const scaleX = imgRect.width / imageSize.width
      const scaleY = imgRect.height / imageSize.height

      // Convert SVG coordinates to screen coordinates
      const screenX = imgRect.left + (centerX * scaleX)
      const screenY = imgRect.top + (centerY * scaleY)

      return { x: screenX, y: screenY }
    }
  } catch (error) {
    console.error('Error calculating text block screen position:', error)
    return null
  }
}