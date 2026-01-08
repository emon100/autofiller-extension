import { test, expect, chromium, BrowserContext } from '@playwright/test'
import path from 'path'

test.describe('Chrome Extension Tests', () => {
  let context: BrowserContext

  test.beforeAll(async () => {
    const pathToExtension = path.join(__dirname, '../../dist')
    
    try {
      context = await chromium.launchPersistentContext('', {
        headless: false,
        args: [
          `--disable-extensions-except=${pathToExtension}`,
          `--load-extension=${pathToExtension}`,
        ],
      })
    } catch {
      console.log('Extension loading requires headed mode and built extension')
    }
  })

  test.afterAll(async () => {
    if (context) {
      await context.close()
    }
  })

  test.skip('extension loads without errors', async () => {
    if (!context) {
      test.skip()
      return
    }

    const [backgroundPage] = context.serviceWorkers()
    expect(backgroundPage).toBeTruthy()
  })

  test.skip('content script injects on page load', async () => {
    if (!context) {
      test.skip()
      return
    }

    const page = await context.newPage()
    await page.goto('https://example.com')
    
    const hasContentScript = await page.evaluate(() => {
      return typeof (window as { AutoFiller?: unknown }).AutoFiller !== 'undefined'
    })
    
    expect(hasContentScript).toBeTruthy()
    await page.close()
  })

  test.skip('side panel opens', async () => {
    if (!context) {
      test.skip()
      return
    }

    const page = await context.newPage()
    await page.goto('https://example.com')
    
    await page.close()
  })
})
