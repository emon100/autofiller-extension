// Track side panel state per tab
const sidePanelOpenTabs = new Set<number>()

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return

  try {
    if (chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ tabId: tab.id })
      sidePanelOpenTabs.add(tab.id)
    }
  } catch (error) {
    console.error('Failed to open side panel:', error)
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openSidePanel') {
    const tabId = sender.tab?.id
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID' })
      return true
    }

    if (chrome.sidePanel?.open) {
      chrome.sidePanel.open({ tabId })
        .then(() => {
          sidePanelOpenTabs.add(tabId)
          sendResponse({ success: true })
        })
        .catch((err) => {
          console.error('Failed to open side panel:', err)
          sendResponse({ success: false, error: String(err) })
        })
    } else {
      sendResponse({ success: false, error: 'Side panel API not available' })
    }
    return true
  }

  if (message.action === 'getSidePanelState') {
    const tabId = sender.tab?.id
    sendResponse({ isOpen: tabId ? sidePanelOpenTabs.has(tabId) : false })
    return true
  }

  if (message.action === 'sidePanelOpened') {
    const tabId = sender.tab?.id
    if (tabId) {
      sidePanelOpenTabs.add(tabId)
    }
    sendResponse({ success: true })
    return true
  }

  if (message.action === 'sidePanelClosed') {
    const tabId = sender.tab?.id
    if (tabId) {
      sidePanelOpenTabs.delete(tabId)
    }
    sendResponse({ success: true })
    return true
  }

  if (message.action === 'closeSidePanel') {
    // Broadcast to all extension pages (including sidepanel)
    chrome.runtime.sendMessage({ action: 'closeSidePanel' })
    sendResponse({ success: true })
    return true
  }

  if (message.action === 'fillCurrentTab' || message.action === 'undoCurrentTab') {
    const targetAction = message.action === 'fillCurrentTab' ? 'fill' : 'undo'
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) {
        sendResponse({ success: false, error: 'No active tab' })
        return
      }
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: targetAction })
        sendResponse(response)
      } catch (error) {
        sendResponse({ success: false, error: String(error) })
      }
    })
    return true
  }

  return false
})

chrome.runtime.onInstalled.addListener(() => {
  console.log('[AutoFiller] Extension installed')
  
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
  }
})
