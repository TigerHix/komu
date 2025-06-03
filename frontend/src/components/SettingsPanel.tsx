import { Button } from '@/components/ui/button'
import { Monitor, BookOpen, Scroll } from 'lucide-react'

interface SettingsPanelProps {
  readingMode: 'rtl' | 'ltr' | 'scrolling'
  showSettings: boolean
  onReadingModeChange: (mode: 'rtl' | 'ltr' | 'scrolling') => void
}

export function SettingsPanel({
  readingMode,
  showSettings,
  onReadingModeChange
}: SettingsPanelProps) {
  if (!showSettings) return null

  return (
    <div className="absolute top-16 right-4 z-20 bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-white/20">
      <div className="text-white space-y-3">
        <h3 className="font-medium mb-3">Reading Mode</h3>
        <div className="space-y-2">
          <Button
            variant={readingMode === 'rtl' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onReadingModeChange('rtl')}
            className="w-full justify-start text-white hover:bg-white/20"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Right to Left (RTL)
          </Button>
          <Button
            variant={readingMode === 'ltr' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onReadingModeChange('ltr')}
            className="w-full justify-start text-white hover:bg-white/20"
          >
            <Monitor className="h-4 w-4 mr-2" />
            Left to Right (LTR)
          </Button>
          <Button
            variant={readingMode === 'scrolling' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onReadingModeChange('scrolling')}
            className="w-full justify-start text-white hover:bg-white/20"
          >
            <Scroll className="h-4 w-4 mr-2" />
            Continuous Scrolling
          </Button>
        </div>
      </div>
    </div>
  )
}