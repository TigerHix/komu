export const READER_CONSTANTS = {
  // Zoom constraints
  MIN_ZOOM: 1,
  MAX_ZOOM: 5,
  ZOOM_STEP: 0.5,
  ZOOM_WHEEL_SENSITIVITY: 0.005,
  DEFAULT_ZOOM: 2, // For double-click zoom

  // UI timing
  UI_HIDE_DELAY: 3000,
  PAGE_VIEW_DELAY: 1000,
  DOUBLE_TAP_THRESHOLD: 300,

  // Navigation areas (as fractions)
  CENTER_AREA_START: 1/3,
  CENTER_AREA_END: 2/3,
  
  // Scrolling
  SCROLL_STEP_RATIO: 0.8, // 80% of container height
  LOAD_BUFFER_RATIO: 1, // Load one screen ahead/behind
  PAGE_HEIGHT_ESTIMATE: 0.8, // Rough estimate for lazy loading

  // Text overlay styling
  TEXT_OVERLAY_OPACITY: 0.1,
  TEXT_OVERLAY_HOVER_OPACITY: 0.3,
  TOOLTIP_MAX_WIDTH: 400,
  TOOLTIP_MIN_WIDTH: 200,
  TOOLTIP_OFFSET: 2, // pixels
  TOOLTIP_TOP_THRESHOLD: 80, // When to show tooltip below vs above

  // Initial page load for scrolling
  INITIAL_PAGES_TO_LOAD: 3,
} as const

export type ReadingMode = 'rtl' | 'ltr' | 'scrolling'

export interface Page {
  id: string
  pageNum: number
  imagePath: string
  ocrStatus?: string
}

export interface Manga {
  id: string
  title: string
  type: string
  number?: number
  currentPage: number
  pages: Page[]
}

export interface TextBlock {
  id?: string
  bbox: [number, number, number, number]
  text: string
}

export interface Coordinates {
  x: number
  y: number
}

export interface Dimensions {
  width: number
  height: number
}

export interface BoundingBox {
  left: number
  top: number
  width: number
  height: number
}