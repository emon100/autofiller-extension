import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

async function notifySidePanelState(isOpen: boolean): Promise<void> {
  const action = isOpen ? 'sidePanelOpened' : 'sidePanelClosed'
  try {
    await chrome.runtime.sendMessage({ action })
  } catch {
    // Background may not be listening
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { action })
    }
  } catch {
    // Tab may not have content script
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
