import { hasValidConsent } from '@/consent'

// Track side panel state per tab
const sidePanelOpenTabs = new Set<number>()

// Context menu IDs
const CONTEXT_MENU_IDS = {
  FILL_FORM: 'autofiller-fill-form',
  AI_FILL_FIELD: 'autofiller-ai-fill-field',
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

    // AI fill single field - shown on editable elements
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.AI_FILL_FIELD,
      title: 'OneFillr: AI fill this',
      contexts: ['editable'],
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

    case CONTEXT_MENU_IDS.AI_FILL_FIELD:
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'aiFillField' })
      } catch (error) {
        console.error('[AutoFiller] Failed to send AI fill command:', error)
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          })
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tab.id!, { action: 'aiFillField' })
            } catch (e) {
              console.error('[AutoFiller] AI fill failed after injection:', e)
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openSidePanel') {
    const tabId = sender.tab?.id
    const windowId = sender.tab?.windowId

    if (chrome.sidePanel?.open) {
      const openOptions = tabId ? { tabId } : windowId ? { windowId } : null
      if (!openOptions) {
        sendResponse({ success: false, error: 'No tab or window ID' })
        return true
      }
      chrome.sidePanel.open(openOptions)
        .then(() => {
          if (tabId) sidePanelOpenTabs.add(tabId)
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
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  }

  // On fresh install, open welcome page to guide user
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') })
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
