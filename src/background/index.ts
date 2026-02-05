import { hasValidConsent } from '@/consent'

// Track side panel state per tab
const sidePanelOpenTabs = new Set<number>()

// Context menu IDs
const CONTEXT_MENU_IDS = {
  FILL_FORM: 'autofiller-fill-form',
  OPEN_SIDEPANEL: 'autofiller-open-sidepanel',
} as const

// Create context menus on install
function createContextMenus() {
  // Remove existing menus first to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Main fill action - shown on page
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.FILL_FORM,
      title: 'AutoFill this form',
      contexts: ['page', 'editable'],
    })

    // Open side panel
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.OPEN_SIDEPANEL,
      title: 'Open OneFillr panel',
      contexts: ['page'],
    })
  })
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return

  switch (info.menuItemId) {
    case CONTEXT_MENU_IDS.FILL_FORM:
      try {
        // Send fill command to content script
        await chrome.tabs.sendMessage(tab.id, { action: 'fill' })
      } catch (error) {
        console.error('[AutoFiller] Failed to send fill command:', error)
        // Content script may not be loaded, try to inject it
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          })
          // Retry after injection
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tab.id!, { action: 'fill' })
            } catch (e) {
              console.error('[AutoFiller] Fill failed after injection:', e)
            }
          }, 500)
        } catch (injectError) {
          console.error('[AutoFiller] Failed to inject content script:', injectError)
        }
      }
      break

    case CONTEXT_MENU_IDS.OPEN_SIDEPANEL:
      if (chrome.sidePanel?.open) {
        try {
          await chrome.sidePanel.open({ tabId: tab.id })
          sidePanelOpenTabs.add(tab.id)
        } catch (error) {
          console.error('[AutoFiller] Failed to open side panel:', error)
        }
      }
      break
  }
})

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

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[AutoFiller] Extension installed')

  // Create context menus
  createContextMenus()

  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
  }

  // On fresh install, always open side panel for onboarding
  if (details.reason === 'install') {
    try {
      // Wait a bit for the extension to fully initialize
      setTimeout(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.id && chrome.sidePanel?.open) {
          await chrome.sidePanel.open({ tabId: tab.id })
          sidePanelOpenTabs.add(tab.id)
        }
      }, 500)
    } catch (error) {
      console.log('[AutoFiller] Could not open side panel for onboarding:', error)
    }
  }

  // On update, check consent
  if (details.reason === 'update') {
    const consentValid = await hasValidConsent()
    if (!consentValid) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.id && chrome.sidePanel?.open) {
          await chrome.sidePanel.open({ tabId: tab.id })
          sidePanelOpenTabs.add(tab.id)
        }
      } catch (error) {
        console.log('[AutoFiller] Could not open side panel for consent:', error)
      }
    }
  }
})

// Also create menus on startup (in case extension was updated)
chrome.runtime.onStartup.addListener(() => {
  createContextMenus()
})
