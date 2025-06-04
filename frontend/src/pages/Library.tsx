import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { OcrStatusBlock } from '@/components/OcrStatusBlock'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Book, Edit, Trash2, TestTube } from 'lucide-react'

interface MangaItem {
  id: string
  title: string
  type: string
  number?: number
  author?: string
  thumbnail?: string
  currentPage: number
  totalPages: number
  progressPercent: number
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
  const { toast } = useToast()

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
    <div className="min-h-screen bg-background">
      {/* Status bar with accent color background */}
      <div className="bg-accent p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-accent-foreground">komu</h1>
            </div>
            <div className="flex gap-2">
              <Link to="/upload">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manga
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto p-4">
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
                <div className="bg-card rounded-lg shadow-sm overflow-hidden border hover:shadow-md transition-shadow">
                  {/* Cover image - direct link to reader */}
                  <Link
                    to={`/reader/${item.id}`}
                    className="block aspect-[3/4] bg-muted relative overflow-hidden"
                  >
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
                  </Link>
                  
                  {/* Title and info area - shows edit/delete on mobile tap */}
                  <div className="p-3 relative">
                    <div 
                      className="cursor-pointer md:cursor-default"
                      onClick={(e) => {
                        // On mobile, toggle edit buttons. On desktop, do nothing (hover handles it)
                        if (window.innerWidth < 768) {
                          const buttons = e.currentTarget.parentElement?.querySelector('.mobile-edit-buttons')
                          if (buttons) {
                            buttons.classList.toggle('hidden')
                          }
                        }
                      }}
                    >
                      <h3 className="font-medium text-sm mb-1 line-clamp-2">
                        {item.title}
                      </h3>
                      <div className="text-xs text-muted-foreground space-y-1 mb-2">
                        <div>
                          {item.number ? `${item.type} ${item.number}` : `Unknown ${item.type}`}
                        </div>
                        <div className="line-clamp-1">
                          {item.author || 'Unknown Author'}
                        </div>
                      </div>
                      {item.totalPages > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {item.progressPercent === 0 
                                ? `${item.totalPages} pages` 
                                : `Page ${item.currentPage + 1} of ${item.totalPages}`
                              }
                            </span>
                            <span>{item.progressPercent}%</span>
                          </div>
                          <Progress value={item.progressPercent} className="h-1.5" />
                        </div>
                      )}
                    </div>
                    
                    {/* Mobile edit buttons - hidden by default, shown on title click */}
                    <div className="mobile-edit-buttons hidden md:hidden mt-2 flex gap-2 justify-center">
                      <Link to={`/metadata/${item.id}`}>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="flex-1"
                        onClick={() => deleteManga(item.id, item.title)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Desktop hover buttons - only visible on desktop */}
                <div className="hidden md:flex absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <Link to={`/metadata/${item.id}`}>
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
                    onClick={() => deleteManga(item.id, item.title)}
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