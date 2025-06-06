/**
 * Utility function to copy text to clipboard with iOS Safari fallback
 */

// Detect if we're on iOS Safari
function isIOSSafari(): boolean {
  const userAgent = navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(userAgent)
  const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent)
  return isIOS && isSafari
}

// Copy text to clipboard with fallback for iOS Safari
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    
    // Fallback for iOS Safari and other browsers without clipboard API
    if (isIOSSafari() || !navigator.clipboard) {
      const clipboardElem = document.createElement('input')
      clipboardElem.value = text
      clipboardElem.style.position = 'fixed'
      clipboardElem.style.left = '-999999px'
      clipboardElem.style.top = '-999999px'
      document.body.appendChild(clipboardElem)
      
      clipboardElem.select()
      clipboardElem.setSelectionRange(0, text.length)
      
      const successful = document.execCommand('copy')
      document.body.removeChild(clipboardElem)
      
      return successful
    }
    
    return false
  } catch (error) {
    console.error('Failed to copy text to clipboard:', error)
    
    // Final fallback attempt using document.execCommand
    try {
      const clipboardElem = document.createElement('input')
      clipboardElem.value = text
      clipboardElem.style.position = 'fixed'
      clipboardElem.style.left = '-999999px'
      clipboardElem.style.top = '-999999px'
      document.body.appendChild(clipboardElem)
      
      clipboardElem.select()
      clipboardElem.setSelectionRange(0, text.length)
      
      const successful = document.execCommand('copy')
      document.body.removeChild(clipboardElem)
      
      return successful
    } catch (fallbackError) {
      console.error('Fallback copy method also failed:', fallbackError)
      return false
    }
  }
} 