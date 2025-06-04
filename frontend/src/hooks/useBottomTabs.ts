import { createContext, useContext, useState, ReactNode } from 'react'

interface BottomTabsContextType {
  isHidden: boolean
  hideBottomTabs: () => void
  showBottomTabs: () => void
}

const BottomTabsContext = createContext<BottomTabsContextType | undefined>(undefined)

export function useBottomTabs() {
  const context = useContext(BottomTabsContext)
  if (context === undefined) {
    throw new Error('useBottomTabs must be used within a BottomTabsProvider')
  }
  return context
}

export function BottomTabsProvider({ children }: { children: ReactNode }) {
  const [isHidden, setIsHidden] = useState(false)

  const hideBottomTabs = () => setIsHidden(true)
  const showBottomTabs = () => setIsHidden(false)

  return (
    <BottomTabsContext.Provider value={{ isHidden, hideBottomTabs, showBottomTabs }}>
      {children}
    </BottomTabsContext.Provider>
  )
}