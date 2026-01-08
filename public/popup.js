document.addEventListener('DOMContentLoaded', () => {
  const fillBtn = document.getElementById('fillBtn')
  const undoBtn = document.getElementById('undoBtn')
  const sidePanelBtn = document.getElementById('sidePanelBtn')
  const status = document.getElementById('status')

  function showStatus(message, isError = false) {
    status.textContent = message
    status.className = 'status ' + (isError ? 'error' : 'success')
    setTimeout(() => {
      status.className = 'status'
    }, 3000)
  }

  fillBtn.addEventListener('click', async () => {
    fillBtn.disabled = true
    fillBtn.textContent = 'Filling...'

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        showStatus('No active tab', true)
        return
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'fill' })
      
      if (response?.success) {
        showStatus(`Filled ${response.filled} fields`)
      } else {
        showStatus(response?.error || 'Fill failed', true)
      }
    } catch (error) {
      showStatus('Error: ' + error.message, true)
    } finally {
      fillBtn.disabled = false
      fillBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Fill Form
      `
    }
  })

  undoBtn.addEventListener('click', async () => {
    undoBtn.disabled = true

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        showStatus('No active tab', true)
        return
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'undo' })
      
      if (response?.success) {
        showStatus('Undone')
      } else {
        showStatus(response?.error || 'Undo failed', true)
      }
    } catch (error) {
      showStatus('Error: ' + error.message, true)
    } finally {
      undoBtn.disabled = false
    }
  })

  sidePanelBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id && chrome.sidePanel?.open) {
        await chrome.sidePanel.open({ tabId: tab.id })
        window.close()
      } else {
        showStatus('Right-click extension icon → Open side panel', false)
      }
    } catch (error) {
      showStatus('Right-click icon → Open side panel', false)
    }
  })
})
