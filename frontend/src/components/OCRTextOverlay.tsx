interface TextBlock {
  bbox: [number, number, number, number]
  text: string
}

interface OCRTextOverlayProps {
  textBlocks: TextBlock[]
  showTextBlocks: boolean
  imageSize: { width: number; height: number } | null
  hoveredBlock: number | null
  windowSize: { width: number; height: number }
  onBlockHover: (index: number | null) => void
  onBlockClick?: (block: TextBlock, index: number) => void
  mode: 'single' | 'scrolling'
  pageIndex?: number
}

export function OCRTextOverlay({
  textBlocks,
  showTextBlocks,
  imageSize,
  hoveredBlock,
  windowSize,
  onBlockHover,
  onBlockClick,
  mode,
  pageIndex = 0
}: OCRTextOverlayProps) {
  if (!showTextBlocks || !textBlocks.length || !imageSize) return null

  const imgSelector = mode === 'single' 
    ? 'img[alt*="Page"]' 
    : `img[alt="Page ${pageIndex + 1}"]`

  return (
    <>
      {textBlocks.map((block, index) => {
        const imgElement = document.querySelector(imgSelector) as HTMLImageElement
        if (!imgElement) return null

        // Force re-render when window size changes
        const _ = windowSize.width + windowSize.height

        const imgStyle = window.getComputedStyle(imgElement)
        const displayWidth = parseFloat(imgStyle.width)
        const displayHeight = parseFloat(imgStyle.height)
        
        const scaleX = displayWidth / imageSize.width
        const scaleY = displayHeight / imageSize.height
        
        const scaledLeft = block.bbox[0] * scaleX
        const scaledTop = block.bbox[1] * scaleY
        const scaledWidth = (block.bbox[2] - block.bbox[0]) * scaleX
        const scaledHeight = (block.bbox[3] - block.bbox[1]) * scaleY

        const positionStyle = mode === 'single' 
          ? {
              // Single page mode - center relative to image
              left: `calc(50% - ${displayWidth/2}px + ${scaledLeft}px)`,
              top: `calc(50% - ${displayHeight/2}px + ${scaledTop}px)`,
            }
          : {
              // Scrolling mode - absolute positioning relative to image
              left: `${scaledLeft}px`,
              top: `${scaledTop}px`,
            }

        const handleClick = (e: React.MouseEvent) => {
          // Prevent event from bubbling up to page navigation
          e.preventDefault()
          e.stopPropagation()
          
          if (onBlockClick && block.text.trim()) {
            onBlockClick(block, index)
          }
        }

        return (
          <div
            key={index}
            className="absolute border-2 border-green-500 bg-green-500/10 cursor-pointer transition-all duration-200 hover:bg-green-500/30 hover:border-green-400"
            style={{
              ...positionStyle,
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
            }}
            onMouseEnter={() => onBlockHover(index)}
            onMouseLeave={() => onBlockHover(null)}
            onClick={handleClick}
          >
            <div className="absolute top-0 left-0 bg-green-500 text-white text-xs px-1 rounded-br">
              {index + 1}
            </div>
            {hoveredBlock === index && block.text && (
              <div 
                className={`absolute bg-black/90 text-white text-sm p-3 rounded-lg shadow-lg z-50 pointer-events-none transition-opacity duration-200 ${
                  scaledTop > 80 ? 'bottom-full mb-2' : 'top-full mt-2'
                }`}
                style={{
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 'max-content',
                  maxWidth: '400px',
                  minWidth: '200px'
                }}
              >
                <div className="whitespace-pre-wrap break-words">
                  {block.text}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}