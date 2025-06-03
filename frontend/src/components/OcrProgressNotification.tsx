import { useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Pause, Play, X, Loader2 } from 'lucide-react'
import { OcrProgress } from '@/hooks/useWebSocket'

interface OcrProgressNotificationProps {
  progress: OcrProgress
  onPause: () => void
  onResume: () => void
  onDismiss: () => void
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

export function OcrProgressNotification({ 
  progress, 
  onPause, 
  onResume, 
  onDismiss 
}: OcrProgressNotificationProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  
  const percentage = progress.totalPages > 0 
    ? Math.round((progress.processedPages / progress.totalPages) * 100)
    : 0

  if (isMinimized) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 shadow-lg cursor-pointer" 
            onClick={() => setIsMinimized(false)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">OCR Processing {percentage}%</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation()
                onDismiss()
              }}
              className="ml-auto h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Progress value={percentage} className="h-1 mt-1" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <h3 className="font-medium">OCR Processing</h3>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsMinimized(true)}
              className="h-6 w-6 p-0"
            >
              <span className="text-xs">−</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>{progress.processedPages} of {progress.totalPages} pages</span>
              <span>{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
          
          {progress.currentManga && progress.currentPage && (
            <div className="text-sm">
              <span className="text-muted-foreground">Processing:</span>{' '}
              <span className="font-medium">
                Manga {progress.currentManga.split('_')[1]}, Page {progress.currentPage}
              </span>
            </div>
          )}
          
          {progress.estimatedTimeRemaining && (
            <div className="text-sm text-muted-foreground">
              <span>ETA: {formatTime(progress.estimatedTimeRemaining)}</span>
            </div>
          )}
          
          <div className="flex gap-2">
            {progress.isPaused ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onResume}
                className="flex items-center gap-1"
              >
                <Play className="h-3 w-3" />
                Resume
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onPause}
                className="flex items-center gap-1"
              >
                <Pause className="h-3 w-3" />
                Pause
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}