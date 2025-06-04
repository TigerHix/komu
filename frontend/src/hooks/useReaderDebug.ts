import { useCallback } from 'react'

interface DebugState {
  zoom: number
  panX: number  
  panY: number
  textBlocks: any[]
  imageSize: { width: number; height: number } | null
}

export function useReaderDebug() {
  const debugCurrentState = useCallback(({ zoom, panX, panY, textBlocks, imageSize }: DebugState) => {
    const singlePageImgElement = document.querySelector('img[alt*="Page"]') as HTMLImageElement
    const firstTextBlock = textBlocks[0]
    
    console.log('🐛 DEBUG STATE SNAPSHOT:', {
      timestamp: new Date().toISOString(),
      zoom,
      pan: { x: panX, y: panY },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      imageElement: singlePageImgElement ? {
        rect: singlePageImgElement.getBoundingClientRect(),
        naturalSize: { width: singlePageImgElement.naturalWidth, height: singlePageImgElement.naturalHeight },
        displaySize: { width: singlePageImgElement.width, height: singlePageImgElement.height }
      } : null,
      ocrImageSize: imageSize,
      firstTextBlock: firstTextBlock ? {
        bbox: firstTextBlock.bbox,
        text: firstTextBlock.text?.substring(0, 20) + '...'
      } : null,
      totalTextBlocks: textBlocks.length
    })
  }, [])

  return { debugCurrentState }
}