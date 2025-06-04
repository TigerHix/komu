import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { OcrProgressNotification } from '@/components/OcrProgressNotification'
import { OcrCompleteNotification } from '@/components/OcrCompleteNotification'
import { BottomTabs } from '@/components/BottomTabs'
import { PageTransition } from '@/components/PageTransition'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useDarkMode } from '@/hooks/useDarkMode'
import Library from '@/pages/Library'
import Import from '@/pages/Import'
import Settings from '@/pages/Settings'
import Upload from '@/pages/Upload'
import OrganizePages from '@/pages/OrganizePages'
import MetadataEdit from '@/pages/MetadataEdit'
import Reader from '@/pages/Reader'
import './App.css'

function AppContent() {
  const location = useLocation()
  const [showOcrProgress, setShowOcrProgress] = useState(true)
  const { ocrProgress, queueComplete, pauseOcr, resumeOcr, clearQueueComplete } = useWebSocket(
    `ws://localhost:${import.meta.env.VITE_BACKEND_PORT || '3847'}/ws`
  )
  
  // Initialize dark mode at app level
  const { isDarkMode } = useDarkMode()

  // Only show OCR progress outside of reader page
  const isReaderPage = location.pathname.startsWith('/reader/')
  const shouldShowProgress = !isReaderPage && 
    showOcrProgress && 
    ocrProgress && 
    ocrProgress.isProcessing

  // Debug logging
  console.log('📱 App state:', {
    isReaderPage,
    showOcrProgress,
    ocrProgress,
    shouldShowProgress
  })

  const handleRetryFailed = async () => {
    try {
      const response = await fetch('/api/ocr/retry-failed', { method: 'POST' })
      if (!response.ok) {
        throw new Error('Failed to retry failed pages')
      }
      clearQueueComplete()
    } catch (error) {
      console.error('Error retrying failed pages:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/import" element={<Import />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/organize" element={<OrganizePages />} />
        <Route path="/metadata/:id" element={<MetadataEdit />} />
        <Route path="/reader/:id" element={<Reader />} />
        <Route path="/reader/:id/:page" element={<Reader />} />
      </Routes>
      <BottomTabs />
      <Toaster />
      
      {shouldShowProgress && (
        <OcrProgressNotification
          progress={ocrProgress}
          onPause={pauseOcr}
          onResume={resumeOcr}
          onDismiss={() => setShowOcrProgress(false)}
        />
      )}
      
      {queueComplete && (
        <OcrCompleteNotification
          completion={queueComplete}
          onRetryFailed={handleRetryFailed}
          onDismiss={clearQueueComplete}
        />
      )}
      
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App