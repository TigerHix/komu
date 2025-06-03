export interface MangaMetadata {
  title: string
  type: 'Volume' | 'Chapter'
  number?: number
  author?: string
  description?: string
  thumbnail?: string
}

export interface UploadResponse {
  id: string
  title: string
  thumbnail: string
}

export interface MetadataUpdateRequest {
  title?: string
  type?: 'Volume' | 'Chapter'
  number?: number
  author?: string
  description?: string
}