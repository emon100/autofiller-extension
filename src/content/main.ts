import { initAutoFiller, getAutoFiller } from './index'

initAutoFiller()

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const filler = getAutoFiller()

  // Handle side panel state messages
  if (message.action === 'sidePanelClosed' || message.action === 'sidePanelOpened') {
    filler?.setSidePanelState(message.action === 'sidePanelOpened')
    sendResponse({ success: true })
    return true
  }

  // Handle LinkedIn import trigger from side panel
  if (message.action === 'parseLinkedInProfile') {
    import('@/profileParser/LinkedInParser').then(({ LinkedInParser }) => {
      if (!LinkedInParser.isLinkedInProfile()) {
        sendResponse({ success: false, error: 'Not a LinkedIn profile page' })
        return
      }
      const parser = new LinkedInParser()
      const profile = parser.parse(document)
      const parsedProfile = parser.toParsedProfile(profile)
      sendResponse({ success: true, profile: parsedProfile })
    }).catch(err => {
      sendResponse({ success: false, error: String(err) })
    })
    return true
  }

  if (!filler) {
    sendResponse({ success: false, error: 'AutoFiller not initialized' })
    return true
  }

  switch (message.action) {
    case 'fill':
      filler.fill().then(results => {
        sendResponse({ 
          success: true, 
          filled: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        })
      })
      return true

    case 'undo':
      filler.undo().then(() => {
        sendResponse({ success: true })
      })
      return true

    case 'enableRecording':
      filler.enableRecording().then(() => {
        sendResponse({ success: true })
      })
      return true

    case 'disableRecording':
      filler.disableRecording().then(() => {
        sendResponse({ success: true })
      })
      return true

    case 'enableAutofill':
      filler.enableAutofill().then(() => {
        sendResponse({ success: true })
      })
      return true

    case 'disableAutofill':
      filler.disableAutofill().then(() => {
        sendResponse({ success: true })
      })
      return true

    case 'getStatus':
      sendResponse({ 
        success: true,
        recording: true,
        autofill: true,
      })
      return true

    default:
      sendResponse({ success: false, error: 'Unknown action' })
      return true
  }
})

window.addEventListener('autofiller:recorded', ((event: CustomEvent) => {
  const { type, value } = event.detail
  console.log(`[AutoFiller] Recorded: ${type} = ${value}`)
}) as EventListener)

window.addEventListener('autofiller:filled', ((event: CustomEvent) => {
  const { count } = event.detail
  console.log(`[AutoFiller] Filled ${count} fields`)
}) as EventListener)

window.addEventListener('autofiller:undone', () => {
  console.log('[AutoFiller] Undone all fills')
})

console.log('[AutoFiller] Content script loaded')
