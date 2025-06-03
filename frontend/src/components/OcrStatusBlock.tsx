import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, RotateCcw, X, Loader2 } from 'lucide-react'

interface OcrCompletionStatus {
  id: string
  totalPages: number
  completedPages: number
  failedPages: number
  completedAt: string
  status: string
}

interface OcrStatusBlockProps {
  status: OcrCompletionStatus
  onRetry: () => Promise<void>
  onDismiss: () => Promise<void>
}

export function OcrStatusBlock({ status, onRetry, onDismiss }: OcrStatusBlockProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  
  const { totalPages, completedPages, failedPages } = status
  const hasFailures = failedPages > 0

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  const handleDismiss = async () => {
    setIsDismissing(true)
    try {
      await onDismiss()
    } finally {
      setIsDismissing(false)
    }
  }

  return (
    <div className={`
      mb-6 rounded-lg border p-4 
      ${hasFailures 
        ? 'bg-red-50 border-red-200' 
        : 'bg-green-50 border-green-200'
      }
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {hasFailures ? (
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm mb-2">
              {hasFailures ? 'OCR Processing Completed with Errors' : 'OCR Processing Completed Successfully'}
            </h3>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Total pages: {totalPages}</div>
              <div className="text-green-600">Completed: {completedPages}</div>
              {failedPages > 0 && (
                <div className="text-red-600">Failed: {failedPages}</div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                Completed at {new Date(status.completedAt).toLocaleString()}
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              {hasFailures && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  {isRetrying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  {isRetrying ? 'Retrying...' : 'Retry Failed Pages'}
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleDismiss}
                disabled={isDismissing}
                className="text-muted-foreground hover:text-foreground"
              >
                {isDismissing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                {isDismissing ? 'Dismissing...' : 'Dismiss'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}