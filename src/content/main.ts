import { initAutoFiller, getAutoFiller } from './index'

initAutoFiller()

// Track last right-clicked element for context menu AI fill
let lastRightClickedElement: HTMLElement | null = null
document.addEventListener('contextmenu', (e) => {
  lastRightClickedElement = e.target as HTMLElement
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const filler = getAutoFiller()

  // Handle side panel state messages
  if (message.action === 'sidePanelClosed' || message.action === 'sidePanelOpened') {
    filler?.setSidePanelState(message.action === 'sidePanelOpened')
    sendResponse({ success: true })
    return true
  }

  // Check if LinkedIn profile page is loaded and ready to parse
  if (message.action === 'checkLinkedInReady') {
    import('@/profileParser/LinkedInParser').then(({ LinkedInParser }) => {
      try {
        if (!LinkedInParser.isLinkedInProfile()) {
          sendResponse({ ready: false, reason: 'not_linkedin' })
          return
        }
        // Check if key elements are loaded (name, experience section)
        const nameEl = document.querySelector('h1.text-heading-xlarge, h1[class*="text-heading"]')
        const experienceSection = document.querySelector('#experience')
        const isReady = !!(nameEl?.textContent?.trim())
        sendResponse({
          ready: isReady,
          reason: isReady ? 'loaded' : 'loading',
          hasExperience: !!experienceSection
        })
      } catch (err) {
        sendResponse({ ready: false, reason: 'error', error: String(err) })
      }
    }).catch(err => {
      sendResponse({ ready: false, reason: 'error', error: String(err) })
    })
    return true
  }

  // Handle LinkedIn import trigger from side panel
  if (message.action === 'parseLinkedInProfile') {
    const useLLMCleaning = message.useLLMCleaning ?? false // Default to local processing
    import('@/profileParser/LinkedInParser').then(async ({ LinkedInParser }) => {
      try {
        if (!LinkedInParser.isLinkedInProfile()) {
          sendResponse({ success: false, error: 'Not a LinkedIn profile page' })
          return
        }
        const parser = new LinkedInParser()
        const profile = parser.parse(document)
        const parsedProfile = await parser.toParsedProfile(profile, useLLMCleaning)

        // Include showAllLinks info so sidepanel can orchestrate multi-page parsing
        sendResponse({
          success: true,
          profile: parsedProfile,
          showAllLinks: profile.showAllLinks,
          experienceCount: profile.workExperiences.length,
          educationCount: profile.educations.length,
        })
      } catch (err) {
        console.error('[AutoFiller] LinkedIn parse error:', err)
        sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) })
      }
    }).catch(err => {
      console.error('[AutoFiller] LinkedIn import error:', err)
      sendResponse({ success: false, error: String(err) })
    })
    return true
  }

  // Parse a LinkedIn detail page (/details/experience or /details/education)
  if (message.action === 'parseLinkedInDetailPage') {
    const type = message.detailType as 'experience' | 'education'
    import('@/profileParser/LinkedInParser').then(async ({ LinkedInParser }) => {
      try {
        const parser = new LinkedInParser()
        const entries = parser.parseDetailPage(document, type)
        console.log(`[AutoFiller] Parsed ${entries.length} ${type} entries from detail page`)
        sendResponse({ success: true, entries, type })
      } catch (err) {
        console.error('[AutoFiller] Detail page parse error:', err)
        sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) })
      }
    }).catch(err => {
      sendResponse({ success: false, error: String(err) })
    })
    return true
  }

  // Navigate to a URL and wait for page load (used for multi-page LinkedIn parsing)
  if (message.action === 'navigateForLinkedInDetails') {
    const targetUrl = message.url as string
    if (!targetUrl) {
      sendResponse({ success: false, error: 'No URL provided' })
      return true
    }

    try {
      // Navigate to the target page
      window.location.href = targetUrl
      // The content script will reload on the new page
      // The sidepanel will handle the continuation via polling
      sendResponse({ success: true, navigating: true })
    } catch (err) {
      sendResponse({ success: false, error: String(err) })
    }
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

    case 'aiFillField':
      if (lastRightClickedElement) {
        filler.aiFillSingleField(lastRightClickedElement).then(success => {
          sendResponse({ success })
        }).catch(err => {
          sendResponse({ success: false, error: String(err) })
        })
      } else {
        sendResponse({ success: false, error: 'No target element' })
      }
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
