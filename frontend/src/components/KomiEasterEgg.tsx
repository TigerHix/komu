import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDarkMode } from '@/hooks/useDarkMode'

interface KomiEasterEggProps {
  isVisible: boolean
  onClose: () => void
}

export default function KomiEasterEgg({ isVisible, onClose }: KomiEasterEggProps) {
  const { t } = useTranslation()
  const { isDarkMode } = useDarkMode()
  const [dialogueStep, setDialogueStep] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showContinueIndicator, setShowContinueIndicator] = useState(false)

  const dialogues = t('settings.easterEgg.dialogue', { returnObjects: true }) as string[]

  const handleScreenClick = () => {
    if (isTyping) {
      // Complete the current dialogue immediately
      setDisplayedText(dialogues[dialogueStep])
      setIsTyping(false)
      setShowContinueIndicator(true)
    } else if (dialogueStep < dialogues.length - 1) {
      // Move to next dialogue
      setDialogueStep(dialogueStep + 1)
      setDisplayedText('')
      setIsTyping(true)
      setShowContinueIndicator(false)
    } else {
      // Close easter egg
      onClose()
    }
  }

  const handleDialogueClick = () => {
    handleScreenClick()
  }

  // Reset state when easter egg becomes visible
  useEffect(() => {
    if (isVisible) {
      setDialogueStep(0)
      setDisplayedText('')
      setIsTyping(true)
      setShowContinueIndicator(false)
    }
  }, [isVisible])

  // Typewriter effect
  useEffect(() => {
    if (!isVisible || !isTyping) return

    const currentDialogue = dialogues[dialogueStep]
    let currentIndex = 0

    const typeInterval = setInterval(() => {
      if (currentIndex < currentDialogue.length) {
        setDisplayedText(currentDialogue.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        setIsTyping(false)
        setShowContinueIndicator(true)
        clearInterval(typeInterval)
      }
    }, 50) // 50ms per character for natural typing speed

    return () => clearInterval(typeInterval)
  }, [dialogueStep, isVisible, isTyping])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed inset-0 z-[9999]"
          style={{ touchAction: 'none' }} // Prevent scrolling
        >
          {/* Fixed Backdrop Blur - now animates properly with parent */}
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(8px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(32px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(8px)' }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0"
          />

          {/* Komi-chan Full Body Portrait */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 100 }}
            transition={{ 
              delay: 0.2,
              duration: 0.8,
              type: "spring", 
              stiffness: 300, 
              damping: 25 
            }}
            className="absolute inset-0 flex items-end justify-center py-12" // Reduced bottom padding
          >
            <motion.img
              src="/komi.png"
              alt="Komi-chan"
              className="h-full w-auto object-cover drop-shadow-2xl cursor-pointer"
              onClick={handleScreenClick}
              animate={{ 
                y: [0, -12, 0],
                filter: ["drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))", "drop-shadow(0 35px 35px rgb(0 0 0 / 0.25))", "drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))"]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>

          {/* Visual Novel Dialogue Box */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ 
              delay: 0.4,
              duration: 0.6,
              type: "spring", 
              stiffness: 400, 
              damping: 30 
            }}
            className="absolute left-0 right-0 p-4"
            style={{ 
              bottom: 'max(12px, env(safe-area-inset-bottom))'
            }}
          >
            <motion.div
              className={`
                ${isDarkMode 
                  ? 'bg-black/85 text-white' 
                  : 'bg-white/95 text-gray-800'
                } 
                backdrop-blur-xl rounded-3xl mx-auto max-w-4xl select-none cursor-pointer
              `}
              style={{ 
                pointerEvents: 'auto',
                boxShadow: isDarkMode 
                  ? '0 -10px 40px rgb(0 0 0 / 0.3), 0 0 0 1px rgb(255 255 255 / 0.1), inset 0 1px 0 rgb(255 255 255 / 0.1)' 
                  : '0 -10px 40px rgb(0 0 0 / 0.1), 0 0 0 1px rgb(0 0 0 / 0.05), inset 0 1px 0 rgb(255 255 255 / 0.5)'
              }}
              onClick={handleDialogueClick}
              // Fixed elastic button animations - simple and smooth
              whileHover={{ 
                scale: 1.03,
                transition: { 
                  type: "spring",
                  stiffness: 400,
                  damping: 25
                }
              }}
              whileTap={{ 
                scale: 0.97,
                transition: { 
                  type: "spring",
                  stiffness: 600,
                  damping: 30
                }
              }}
            >
              <div className="p-8 md:p-12 relative">
                {/* Dialogue Text */}
                <motion.div 
                  className={`
                    ${isDarkMode ? 'text-white' : 'text-gray-800'} 
                    text-xl md:text-2xl leading-relaxed font-medium tracking-wide text-left
                  `}
                  style={{ fontFamily: "'SF Pro Display', system-ui, sans-serif" }}
                >
                  {displayedText}
                  {isTyping && (
                    <motion.span
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className={`
                        inline-block w-1 h-6 ml-1
                        ${isDarkMode ? 'bg-white/80' : 'bg-gray-800/80'}
                      `}
                    />
                  )}
                </motion.div>

                {/* Continue Indicator Triangle */}
                <AnimatePresence>
                  {showContinueIndicator && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute top-1/2 right-8 flex items-center justify-center"
                      style={{ transform: 'translateY(-50%)' }}
                    >
                      <motion.div
                        animate={{ 
                          y: [0, -8, 0],
                          opacity: [0.6, 1, 0.6]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className={`
                          w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px]
                          ${isDarkMode ? 'border-t-white/80' : 'border-t-gray-800/80'}
                        `}
                        style={{ transform: "rotate(180deg)" }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}