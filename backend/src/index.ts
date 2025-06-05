import 'dotenv/config'
import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import path from 'path'
import { uploadRoutes } from './routes/upload'
import { mangaRoutes } from './routes/manga'
import { metadataRoutes } from './routes/metadata'
import { ocrRoute } from './routes/ocr'
import { ocrManagementRoutes } from './routes/ocr-management'
import { ocrCompletionRoutes } from './routes/ocr-completion'
import { pagesRoutes } from './routes/pages'
import { tokenizeRoutes } from './routes/tokenize'
import { textBlocksRoutes } from './routes/text-blocks'
import { chatRoutes } from './routes/chat'
import { ocrQueue } from './lib/ocr-queue'
import { wsManager } from './lib/websocket'
import { checkAndCleanIncompleteOcrData } from './lib/startup-check'
import { ichiranService } from './lib/ichiran-service'

const app = new Elysia({
  serve: {
    maxRequestBodySize: 512 * 1024 * 1024 // 512MB
  }
})
  .use(cors({
    origin: [
      `http://localhost:${process.env.FRONTEND_PORT || '5847'}`,
      'http://localhost:5173', // Legacy frontend port for compatibility
      'http://localhost:5847'  // Default frontend port
    ],
    credentials: true
  }))
  .onRequest((ctx) => {
    console.log(`${ctx.request.method} ${ctx.request.url}`)
  })
  .use(staticPlugin({
    assets: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads'
  }))
  .use(uploadRoutes)
  .use(mangaRoutes)
  .use(metadataRoutes)
  .use(ocrRoute)
  .use(ocrManagementRoutes)
  .use(ocrCompletionRoutes)
  .use(pagesRoutes)
  .use(tokenizeRoutes)
  .use(textBlocksRoutes)
  .use(chatRoutes)
  .ws('/ws', {
    body: t.Object({
      type: t.String(),
      pageId: t.Optional(t.String())
    }),
    open(ws) {
      wsManager.addClient(ws)
    },
    message(ws, message) {
      wsManager.handleMessage(ws, message)
    },
    close(ws) {
      wsManager.removeClient(ws)
    }
  })
  .get('/', () => 'komu API')
  .listen(parseInt(process.env.BACKEND_PORT || '3847'), async () => {
    const port = process.env.BACKEND_PORT || '3847'
    
    // Check and clean incomplete OCR data (auto-retry failed pages)
    const pendingCount = await checkAndCleanIncompleteOcrData()
    
    // Initialize WebSocket manager
    wsManager.initialize()
    
    // Initialize OCR queue and start processing pending pages
    await ocrQueue.initialize()
    
    // Initialize ichiran service (async, don't block startup)
    console.log('🚀 Starting ichiran service initialization...')
    ichiranService.initialize().then(() => {
      console.log('✅ Ichiran service ready for tokenization requests')
    }).catch((error) => {
      console.error('❌ Failed to initialize ichiran service:', error)
      console.log('💡 Ichiran will be started on-demand when first tokenization request is made')
    })
    
    console.log(`🦊 Elysia is running at http://localhost:${port}`)
    console.log(`📡 WebSocket server initialized at ws://localhost:${port}/ws`)
    console.log(`🔍 OCR queue initialized`)
    console.log(`🗾 Ichiran tokenization service available at /api/tokenize`)
    
    if (pendingCount > 0) {
      console.log(`🚀 Started OCR processing for ${pendingCount} pending pages`)
    }
  })

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...')
  
  try {
    // Cleanup ichiran service
    await ichiranService.cleanup()
    console.log('✅ Ichiran service stopped')
  } catch (error) {
    console.error('❌ Error during ichiran cleanup:', error)
  }
  
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
  
  try {
    await ichiranService.cleanup()
    console.log('✅ Ichiran service stopped')
  } catch (error) {
    console.error('❌ Error during ichiran cleanup:', error)
  }
  
  process.exit(0)
})