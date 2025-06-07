import { prisma } from './db'

export async function checkAndCleanIncompleteOcrData() {
  console.log('🔍 Checking OCR data and recovering from any issues...')
  
  try {
    let totalReset = 0

    // 1. Find pages stuck in PROCESSING (likely from server crash)
    const stuckProcessingPages = await prisma.page.findMany({
      where: { ocrStatus: 'PROCESSING' }
    })

    if (stuckProcessingPages.length > 0) {
      console.log(`⚠️  Found ${stuckProcessingPages.length} pages stuck in PROCESSING state`)
      
      await prisma.page.updateMany({
        where: { ocrStatus: 'PROCESSING' },
        data: {
          ocrStatus: 'PENDING',
          ocrStartedAt: null,
          ocrCompletedAt: null
        }
      })
      
      totalReset += stuckProcessingPages.length
      console.log(`   Reset ${stuckProcessingPages.length} stuck PROCESSING pages to PENDING`)
    }

    // 2. Auto-retry all FAILED pages (reset to PENDING)
    const failedPages = await prisma.page.findMany({
      where: { ocrStatus: 'FAILED' }
    })

    if (failedPages.length > 0) {
      console.log(`🔄 Auto-retrying ${failedPages.length} FAILED pages`)
      
      // Clear text blocks for failed pages
      await prisma.textBlock.deleteMany({
        where: { 
          pageId: { 
            in: failedPages.map(p => p.id) 
          } 
        }
      })

      // Reset failed pages to pending
      await prisma.page.updateMany({
        where: { ocrStatus: 'FAILED' },
        data: {
          ocrStatus: 'PENDING',
          ocrStartedAt: null,
          ocrCompletedAt: null
        }
      })

      totalReset += failedPages.length
      console.log(`   Reset ${failedPages.length} FAILED pages to PENDING for retry`)
    }

    // 3. Find pages that are marked as COMPLETED but missing image dimensions
    const incompletePages = await prisma.page.findMany({
      where: {
        ocrStatus: 'COMPLETED',
        OR: [
          { imageWidth: null },
          { imageHeight: null }
        ]
      },
      include: {
        textBlocks: true
      }
    })

    if (incompletePages.length > 0) {
      console.log(`⚠️  Found ${incompletePages.length} pages with incomplete OCR data`)
      
      for (const page of incompletePages) {
        console.log(`   Resetting OCR data for page ${page.id} (${page.imagePath})`)
        
        // Delete existing text blocks
        await prisma.textBlock.deleteMany({
          where: { pageId: page.id }
        })
        
        // Reset page OCR status to PENDING
        await prisma.page.update({
          where: { id: page.id },
          data: {
            ocrStatus: 'PENDING',
            ocrStartedAt: null,
            ocrCompletedAt: null,
            imageWidth: null,
            imageHeight: null
          }
        })
      }
      
      totalReset += incompletePages.length
      console.log(`   Reset ${incompletePages.length} incomplete COMPLETED pages to PENDING`)
    }

    // 4. Summary and queue all pending pages
    const totalPendingPages = await prisma.page.count({
      where: { ocrStatus: 'PENDING' }
    })

    if (totalReset > 0) {
      console.log(`✅ Reset ${totalReset} pages total - they will be re-processed`)
    }
    
    if (totalPendingPages > 0) {
      console.log(`📝 Found ${totalPendingPages} total PENDING pages ready for OCR processing`)
    } else {
      console.log('✅ No pending OCR work found')
    }

    return totalPendingPages
    
  } catch (error) {
    console.error('❌ Error during OCR startup check:', error)
    return 0
  }
}