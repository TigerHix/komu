import { TextBlock } from '@/constants/reader'
import { useRef } from 'react'

interface SvgTextOverlayProps {
  textBlocks: TextBlock[]
  imageSize: { width: number; height: number }
  onBlockClick: (block: TextBlock, index: number, pageIndex?: number, clickPosition?: { x: number; y: number }) => void
  isGrammarOpen?: boolean
  selectedBlockIndex?: number | null
  pageIndex?: number
  touchStartTime?: number
  lastTouchMoveTime?: number
  isZoomed?: boolean
}

export function SvgTextOverlay({
  textBlocks,
  imageSize,
  onBlockClick,
  isGrammarOpen = false,
  selectedBlockIndex = null,
  pageIndex,
  touchStartTime = 0,
  lastTouchMoveTime = 0,
  isZoomed = false
}: SvgTextOverlayProps) {
  const startPositionRef = useRef<{ x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Convert screen coordinates to SVG coordinates
  const getSvgCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return null
    
    const svgRect = svgRef.current.getBoundingClientRect()
    let clientX: number, clientY: number
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    
    // Convert to SVG coordinate space
    const x = ((clientX - svgRect.left) / svgRect.width) * imageSize.width
    const y = ((clientY - svgRect.top) / svgRect.height) * imageSize.height
    
    return { x, y }
  }

  if (!textBlocks.length) return null

  return (
    <svg
      ref={svgRef}
      className="absolute pointer-events-none w-full h-full"
      viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        left: 0,
        top: 0
      }}
    >
      {textBlocks.map((block, index) => {
        const isSelected = selectedBlockIndex === index
        const shouldShowFill = isSelected || (isGrammarOpen && isSelected)
        const shouldShowStroke = isSelected || (isGrammarOpen && isSelected)
        
        return (
          <rect
            key={index}
            x={block.bbox[0]}
            y={block.bbox[1]}
            width={block.bbox[2] - block.bbox[0]}
            height={block.bbox[3] - block.bbox[1]}
            fill={shouldShowFill ? "rgba(34, 197, 94, 0.2)" : "transparent"}
            stroke={shouldShowStroke ? "rgb(34, 197, 94)" : "transparent"}
            strokeWidth="2"
            className="cursor-pointer transition-all duration-200 hover:fill-[rgba(34,197,94,0.1)] hover:stroke-[rgb(34,197,94)]"
            style={{ pointerEvents: 'auto' }}
            onMouseDown={(e) => {
              const coords = getSvgCoordinates(e)
              if (coords) {
                startPositionRef.current = coords
              }
            }}
            onTouchStart={(e) => {
              const coords = getSvgCoordinates(e)
              if (coords) {
                startPositionRef.current = coords
              }
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              
              if (!block.text?.trim()) return
              
              // Simple drag detection: compare start and end positions in SVG coordinates
              if (startPositionRef.current) {
                const endCoords = getSvgCoordinates(e)
                if (endCoords) {
                  const deltaX = Math.abs(endCoords.x - startPositionRef.current.x)
                  const deltaY = Math.abs(endCoords.y - startPositionRef.current.y)
                  const dragThreshold = 20 // SVG coordinate units
                  
                  console.log('Text block click:', { 
                    deltaX, 
                    deltaY, 
                    dragThreshold,
                    startPos: startPositionRef.current,
                    endPos: endCoords
                  })
                  
                  if (deltaX > dragThreshold || deltaY > dragThreshold) {
                    console.log('Text block click ignored - was dragging')
                    return
                  }
                }
              }
              
              // Calculate click position relative to the text block center for better popup positioning
              if (!svgRef.current) {
                onBlockClick(block, index, pageIndex, { x: e.clientX, y: e.clientY })
                return
              }
              
              // Get the SVG's position and the text block center
              const svgRect = svgRef.current.getBoundingClientRect()
              const blockCenterX = (block.bbox[0] + block.bbox[2]) / 2
              const blockCenterY = (block.bbox[1] + block.bbox[3]) / 2
              
              // Convert block center from SVG coordinates to screen coordinates
              const scaleX = svgRect.width / imageSize.width
              const scaleY = svgRect.height / imageSize.height
              
              const screenX = svgRect.left + (blockCenterX * scaleX)
              const screenY = svgRect.top + (blockCenterY * scaleY)
              
              onBlockClick(block, index, pageIndex, { x: screenX, y: screenY })
            }}
          >
            <title>{block.text}</title>
          </rect>
        )
      })}
    </svg>
  )
}