import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Moon, Sun, Palette } from 'lucide-react'

export default function Settings() {
  const { isDarkMode, toggleDarkMode } = useDarkMode()

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
          <h1 className="apple-title-2 text-text-primary font-bold mb-2">Settings</h1>
          <p className="apple-body text-text-secondary">
            Customize your reading experience
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
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize how the app looks</CardDescription>
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
                        Dark Mode
                      </h3>
                      <p className="apple-caption-1 text-text-secondary">
                        {isDarkMode ? 'Dark theme is enabled' : 'Light theme is enabled'}
                      </p>
                    </div>
                  </div>
                  
                  <Toggle
                    enabled={isDarkMode}
                    onChange={toggleDarkMode}
                    size="md"
                  />
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
                <CardTitle>About komu</CardTitle>
                <CardDescription>Japanese manga reading companion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-surface-2 rounded-2xl p-4">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto">
                        <span className="apple-title-3 font-bold text-accent">こ</span>
                      </div>
                      <h3 className="apple-headline font-semibold text-text-primary">komu</h3>
                      <p className="apple-footnote text-text-secondary">
                        Version 1.0.0
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 apple-footnote text-text-secondary">
                    <p>
                      komu is a self-hosted manga reader designed specifically for Japanese language learning.
                    </p>
                    <p>
                      Features include OCR text extraction, grammar analysis, and seamless reading modes
                      to enhance your Japanese reading experience.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}