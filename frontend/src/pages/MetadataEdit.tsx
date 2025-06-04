import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Upload, Check, X, Sparkles, Trash2, ChevronLeft, User, FileText, Image as ImageIcon, Bot } from 'lucide-react'

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
      const updateData: any = {
        title: metadata.title,
        type: metadata.type
      }

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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 border-4 border-accent border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen bg-background pb-20"
    >
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4 -ml-2 apple-body text-text-secondary hover:text-text-primary"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Library
          </Button>
          <h1 className="apple-title-2 text-text-primary font-bold mb-2">Edit Metadata</h1>
          <p className="apple-body text-text-secondary">
            Update information about your manga
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Cover and Basic Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-accent/10 rounded-xl">
                    <ImageIcon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle>Cover & Basic Information</CardTitle>
                    <CardDescription>Thumbnail and core manga details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-6">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-40 bg-surface-2 rounded-2xl overflow-hidden border border-border/50 shadow-sm">
                      {metadata.thumbnail ? (
                        <img
                          src={metadata.thumbnail}
                          alt={metadata.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-tertiary">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    
                    <Label htmlFor="thumbnail" className="cursor-pointer mt-3 block">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full apple-caption-1 font-medium border-border/50 hover:border-border"
                        asChild
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <Upload className="h-4 w-4" />
                          <span>Change Cover</span>
                        </div>
                      </Button>
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

                  {/* Basic Info */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label htmlFor="title" className="apple-callout font-medium text-text-primary mb-2 block">
                        Title
                      </Label>
                      <Input
                        id="title"
                        value={metadata.title}
                        onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                        className="apple-body bg-surface-2 border-border/50 focus:border-accent text-text-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type" className="apple-callout font-medium text-text-primary mb-2 block">
                          Type
                        </Label>
                        <Select 
                          value={metadata.type} 
                          onValueChange={(value: 'Volume' | 'Chapter') => 
                            setMetadata({ ...metadata, type: value })
                          }
                        >
                          <SelectTrigger className="apple-body bg-surface-2 border-border/50 focus:border-accent">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Volume">Volume</SelectItem>
                            <SelectItem value="Chapter">Chapter</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="number" className="apple-callout font-medium text-text-primary mb-2 block">
                          Number
                        </Label>
                        <Input
                          id="number"
                          type="number"
                          value={metadata.number || ''}
                          onChange={(e) => setMetadata({ 
                            ...metadata, 
                            number: e.target.value ? parseInt(e.target.value) : undefined 
                          })}
                          className="apple-body bg-surface-2 border-border/50 focus:border-accent text-text-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Author Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-accent/10 rounded-xl">
                    <User className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle>Author Information</CardTitle>
                    <CardDescription>Creator and attribution details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="author" className="apple-callout font-medium text-text-primary mb-2 block">
                    Author
                  </Label>
                  <Input
                    id="author"
                    value={metadata.author || ''}
                    onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                    placeholder="Enter author name"
                    className="apple-body bg-surface-2 border-border/50 focus:border-accent text-text-primary placeholder:text-text-tertiary"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-accent/10 rounded-xl">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle>Description</CardTitle>
                    <CardDescription>Summary and synopsis</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="description" className="apple-callout font-medium text-text-primary mb-2 block">
                    Synopsis
                  </Label>
                  <Textarea
                    id="description"
                    value={metadata.description || ''}
                    onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                    placeholder="Enter description or synopsis"
                    rows={4}
                    className="apple-body bg-surface-2 border-border/50 focus:border-accent text-text-primary placeholder:text-text-tertiary resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-accent/10 rounded-xl">
                    <Bot className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle>AI Assistant</CardTitle>
                    <CardDescription>Get metadata suggestions from the web</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={fetchSuggestions} 
                  disabled={fetchingSuggestions}
                  className="w-full apple-body font-medium bg-accent hover:bg-accent/90 text-accent-foreground"
                  variant={fetchingSuggestions ? "outline" : "default"}
                >
                  {fetchingSuggestions ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"
                      />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Fetch from Web
                    </>
                  )}
                </Button>
                <p className="apple-caption-1 text-text-secondary mt-2">
                  AI will search the web and suggest metadata for the fields above
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Suggestions Display */}
          {showSuggestions && suggestions && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="bg-accent/5 border border-accent/20 rounded-2xl p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="apple-callout font-semibold text-text-primary mb-3 flex items-center">
                    <Sparkles className="h-4 w-4 mr-2 text-accent" />
                    AI Suggestions Available
                  </h3>
                  <div className="space-y-3 apple-footnote text-text-secondary">
                    {suggestions.author && (
                      <div className="bg-surface-1 rounded-xl p-3">
                        <span className="font-medium text-text-primary">Author:</span> {suggestions.author}
                      </div>
                    )}
                    {suggestions.description && (
                      <div className="bg-surface-1 rounded-xl p-3">
                        <span className="font-medium text-text-primary">Description:</span> {suggestions.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button size="sm" onClick={applySuggestions} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Check className="h-4 w-4 mr-1" />
                    Apply
                  </Button>
                  <Button size="sm" variant="outline" onClick={dismissSuggestions} className="border-border/50">
                    <X className="h-4 w-4 mr-1" />
                    Dismiss
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col space-y-3 pt-4"
          >
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full apple-body font-medium bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm"
            >
              {saving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"
                  />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={handleRemoveOcr} 
                disabled={removingOcr}
                className="flex-1 apple-body font-medium text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/30"
              >
                {removingOcr ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"
                    />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove OCR Data
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="flex-1 apple-body font-medium border-border/50 hover:border-border"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}