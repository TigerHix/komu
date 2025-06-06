import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Moon, Sun, Palette, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import KomiEasterEgg from '@/components/KomiEasterEgg'

export default function Settings() {
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const { t, i18n } = useTranslation()
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en')
  const [showKomiEasterEgg, setShowKomiEasterEgg] = useState(false)

  useEffect(() => {
    const updateLanguage = () => setCurrentLanguage(i18n.language || 'en')
    i18n.on('languageChanged', updateLanguage)
    updateLanguage()
    return () => i18n.off('languageChanged', updateLanguage)
  }, [i18n])

  const getLanguageDisplayName = (lang: string) => 
    lang === 'zh' ? t('settings.language.chinese') : t('settings.language.english')

  const handleIconClick = () => {
    setShowKomiEasterEgg(true)
  }

  const handleEasterEggClose = () => {
    setShowKomiEasterEgg(false)
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen bg-background pb-20"
    >
      <div className="max-w-2xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="apple-title-2 text-text-primary font-bold mb-2">{t('settings.title')}</h1>
          <p className="apple-body text-text-secondary">
            {t('settings.subtitle')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Appearance Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/10 rounded-xl">
                  <Palette className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle>{t('settings.appearance.title')}</CardTitle>
                  <CardDescription>{t('settings.appearance.description')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-surface-3 rounded-xl">
                      {isDarkMode ? (
                        <Moon className="h-4 w-4 text-text-primary" />
                      ) : (
                        <Sun className="h-4 w-4 text-text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="apple-callout font-medium text-text-primary">
                        {t('settings.appearance.darkMode')}
                      </h3>
                      <p className="apple-caption-1 text-text-secondary">
                        {isDarkMode ? t('settings.appearance.darkModeEnabled') : t('settings.appearance.lightModeEnabled')}
                      </p>
                    </div>
                  </div>
                  
                  <Toggle
                    enabled={isDarkMode}
                    onChange={toggleDarkMode}
                    size="md"
                  />
                </div>

                {/* Language Selection */}
                <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-surface-3 rounded-xl">
                      <Languages className="h-4 w-4 text-text-primary" />
                    </div>
                    <div>
                      <h3 className="apple-callout font-medium text-text-primary">
                        {t('settings.language.title')}
                      </h3>
                      <p className="apple-caption-1 text-text-secondary">
                        {t('settings.language.description')}
                      </p>
                    </div>
                  </div>
                  
                  <Select value={currentLanguage} onValueChange={i18n.changeLanguage}>
                    <SelectTrigger className="w-32">
                      <SelectValue>{getLanguageDisplayName(currentLanguage)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t('settings.language.english')}</SelectItem>
                      <SelectItem value="zh">{t('settings.language.chinese')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.about.title')}</CardTitle>
                <CardDescription>{t('settings.about.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-surface-2 rounded-2xl p-4">
                    <div className="text-center space-y-2">
                      <motion.button
                        onClick={handleIconClick}
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto overflow-hidden"
                        whileHover={{ 
                          scale: 1.05,
                          transition: { type: "spring", stiffness: 400, damping: 25 }
                        }}
                        whileTap={{ 
                          scale: 0.95,
                          transition: { type: "spring", stiffness: 500, damping: 30 }
                        }}
                      >
                        <img 
                          src="/icon-512.png" 
                          alt="Komu icon" 
                          className="w-full h-full object-cover rounded-2xl select-none pointer-events-none"
                          style={{ WebkitTouchCallout: 'none' }}
                        />
                      </motion.button>
                      <h3 className="apple-headline font-semibold text-text-primary">komu</h3>
                      <p className="apple-footnote text-text-secondary">
                        {t('settings.about.version')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 apple-footnote text-text-secondary">
                    <p>
                      {t('settings.about.aboutText1')}
                    </p>
                    <p>
                      {t('settings.about.aboutText2')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>

      {/* Komi-chan Visual Novel Easter Egg */}
      <KomiEasterEgg 
        isVisible={showKomiEasterEgg} 
        onClose={handleEasterEggClose} 
      />
    </motion.div>
  )
}