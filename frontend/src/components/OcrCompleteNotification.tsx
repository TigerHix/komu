import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, AlertCircle, RotateCcw, X } from 'lucide-react'
interface QueueComplete {
  totalPages: number
  completedPages: number
  failedPages: number
}

interface OcrCompleteNotificationProps {
  completion: QueueComplete
  onRetryFailed: () => void
  onDismiss: () => void
}

export function OcrCompleteNotification({ 
  completion, 
  onRetryFailed, 
  onDismiss 
}: OcrCompleteNotificationProps) {
  const { totalPages, completedPages, failedPages } = completion
  const hasFailures = failedPages > 0

  return (
    <Card className="fixed z-[101] w-full max-w-full bottom-4 sm:bottom-20 sm:right-4 sm:w-auto sm:max-w-[420px] mx-4 sm:mx-0 shadow-lg border-l-4" 
          style={{ borderLeftColor: hasFailures ? '#ef4444' : '#22c55e' }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {hasFailures ? (
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm mb-1">
                {hasFailures ? 'OCR Processing Complete with Errors' : 'OCR Processing Complete'}
              </h4>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Total pages: {totalPages}</div>
                <div className="text-green-600">Completed: {completedPages}</div>
                {failedPages > 0 && (
                  <div className="text-red-600">Failed: {failedPages}</div>
                )}
              </div>
              
              {hasFailures && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 w-full"
                  onClick={onRetryFailed}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry Failed Pages
                </Button>
              )}
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="p-1 h-auto"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}