import { useState, useCallback, useEffect } from 'react'

export interface UseWordSelectionReturn {
  // Single word selection
  selectedTokenIndex: number | null
  setSelectedTokenIndex: (index: number | null) => void
  
  // Multi-word selection
  selectionStart: number | null
  selectionEnd: number | null
  isDragging: boolean
  dragStartIndex: number | null
  
  // Selection handlers
  handlePointerDown: (index: number) => void
  handlePointerMove: (index: number) => void
  handlePointerUp: (index: number) => void
  clearSelection: () => void
  
  // Utility methods
  hasSelection: () => boolean
  getSelectionType: () => 'single' | 'multi' | 'none'
}

export function useWordSelection(): UseWordSelectionReturn {
  // Single word selection state
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null)
  
  // Multi-word selection state
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null)

  // Mouse/touch selection handlers
  const handlePointerDown = useCallback((index: number) => {
    setDragStartIndex(index)
    setIsDragging(false) // Not dragging yet, just pressed
  }, [])

  const handlePointerMove = useCallback((index: number) => {
    if (dragStartIndex !== null && dragStartIndex !== index) {
      // Started dragging to a different word
      setIsDragging(true)
      setSelectionStart(Math.min(dragStartIndex, index))
      setSelectionEnd(Math.max(dragStartIndex, index))
      setSelectedTokenIndex(null) // Clear single word selection
    }
  }, [dragStartIndex])

  const handlePointerUp = useCallback((index: number) => {
    if (isDragging) {
      // Finished dragging - keep multi-selection
      // Selection is already set in handlePointerMove
    } else if (dragStartIndex === index) {
      // Simple click/tap on same word
      if (selectionStart !== null || selectionEnd !== null) {
        // Clear existing multi-selection and select this word
        setSelectionStart(null)
        setSelectionEnd(null)
        setSelectedTokenIndex(index)
      } else if (selectedTokenIndex === index) {
        // Clicking the same selected word - deselect it
        setSelectedTokenIndex(null)
      } else {
        // Select this word
        setSelectedTokenIndex(index)
      }
    }
    
    // Reset drag state
    setDragStartIndex(null)
    setIsDragging(false)
  }, [isDragging, dragStartIndex, selectionStart, selectionEnd, selectedTokenIndex])

  const clearSelection = useCallback(() => {
    setSelectionStart(null)
    setSelectionEnd(null)
    setSelectedTokenIndex(null)
    setIsDragging(false)
    setDragStartIndex(null)
  }, [])

  // Utility methods
  const hasSelection = useCallback(() => {
    return selectedTokenIndex !== null || 
           (selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd)
  }, [selectedTokenIndex, selectionStart, selectionEnd])

  const getSelectionType = useCallback((): 'single' | 'multi' | 'none' => {
    if (selectedTokenIndex !== null) return 'single'
    if (selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd) return 'multi'
    return 'none'
  }, [selectedTokenIndex, selectionStart, selectionEnd])

  // Add global mouse up event listener to reset drag state
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setDragStartIndex(null)
      setIsDragging(false)
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [])

  return {
    selectedTokenIndex,
    setSelectedTokenIndex,
    selectionStart,
    selectionEnd,
    isDragging,
    dragStartIndex,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    clearSelection,
    hasSelection,
    getSelectionType
  }
}