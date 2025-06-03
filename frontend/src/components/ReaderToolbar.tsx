import { Button } from '@/components/ui/button'
import { Home, Settings, ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react'

interface ReaderToolbarProps {
  manga: {
    title: string
    type: string
    number?: number
    pages: Array<{ id: string }>
  }
  currentPage: number
  readingMode: 'rtl' | 'ltr' | 'scrolling'
  zoom: number
  scrollZoom: number
  showUI: boolean
  pageOcrStatus: Record<string, string>
  onNavigateHome: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onScrollZoomIn: () => void
  onScrollZoomOut: () => void
  onResetScrollZoom: () => void
  onToggleSettings: () => void
}

export function ReaderToolbar({
  manga,
  currentPage,
  readingMode,
  zoom,
  scrollZoom,
  showUI,
  pageOcrStatus,
  onNavigateHome,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onScrollZoomIn,
  onScrollZoomOut,
  onResetScrollZoom,
  onToggleSettings
}: ReaderToolbarProps) {
  const currentPageData = manga.pages[currentPage]
  const displayZoom = readingMode === 'scrolling' ? scrollZoom : zoom
  const showZoomControls = readingMode !== 'scrolling'
  const showScrollZoomControls = readingMode === 'scrolling'

  return (
    <div className={`
      absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm p-4
      transition-opacity duration-300
      ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}
    `}>
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateHome}
            className="text-white hover:bg-white/20"
          >
            <Home className="h-4 w-4 mr-2" />
            Library
          </Button>
          <div>
            <h1 className="font-medium">{manga.title}</h1>
            <p className="text-sm text-white/70">
              {manga.type} {manga.number} • Page {currentPage + 1} of {manga.pages.length} • {readingMode.toUpperCase()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {displayZoom !== 1 && (
            <div className="text-sm text-white/70 mr-2">
              {Math.round(displayZoom * 100)}%
            </div>
          )}
          
          {showZoomControls && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onZoomIn}
                className="text-white hover:bg-white/20"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onZoomOut}
                className="text-white hover:bg-white/20"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetZoom}
                className="text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {showScrollZoomControls && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onScrollZoomIn}
                className="text-white hover:bg-white/20"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onScrollZoomOut}
                className="text-white hover:bg-white/20"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetScrollZoom}
                className="text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {currentPageData && pageOcrStatus[currentPageData.id] === 'PROCESSING' && (
            <div className="flex items-center text-white/70 text-sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing page...
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSettings}
            className="text-white hover:bg-white/20"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}