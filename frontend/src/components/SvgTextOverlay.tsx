import { TextBlock } from '@/constants/reader'

interface SvgTextOverlayProps {
  textBlocks: TextBlock[]
  imageSize: { width: number; height: number }
  onBlockClick: (block: TextBlock, index: number, pageIndex?: number) => void
  isGrammarOpen?: boolean
  selectedBlockIndex?: number | null
  pageIndex?: number
}

export function SvgTextOverlay({
  textBlocks,
  imageSize,
  onBlockClick,
  isGrammarOpen = false,
  selectedBlockIndex = null,
  pageIndex
}: SvgTextOverlayProps) {
  if (!textBlocks.length) return null

  return (
    <svg
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
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (block.text?.trim()) {
                onBlockClick(block, index, pageIndex)
              }
            }}
          >
            <title>{block.text}</title>
          </rect>
        )
      })}
    </svg>
  )
}