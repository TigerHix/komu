import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Upload, Check, X, Sparkles, Trash2 } from 'lucide-react'

interface Metadata {
  id: string
  title: string
  type: 'Volume' | 'Chapter'
  number?: number
  author?: string
  description?: string
  thumbnail?: string
}

interface MetadataSuggestion {
  author?: string
  description?: string
}

export default function MetadataEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false)
  const [removingOcr, setRemovingOcr] = useState(false)
  const [suggestions, setSuggestions] = useState<MetadataSuggestion | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    if (id) {
      fetchMetadata()
    }
  }, [id])

  const fetchMetadata = async () => {
    try {
      const response = await fetch(`/api/metadata/${id}`)
      if (response.ok) {
        const data = await response.json()
        setMetadata(data)
      }
    } catch (error) {
      console.error('Error fetching metadata:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuggestions = async () => {
    if (!metadata) return
    
    setFetchingSuggestions(true)
    
    // Show toast notification that AI is fetching
    toast({
      title: 'Fetching metadata...',
      description: 'AI is searching the internet for manga information'
    })
    
    try {
      const response = await fetch(`/api/metadata/${id}/fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: metadata.title,
          type: metadata.type,
          number: metadata.number
        })
      })
      if (response.ok) {
        const data = await response.json()
        if (data.author || data.description) {
          setSuggestions(data)
          setShowSuggestions(true)
          toast({
            title: 'Metadata suggestions available',
            description: 'AI-powered suggestions are ready for review'
          })
        } else {
          toast({
            title: 'No suggestions found',
            description: 'AI could not find reliable metadata for this manga'
          })
        }
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      toast({
        title: 'Failed to fetch suggestions',
        description: 'There was an error fetching AI suggestions',
        variant: 'destructive'
      })
    } finally {
      setFetchingSuggestions(false)
    }
  }

  const applySuggestions = () => {
    if (metadata && suggestions) {
      setMetadata({
        ...metadata,
        author: suggestions.author || metadata.author,
        description: suggestions.description || metadata.description
      })
      setShowSuggestions(false)
      toast({
        title: 'Suggestions applied',
        description: 'Metadata has been updated with AI suggestions'
      })
    }
  }

  const dismissSuggestions = () => {
    setShowSuggestions(false)
    setSuggestions(null)
  }

  const handleRemoveOcr = async () => {
    if (!id) return

    const confirmed = confirm('Remove all OCR data for this manga? Pages will be re-processed automatically.')
    if (!confirmed) return

    setRemovingOcr(true)
    try {
      const response = await fetch(`/api/manga/${id}/remove-ocr`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'OCR data removed',
          description: data.message
        })
      } else {
        throw new Error('Failed to remove OCR data')
      }
    } catch (error) {
      console.error('Error removing OCR data:', error)
      toast({
        title: 'Failed to remove OCR data',
        description: 'There was an error removing the OCR data',
        variant: 'destructive'
      })
    } finally {
      setRemovingOcr(false)
    }
  }

  const handleSave = async () => {
    if (!metadata) return

    setSaving(true)
    try {
      // Only send updatable fields, exclude id and thumbnail
      const updateData: any = {
        title: metadata.title,
        type: metadata.type
      }

      // Only include optional fields if they have values
      if (metadata.number !== null && metadata.number !== undefined) {
        updateData.number = metadata.number
      }
      if (metadata.author) {
        updateData.author = metadata.author
      }
      if (metadata.description) {
        updateData.description = metadata.description
      }

      const response = await fetch(`/api/metadata/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        toast({
          title: 'Metadata saved',
          description: 'Your changes have been saved successfully'
        })
        navigate('/')
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'There was an error saving your changes',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleThumbnailUpload = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/metadata/${id}/thumbnail`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setMetadata(prev => prev ? { ...prev, thumbnail: data.thumbnail } : null)
        toast({
          title: 'Thumbnail updated',
          description: 'New thumbnail has been uploaded'
        })
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload thumbnail',
        variant: 'destructive'
      })
    }
  }

  if (loading || !metadata) {
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
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-accent-foreground">komu</h1>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-accent-foreground hover:bg-accent-foreground/10"
            >
              ← Back to Library
            </Button>
          </div>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Edit Metadata</h2>
          <p className="text-muted-foreground mt-2">
            Update information about your manga
          </p>
        </div>


        <div className="space-y-6">
          {/* Thumbnail */}
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              <div className="w-32 h-40 bg-muted rounded-lg overflow-hidden border">
                {metadata.thumbnail ? (
                  <img
                    src={metadata.thumbnail}
                    alt={metadata.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No thumbnail
                  </div>
                )}
              </div>
              <div className="mt-2">
                <Label htmlFor="thumbnail" className="cursor-pointer">
                  <div className="flex items-center space-x-2 text-sm p-2 border rounded hover:bg-accent">
                    <Upload className="h-4 w-4" />
                    <span>Change</span>
                  </div>
                  <input
                    id="thumbnail"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleThumbnailUpload(file)
                    }}
                  />
                </Label>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={metadata.title}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select 
                    value={metadata.type} 
                    onValueChange={(value: 'Volume' | 'Chapter') => 
                      setMetadata({ ...metadata, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Volume">Volume</SelectItem>
                      <SelectItem value="Chapter">Chapter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="number">Number</Label>
                  <Input
                    id="number"
                    type="number"
                    value={metadata.number || ''}
                    onChange={(e) => setMetadata({ 
                      ...metadata, 
                      number: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Suggestions Button */}
          <div>
            <Button 
              onClick={fetchSuggestions} 
              disabled={fetchingSuggestions}
              className="w-full"
              variant="outline"
            >
              {fetchingSuggestions ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Fetch from Web
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              AI will search the web and suggest metadata for the fields below
            </p>
          </div>

          <div>
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={metadata.author || ''}
              onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={metadata.description || ''}
              onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRemoveOcr} 
              disabled={removingOcr}
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              {removingOcr ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove OCR Data
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              Cancel
            </Button>
          </div>
        </div>

        {/* AI Suggestions - Positioned at bottom to avoid layout shift */}
        {showSuggestions && suggestions && (
          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-sm mb-2">AI Suggestions Available</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {suggestions.author && (
                    <div>
                      <span className="font-medium">Author:</span> {suggestions.author}
                    </div>
                  )}
                  {suggestions.description && (
                    <div>
                      <span className="font-medium">Description:</span> {suggestions.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
                <Button size="sm" onClick={applySuggestions}>
                  <Check className="h-4 w-4 mr-1" />
                  Apply
                </Button>
                <Button size="sm" variant="outline" onClick={dismissSuggestions}>
                  <X className="h-4 w-4 mr-1" />
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}