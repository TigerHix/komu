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