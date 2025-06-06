import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('darkMode')
      if (stored !== null) {
        return JSON.parse(stored)
      }
      // Default to system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    const root = document.documentElement
    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    
    if (isDarkMode) {
      root.classList.add('dark')
      root.classList.remove('light')
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#0f0f11')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#fafafa')
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
  }, [isDarkMode])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  return { isDarkMode, toggleDarkMode }
}