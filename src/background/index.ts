chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return

  try {
    await chrome.sidePanel.open({ tabId: tab.id })
  } catch (error) {
    console.error('Failed to open side panel:', error)
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fillCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) {
        sendResponse({ success: false, error: 'No active tab' })
        return
      }

      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'fill' })
        sendResponse(response)
      } catch (error) {
        sendResponse({ success: false, error: String(error) })
      }
    })
    return true
  }

  if (message.action === 'undoCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) {
        sendResponse({ success: false, error: 'No active tab' })
        return
      }

      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'undo' })
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
})
