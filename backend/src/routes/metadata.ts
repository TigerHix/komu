import { Elysia, t } from 'elysia'
import { prisma } from '../lib/db'
import { fetchMetadata } from '../lib/metadata-fetcher'
import { MetadataUpdateRequest } from '../types'

export const metadataRoutes = new Elysia({ prefix: '/api' })
  .get('/metadata/:id', async ({ params }) => {
    const manga = await prisma.manga.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        type: true,
        number: true,
        author: true,
        description: true,
        thumbnail: true
      }
    })
    
    if (!manga) {
      throw new Error('Manga not found')
    }
    
    return manga
  })
  
  .post('/metadata/:id/fetch', async ({ params }) => {
    console.log('🚀 /metadata/:id/fetch route called with id:', params.id)
    
    const manga = await prisma.manga.findUnique({
      where: { id: params.id },
      select: { title: true }
    })
    
    console.log('📚 Found manga:', manga)
    
    if (!manga) {
      console.log('❌ Manga not found for id:', params.id)
      throw new Error('Manga not found')
    }
    
    console.log('🔍 Fetching metadata for title:', manga.title)
    
    // Fetch metadata suggestions in background
    const suggestions = await fetchMetadata(manga.title)
    
    console.log('✅ Metadata fetch completed, returning suggestions:', suggestions)
    
    return suggestions
  })
  
  .put('/metadata/:id', async ({ params, body }) => {
    const updateData = body as MetadataUpdateRequest
    
    const manga = await prisma.manga.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        title: true,
        type: true,
        number: true,
        author: true,
        description: true,
        thumbnail: true
      }
    })
    
    return manga
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      type: t.Optional(t.Union([t.Literal('Volume'), t.Literal('Chapter')])),
      number: t.Optional(t.Number()),
      author: t.Optional(t.String()),
      description: t.Optional(t.String())
    })
  })
  
  .post('/metadata/:id/thumbnail', async ({ params, body }) => {
    const { file } = body as { file: File }
    
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Please upload an image file')
    }

    // Save thumbnail
    const thumbnailPath = `/uploads/${params.id}/thumbnail.jpg`
    const fullPath = `uploads/${params.id}/thumbnail.jpg`
    
    const arrayBuffer = await file.arrayBuffer()
    await Bun.write(fullPath, new Uint8Array(arrayBuffer))
    
    // Update manga thumbnail
    const manga = await prisma.manga.update({
      where: { id: params.id },
      data: { thumbnail: thumbnailPath }
    })
    
    return { thumbnail: manga.thumbnail }
  }, {
    body: t.Object({
      file: t.File()
    })
  })