interface PageSliderProps {
  currentPage: number
  totalPages: number
  showUI: boolean
  onPageChange: (page: number) => void
}

export function PageSlider({
  currentPage,
  totalPages,
  showUI,
  onPageChange
}: PageSliderProps) {
  return (
    <div className={`
      absolute bottom-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm p-4
      transition-opacity duration-300
      ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}
    `}>
      <div className="flex items-center space-x-4">
        <div className="text-white text-sm font-medium min-w-fit">
          {currentPage + 1} / {totalPages}
        </div>
        
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max={totalPages - 1}
            value={currentPage}
            onChange={(e) => onPageChange(parseInt(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-default slider"
            style={{
              background: `linear-gradient(to right, #ffffff 0%, #ffffff ${((currentPage + 1) / totalPages) * 100}%, rgba(255,255,255,0.2) ${((currentPage + 1) / totalPages) * 100}%, rgba(255,255,255,0.2) 100%)`
            }}
          />
        </div>
      </div>
    </div>
  )
}