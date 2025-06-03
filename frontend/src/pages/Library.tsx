import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { OcrStatusBlock } from '@/components/OcrStatusBlock'
import { Plus, Book, Edit, Trash2 } from 'lucide-react'

interface MangaItem {
  id: string
  title: string
  type: string
  number?: number
  author?: string
  thumbnail?: string
  createdAt: string
}

interface OcrCompletionStatus {
  id: string
  totalPages: number
  completedPages: number
  failedPages: number
  completedAt: string
  status: string
}

export default function Library() {
  const [manga, setManga] = useState<MangaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [ocrStatus, setOcrStatus] = useState<OcrCompletionStatus | null>(null)

  useEffect(() => {
    fetchManga()
    fetchOcrCompletionStatus()
  }, [])

  const fetchManga = async () => {
    try {
      const response = await fetch('/api/manga')
      if (response.ok) {
        const data = await response.json()
        setManga(data)
      }
    } catch (error) {
      console.error('Error fetching manga:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOcrCompletionStatus = async () => {
    try {
      const response = await fetch('/api/ocr/completion-status')
      if (response.ok) {
        const text = await response.text()
        if (text) {
          const data = JSON.parse(text)
          setOcrStatus(data)
        } else {
          setOcrStatus(null)
        }
      }
    } catch (error) {
      console.error('Error fetching OCR completion status:', error)
    }
  }

  const handleRetryFailed = async () => {
    try {
      const response = await fetch('/api/ocr/retry-failed', { method: 'POST' })
      if (response.ok) {
        // Clear the status and refresh
        setOcrStatus(null)
        await fetch('/api/ocr/completion-status/dismiss', { method: 'POST' })
      }
    } catch (error) {
      console.error('Error retrying failed pages:', error)
    }
  }

  const handleDismissStatus = async () => {
    try {
      const response = await fetch('/api/ocr/completion-status/dismiss', { method: 'POST' })
      if (response.ok) {
        setOcrStatus(null)
      }
    } catch (error) {
      console.error('Error dismissing status:', error)
    }
  }

  const deleteManga = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/manga/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setManga(prev => prev.filter(item => item.id !== id))
      } else {
        alert('Failed to delete manga. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting manga:', error)
      alert('Failed to delete manga. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">komu</h1>
          </div>
          <Link to="/upload">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Manga
            </Button>
          </Link>
        </div>

        {/* OCR Completion Status Block */}
        {ocrStatus && (
          <OcrStatusBlock
            status={ocrStatus}
            onRetry={handleRetryFailed}
            onDismiss={handleDismissStatus}
          />
        )}

        {manga.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Book className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No manga yet</h3>
            <p className="text-muted-foreground mb-4">
              Start building your library by uploading your first manga
            </p>
            <Link to="/upload">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload First Manga
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {manga.map((item) => (
              <div key={item.id} className="group relative">
                <Link
                  to={`/reader/${item.id}`}
                  className="block"
                >
                  <div className="bg-card rounded-lg shadow-sm overflow-hidden border hover:shadow-md transition-shadow">
                    <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Book className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm mb-1 line-clamp-2">
                        {item.title}
                      </h3>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>
                          {item.type} {item.number && `${item.number}`}
                        </div>
                        {item.author && (
                          <div className="line-clamp-1">{item.author}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Link
                    to={`/metadata/${item.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 bg-red-500/70 hover:bg-red-500/90 text-white border-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      deleteManga(item.id, item.title)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}