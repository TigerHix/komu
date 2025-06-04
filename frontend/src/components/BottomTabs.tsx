import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, Link } from 'react-router-dom'
import { Book, Download, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'

interface TabItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
}

const tabs: TabItem[] = [
  {
    id: 'library',
    label: 'Library',
    icon: <Book className="h-5 w-5" />,
    path: '/'
  },
  {
    id: 'import',
    label: 'Import',
    icon: <Download className="h-5 w-5" />,
    path: '/import'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    path: '/settings'
  }
]

interface BottomTabsProps {
  isHidden?: boolean
}

export function BottomTabs({ isHidden = false }: BottomTabsProps) {
  const location = useLocation()
  const [shouldShow, setShouldShow] = useState(true)
  
  useEffect(() => {
    // Don't show tabs on reader pages or when explicitly hidden
    if (location.pathname.startsWith('/reader/') || isHidden) {
      setShouldShow(false)
    } else {
      setShouldShow(true)
    }
  }, [location.pathname, isHidden])

  // Check for cover transition animations and hide tabs
  useEffect(() => {
    const checkForTransition = () => {
      // Look for the cover transition overlay in the DOM
      const transitionElement = document.querySelector('[class*="fixed"][class*="inset-0"][class*="z-50"][class*="bg-black"]')
      if (transitionElement && !location.pathname.startsWith('/reader/')) {
        setShouldShow(false)
      } else if (!location.pathname.startsWith('/reader/') && !isHidden) {
        setShouldShow(true)
      }
    }

    // Check periodically for transitions
    const interval = setInterval(checkForTransition, 100)
    
    return () => clearInterval(interval)
  }, [location.pathname, isHidden])

  const getActiveTab = () => {
    if (location.pathname === '/') return 'library'
    if (location.pathname === '/import' || location.pathname === '/upload') return 'import'
    if (location.pathname === '/settings') return 'settings'
    return 'library'
  }

  const activeTab = getActiveTab()

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-surface-1/95 backdrop-blur-xl border-t border-border/30 pwa-safe-bottom"
        >
      <div className="flex items-center justify-around px-4 py-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          
          return (
            <Link
              key={tab.id}
              to={tab.path}
              className="relative flex flex-col items-center justify-center py-2 px-4 min-w-0 flex-1"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center justify-center space-y-1"
              >
                <motion.div
                  animate={{
                    color: isActive ? 'hsl(var(--accent))' : 'hsl(var(--text-secondary))',
                    scale: isActive ? 1.1 : 1
                  }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  {tab.icon}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -inset-1 bg-accent/10 rounded-full -z-10"
                      initial={false}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    />
                  )}
                </motion.div>
                <motion.span
                  animate={{
                    color: isActive ? 'hsl(var(--accent))' : 'hsl(var(--text-secondary))',
                    fontWeight: isActive ? 600 : 400
                  }}
                  transition={{ duration: 0.2 }}
                  className="apple-caption-2 text-center"
                >
                  {tab.label}
                </motion.span>
              </motion.div>
            </Link>
          )
        })}
        </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}