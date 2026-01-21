import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

async function notifySidePanelState(isOpen: boolean): Promise<void> {
  const action = isOpen ? 'sidePanelOpened' : 'sidePanelClosed'
  try {
    chrome.runtime.sendMessage({ action })
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action })
    }
  } catch {
    // Ignore errors - tab may not have content script
  }
}

// Listen for close request from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'closeSidePanel') {
    window.close()
  }
})

notifySidePanelState(true)
window.addEventListener('pagehide', () => notifySidePanelState(false))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
