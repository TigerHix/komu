import { ReadingMode, Dimensions } from '@/constants/reader'

export interface ReaderOcrService {
  scrollImageSizes: Record<number, Dimensions>
  twoPageImageSizes: Record<number, Dimensions | null>
  singlePageImageSize: Dimensions | null
}

/**
 * Gets the correct image dimensions for a given page based on the current reading mode
 * 
 * @param pageIndex - The page index to get dimensions for (null uses currentPage)
 * @param readingMode - Current reading mode ('scrolling', 'rtl', 'ltr')
 * @param isTwoPageMode - Whether two-page spread is enabled
 * @param currentPage - Current page index (fallback when pageIndex is null)
 * @param ocrService - OCR service with cached image dimensions
 * @returns Image dimensions for the specified page
 */
export function getImageSizeForPage(
  pageIndex: number | null,
  readingMode: ReadingMode,
  isTwoPageMode: boolean,
  currentPage: number,
  ocrService: ReaderOcrService
): Dimensions {
  const defaultSize: Dimensions = { width: 800, height: 1200 }
  const targetPageIndex = pageIndex ?? currentPage

  if (readingMode === 'scrolling') {
    return ocrService.scrollImageSizes[targetPageIndex] || defaultSize
  } else if (isTwoPageMode) {
    return ocrService.twoPageImageSizes[targetPageIndex] || defaultSize
  } else {
    return ocrService.singlePageImageSize || defaultSize
  }
} 