import { ocrQueue, OcrProgress } from './ocr-queue'

export class WebSocketManager {
  private clients = new Set<any>()

  initialize() {
    // Listen to OCR queue progress updates
    ocrQueue.on('progress', (progress: OcrProgress) => {
      this.broadcast({
        type: 'ocr-progress',
        data: progress
      })
    })
  }

  addClient(ws: any) {
    console.log('WebSocket client connected')
    this.clients.add(ws)

    // Send current progress immediately
    const progress = ocrQueue.getProgress()
    this.sendToClient(ws, {
      type: 'ocr-progress',
      data: progress
    })
  }

  removeClient(ws: any) {
    console.log('WebSocket client disconnected')
    this.clients.delete(ws)
  }

  handleMessage(ws: any, message: any) {
    switch (message.type) {
      case 'pause-ocr':
        ocrQueue.pause()
        break
      case 'resume-ocr':
        ocrQueue.resume()
        break
      case 'prioritize-page':
        if (message.pageId) {
          ocrQueue.setPriority(message.pageId)
        }
        break
      case 'get-progress':
        const progress = ocrQueue.getProgress()
        this.sendToClient(ws, {
          type: 'ocr-progress',
          data: progress
        })
        break
    }
  }

  private sendToClient(ws: any, message: any) {
    try {
      ws.send(JSON.stringify(message))
    } catch (error) {
      console.error('Error sending WebSocket message:', error)
      this.clients.delete(ws)
    }
  }

  private broadcast(message: any) {
    const messageStr = JSON.stringify(message)
    const clientsToRemove: any[] = []
    
    this.clients.forEach(ws => {
      try {
        ws.send(messageStr)
      } catch (error) {
        console.error('Error broadcasting to client:', error)
        clientsToRemove.push(ws)
      }
    })

    // Clean up failed connections
    clientsToRemove.forEach(ws => this.clients.delete(ws))
  }

  broadcastPageUpdate(pageId: string, status: string) {
    this.broadcast({
      type: 'page-status-update',
      data: { pageId, status }
    })
  }

  broadcastQueueComplete(stats: { totalPages: number, completedPages: number, failedPages: number }) {
    this.broadcast({
      type: 'ocr-queue-complete',
      data: stats
    })
  }
}

export const wsManager = new WebSocketManager()