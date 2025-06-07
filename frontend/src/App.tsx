import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { BottomTabs } from '@/components/BottomTabs'
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
  
  // Initialize dark mode at app level
  const { isDarkMode } = useDarkMode()

  // Reset scroll position when route changes (only for reader pages that need it)
  useEffect(() => {
    const shouldResetScroll = !location.pathname.startsWith('/reader/')
    
    if (shouldResetScroll) {
      // Only reset scroll for pages that specifically need it (like upload flow)
      const needsScrollReset = location.pathname.includes('/upload') || 
                               location.pathname.includes('/organize') ||
                               location.pathname.includes('/metadata/')
      
      if (needsScrollReset) {
        window.scrollTo(0, 0)
      }
    }
  }, [location.pathname])

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
      <Toaster position="top-center" richColors theme={isDarkMode ? 'dark' : 'light'} />
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