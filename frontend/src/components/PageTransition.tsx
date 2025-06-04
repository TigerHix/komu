import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { ReactNode, useState } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  const [isInitialRender, setIsInitialRender] = useState(true)
  
  // Skip animation on initial page load
  useState(() => {
    const timer = setTimeout(() => setIsInitialRender(false), 100)
    return () => clearTimeout(timer)
  })
  
  // Different transitions for different routes
  const getTransitionConfig = () => {
    // Disable automatic transitions for reader - we handle this manually with cover transition
    if (location.pathname.startsWith('/reader/')) {
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
        transition: { duration: 0 }
      }
    }
    
    // Skip animation on initial render to prevent flash
    if (isInitialRender) {
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
        transition: { duration: 0 }
      }
    }
    
    // Smoother page transitions for navigation
    return {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -8 },
      transition: { 
        duration: 0.2, 
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  }

  const config = getTransitionConfig()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={config.initial}
        animate={config.animate}
        exit={config.exit}
        transition={config.transition}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Special transition component for manga cover enlargement
interface MangaCoverTransitionProps {
  coverImage?: string
  isOpen: boolean
  onComplete: () => void
  isReversed?: boolean
}

export function MangaCoverTransition({ coverImage, isOpen, onComplete, isReversed = false }: MangaCoverTransitionProps) {
  const [phase, setPhase] = useState<'enlarging' | 'holding' | 'transitioning'>('enlarging')
  
  if (!isOpen || !coverImage) return null

  const handleEnlargeComplete = () => {
    if (!isReversed) {
      setPhase('holding')
      // Hold for 0.5s then transition
      setTimeout(() => {
        setPhase('transitioning')
        setTimeout(onComplete, 300) // Time for fade transition
      }, 500)
    }
  }

  const handleReverseComplete = () => {
    if (isReversed) {
      onComplete()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      >
        <motion.img
          src={coverImage}
          alt={isReversed ? "Closing manga" : "Opening manga"}
          initial={isReversed ? { scale: 1.2, opacity: 0 } : { scale: 0.3, opacity: 0 }}
          animate={{
            scale: phase === 'enlarging' || phase === 'holding' ? 1 : (isReversed ? 0.3 : 1.2),
            opacity: phase === 'transitioning' ? 0 : 1
          }}
          transition={{
            duration: phase === 'enlarging' ? 0.6 : (phase === 'transitioning' ? 0.3 : 0),
            ease: [0.4, 0, 0.2, 1]
          }}
          onAnimationComplete={isReversed ? handleReverseComplete : handleEnlargeComplete}
          className="max-w-[80%] max-h-[80%] object-contain rounded-2xl shadow-2xl"
        />
        
        {/* Reader content with bounce-in effect */}
        {phase === 'transitioning' && !isReversed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.4,
              ease: [0.34, 1.56, 0.64, 1], // Bounce easing
              delay: 0.1
            }}
            className="absolute inset-0 bg-black"
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}