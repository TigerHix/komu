import { promises as fs } from 'fs'
import path from 'path'
const { Poppler } = require("node-poppler");

export async function processPdf(pdfPath: string, mangaId: string): Promise<string[]> {
  const outputDir = path.join('uploads', mangaId)
  await fs.mkdir(outputDir, { recursive: true })

  const poppler = new Poppler()
  
  // Use pdftoppm to convert PDF to JPG images with original dimensions
  const outputPrefix = path.join(outputDir, 'page')
  
  await poppler.pdfToPpm(pdfPath, outputPrefix, {
    jpegFile: true
  })

  // Find all generated images and rename them to our format
  const files = await fs.readdir(outputDir)
  const imageFiles = files
    .filter(file => file.startsWith('page-') && file.endsWith('.jpg'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/page-(\d+)\.jpg$/)?.[1] || '0')
      const numB = parseInt(b.match(/page-(\d+)\.jpg$/)?.[1] || '0')
      return numA - numB
    })

  const imagePaths: string[] = []
  
  // Rename files to our expected format (page-1.jpg, page-2.jpg, etc.)
  for (let i = 0; i < imageFiles.length; i++) {
    const oldPath = path.join(outputDir, imageFiles[i])
    const newPath = path.join(outputDir, `page-${i + 1}.jpg`)
    
    if (oldPath !== newPath) {
      await fs.rename(oldPath, newPath)
    }
    
    imagePaths.push(newPath)
  }

  // Clean up original PDF
  await fs.unlink(pdfPath)
  
  return imagePaths
}