import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeConfig = {
  sm: {
    container: 'w-11 h-6',
    circle: 'h-5 w-5',
    translate: 'translate-x-5'
  },
  md: {
    container: 'w-12 h-7',
    circle: 'h-6 w-6',
    translate: 'translate-x-5'
  },
  lg: {
    container: 'w-14 h-8',
    circle: 'h-7 w-7',
    translate: 'translate-x-6'
  }
}

export function Toggle({ enabled, onChange, className, size = 'md' }: ToggleProps) {
  const config = sizeConfig[size]
  
  return (
    <motion.button
      className={cn(
        'relative inline-flex items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent',
        config.container,
        enabled ? 'bg-accent' : 'bg-surface-3',
        className
      )}
      onClick={() => onChange(!enabled)}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <motion.span
        className={cn(
          'pointer-events-none inline-block rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-300',
          config.circle
        )}
        animate={{
          x: enabled ? (size === 'lg' ? 24 : 20) : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30
        }}
      />
    </motion.button>
  )
}