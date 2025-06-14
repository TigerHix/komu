import { useState, useCallback, useRef } from 'react'
import { TextBlock, Page, READER_CONSTANTS } from '@/constants/reader'

interface OcrPageStatus {
  ocrStatus: string
  textBlocks?: TextBlock[]
  imageSize?: { width: number; height: number }
}

export function useOcrService() {
  const [pageOcrStatus, setPageOcrStatus] = useState<Record<string, string>>({})
  const [singlePageData, setSinglePageData] = useState<{
    textBlocks: TextBlock[]
    showTextBlocks: boolean
    imageSize: { width: number; height: number } | null
  }>({
    textBlocks: [],
    showTextBlocks: false,
    imageSize: null
  })
  
  const [scrollPageData, setScrollPageData] = useState<{
    textBlocks: Record<number, TextBlock[]>
    imageSizes: Record<number, { width: number; height: number }>
  }>({
    textBlocks: {},
    imageSizes: {}
  })

  // Two-page mode data
  const [twoPageData, setTwoPageData] = useState<{
    textBlocks: Record<number, TextBlock[]>
    imageSizes: Record<number, { width: number; height: number } | null>
  }>({
    textBlocks: {},
    imageSizes: {}
  })

  const viewTimerRef = useRef<NodeJS.Timeout | null>(null)

  const notifyPageView = useCallback(async (pageId: string) => {
    try {
      await fetch(`/api/pages/${pageId}/view`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error notifying page view:', error)
    }
  }, [])

  const fetchOcrResults = useCallback(async (pageId: string): Promise<OcrPageStatus | null> => {
    try {
      const response = await fetch(`/api/pages/${pageId}/ocr/status`)
      if (!response.ok) return null

      const status = await response.json()
      
      setPageOcrStatus(prev => ({
        ...prev,
        [pageId]: status.ocrStatus
      }))

      if (status.ocrStatus === 'COMPLETED') {
        const resultsResponse = await fetch(`/api/pages/${pageId}/ocr/results`)
        if (resultsResponse.ok) {
          const data = await resultsResponse.json()
          return {
            ocrStatus: status.ocrStatus,
            textBlocks: data.textBlocks || [],
            imageSize: data.imageSize
          }
        }
      }
      
      return { ocrStatus: status.ocrStatus }
    } catch (error) {
      console.error('Error fetching OCR results:', error)
      return null
    }
  }, [])

  const checkSinglePageOcr = useCallback(async (pageId: string) => {
    const result = await fetchOcrResults(pageId)
    if (!result) return

    if (result.textBlocks && result.imageSize) {
      setSinglePageData({
        textBlocks: result.textBlocks,
        showTextBlocks: result.textBlocks.length > 0,
        imageSize: result.imageSize
      })
    }
  }, [fetchOcrResults])

  const checkScrollPageOcr = useCallback(async (pageNum: number, page: Page) => {
    const result = await fetchOcrResults(page.id)
    if (!result) return

    if (result.textBlocks && result.imageSize) {
      setScrollPageData(prev => ({
        textBlocks: {
          ...prev.textBlocks,
          [pageNum]: result.textBlocks!
        },
        imageSizes: {
          ...prev.imageSizes,
          [pageNum]: result.imageSize!
        }
      }))
    }
  }, [fetchOcrResults])

  const checkTwoPageOcr = useCallback(async (pageNum: number, page: Page) => {
    const result = await fetchOcrResults(page.id)
    if (!result) return

    if (result.textBlocks && result.imageSize) {
      setTwoPageData(prev => ({
        textBlocks: {
          ...prev.textBlocks,
          [pageNum]: result.textBlocks!
        },
        imageSizes: {
          ...prev.imageSizes,
          [pageNum]: result.imageSize!
        }
      }))
    }
  }, [fetchOcrResults])

  const startPageViewTracking = useCallback((pageId: string) => {
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current)
    }

    viewTimerRef.current = setTimeout(() => {
      notifyPageView(pageId)
    }, READER_CONSTANTS.PAGE_VIEW_DELAY)

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current)
      }
    }
  }, [notifyPageView])

  const resetSinglePageData = useCallback(() => {
    setSinglePageData({
      textBlocks: [],
      showTextBlocks: false,
      imageSize: null
    })
  }, [])

  const resetScrollData = useCallback(() => {
    setScrollPageData({
      textBlocks: {},
      imageSizes: {}
    })
  }, [])

  const resetScrollPageData = useCallback((pageNum: number) => {
    setScrollPageData(prev => {
      const newTextBlocks = { ...prev.textBlocks }
      const newImageSizes = { ...prev.imageSizes }
      delete newTextBlocks[pageNum]
      delete newImageSizes[pageNum]
      return {
        textBlocks: newTextBlocks,
        imageSizes: newImageSizes
      }
    })
  }, [])

  const resetTwoPageData = useCallback(() => {
    setTwoPageData({
      textBlocks: {},
      imageSizes: {}
    })
  }, [])

  const resetTwoPageDataPage = useCallback((pageNum: number) => {
    setTwoPageData(prev => {
      const newTextBlocks = { ...prev.textBlocks }
      const newImageSizes = { ...prev.imageSizes }
      delete newTextBlocks[pageNum]
      delete newImageSizes[pageNum]
      return {
        textBlocks: newTextBlocks,
        imageSizes: newImageSizes
      }
    })
  }, [])

  const resetAllOcrData = useCallback(() => {
    resetSinglePageData()
    resetScrollData()
    resetTwoPageData()
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current)
    }
  }, [resetSinglePageData, resetScrollData, resetTwoPageData])

  // Update a specific text block in the cached data
  const updateTextBlock = useCallback((textBlockId: string, newText: string, pageIndex?: number) => {
    console.log('OCR Service: updateTextBlock called', { textBlockId, newText, pageIndex })
    
    // Update in single page mode
    setSinglePageData(prev => {
      const updated = {
        ...prev,
        textBlocks: prev.textBlocks.map(block => 
          block.id === textBlockId ? { ...block, text: newText } : block
        )
      }
      console.log('OCR Service: Updated single page data', updated.textBlocks)
      return updated
    })

    // Update in scrolling mode if pageIndex is provided
    if (pageIndex !== undefined) {
      setScrollPageData(prev => {
        const updated = {
          ...prev,
          textBlocks: {
            ...prev.textBlocks,
            [pageIndex]: (prev.textBlocks[pageIndex] || []).map(block =>
              block.id === textBlockId ? { ...block, text: newText } : block
            )
          }
        }
        console.log('OCR Service: Updated scroll page data', updated.textBlocks[pageIndex])
        return updated
      })
      
      // Also update in two-page mode
      setTwoPageData(prev => {
        const updated = {
          ...prev,
          textBlocks: {
            ...prev.textBlocks,
            [pageIndex]: (prev.textBlocks[pageIndex] || []).map(block =>
              block.id === textBlockId ? { ...block, text: newText } : block
            )
          }
        }
        console.log('OCR Service: Updated two-page data', updated.textBlocks[pageIndex])
        return updated
      })
    }
  }, [])

  return {
    // Status tracking
    pageOcrStatus,
    
    // Single page mode
    singlePageTextBlocks: singlePageData.textBlocks,
    showTextBlocks: singlePageData.showTextBlocks,
    singlePageImageSize: singlePageData.imageSize,
    
    // Scrolling mode
    scrollTextBlocks: scrollPageData.textBlocks,
    scrollImageSizes: scrollPageData.imageSizes,
    
    // Two-page mode
    twoPageTextBlocks: twoPageData.textBlocks,
    twoPageImageSizes: twoPageData.imageSizes,
    
    // Actions
    checkSinglePageOcr,
    checkScrollPageOcr,
    checkTwoPageOcr,
    startPageViewTracking,
    resetSinglePageData,
    resetScrollData,
    resetScrollPageData,
    resetTwoPageData,
    resetTwoPageDataPage,
    resetAllOcrData,
    updateTextBlock,
  }
}