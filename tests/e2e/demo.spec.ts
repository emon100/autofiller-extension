import { test, expect } from '@playwright/test'

test.describe('Demo Page Form Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo-pages/interactive-demo.html')
  })

  test('demo page loads correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('AutoFiller')
    await expect(page.locator('#standard-form')).toBeVisible()
  })

  test('standard form has all expected fields', async ({ page }) => {
    const form = page.locator('#standard-form')
    
    await expect(form.locator('input[name="fullName"]')).toBeVisible()
    await expect(form.locator('input[name="email"]')).toBeVisible()
    await expect(form.locator('input[name="phone"]')).toBeVisible()
    await expect(form.locator('input[name="linkedin"]')).toBeVisible()
  })

  test('form inputs accept values', async ({ page }) => {
    await page.fill('input[name="fullName"]', 'John Doe')
    await page.fill('input[name="email"]', 'john@example.com')
    await page.fill('input[name="phone"]', '555-123-4567')
    
    await expect(page.locator('input[name="fullName"]')).toHaveValue('John Doe')
    await expect(page.locator('input[name="email"]')).toHaveValue('john@example.com')
    await expect(page.locator('input[name="phone"]')).toHaveValue('555-123-4567')
  })

  test('select fields work correctly', async ({ page }) => {
    const degreeSelect = page.locator('select[name="degree"]')
    
    if (await degreeSelect.count() > 0) {
      await degreeSelect.selectOption({ index: 1 })
      const value = await degreeSelect.inputValue()
      expect(value).toBeTruthy()
    }
  })

  test('multi-step form navigation works', async ({ page }) => {
    const step1 = page.locator('[data-step="1"]')
    const step2 = page.locator('[data-step="2"]')
    const nextBtn = page.locator('button:has-text("Next")')
    
    if (await step1.count() > 0 && await nextBtn.count() > 0) {
      await expect(step1).toBeVisible()
      await nextBtn.click()
      await expect(step2).toBeVisible()
    }
  })
})

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo-pages/interactive-demo.html')
  })

  test('contenteditable fields are editable', async ({ page }) => {
    const contentEditable = page.locator('[contenteditable="true"]').first()
    
    if (await contentEditable.count() > 0) {
      await contentEditable.click()
      await page.keyboard.type('Test content')
      await expect(contentEditable).toContainText('Test content')
    }
  })

  test('hidden proxy inputs work', async ({ page }) => {
    const proxyContainer = page.locator('[data-testid="proxy-field"]')
    
    if (await proxyContainer.count() > 0) {
      const visibleInput = proxyContainer.locator('input:visible')
      if (await visibleInput.count() > 0) {
        await visibleInput.fill('proxy value')
        await expect(visibleInput).toHaveValue('proxy value')
      }
    }
  })
})

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo-pages/interactive-demo.html')
  })

  test('form inputs have labels or aria-labels', async ({ page }) => {
    const inputs = page.locator('input:visible')
    const count = await inputs.count()
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const ariaLabelledby = await input.getAttribute('aria-labelledby')
      
      if (id) {
        const label = page.locator(`label[for="${id}"]`)
        const hasLabel = await label.count() > 0
        const hasAria = !!ariaLabel || !!ariaLabelledby
        expect(hasLabel || hasAria).toBeTruthy()
      }
    }
  })

  test('keyboard navigation works', async ({ page }) => {
    const firstInput = page.locator('input:visible').first()
    await firstInput.focus()
    
    await page.keyboard.press('Tab')
    
    const activeElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON']).toContain(activeElement)
  })
})
