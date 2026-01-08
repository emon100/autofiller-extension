import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fillField, fillText, fillSelect, fillRadio, fillCheckbox, fillCombobox, createFillSnapshot, restoreSnapshot } from '@/executor'
import { FieldContext } from '@/types'

function createMockFieldContext(element: HTMLElement, kind: string = 'text'): FieldContext {
  return {
    element,
    labelText: '',
    sectionTitle: '',
    attributes: {},
    optionsText: [],
    framePath: [],
    shadowPath: [],
    widgetSignature: {
      kind: kind as any,
      attributes: {},
      interactionPlan: 'nativeSetterWithEvents',
    },
  }
}

describe('Executor', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('fillText', () => {
    it('fills text input with value', async () => {
      document.body.innerHTML = '<input type="text" id="name" />'
      const input = document.getElementById('name') as HTMLInputElement
      
      const result = await fillText(input, 'John Doe')
      
      expect(result.success).toBe(true)
      expect(input.value).toBe('John Doe')
    })

    it('dispatches input and change events', async () => {
      document.body.innerHTML = '<input type="text" id="name" />'
      const input = document.getElementById('name') as HTMLInputElement
      
      const inputHandler = vi.fn()
      const changeHandler = vi.fn()
      input.addEventListener('input', inputHandler)
      input.addEventListener('change', changeHandler)
      
      await fillText(input, 'John Doe')
      
      expect(inputHandler).toHaveBeenCalled()
      expect(changeHandler).toHaveBeenCalled()
    })

    it('works with React controlled inputs (native setter)', async () => {
      document.body.innerHTML = '<input type="text" id="name" />'
      const input = document.getElementById('name') as HTMLInputElement
      
      const inputHandler = vi.fn()
      input.addEventListener('input', inputHandler)
      
      await fillText(input, 'John Doe')
      
      expect(inputHandler).toHaveBeenCalled()
      expect(input.value).toBe('John Doe')
    })

    it('fills textarea', async () => {
      document.body.innerHTML = '<textarea id="bio"></textarea>'
      const textarea = document.getElementById('bio') as HTMLTextAreaElement
      
      const result = await fillText(textarea, 'This is my bio')
      
      expect(result.success).toBe(true)
      expect(textarea.value).toBe('This is my bio')
    })

    it('records previous value', async () => {
      document.body.innerHTML = '<input type="text" id="name" value="Old Name" />'
      const input = document.getElementById('name') as HTMLInputElement
      
      const result = await fillText(input, 'New Name')
      
      expect(result.previousValue).toBe('Old Name')
      expect(result.newValue).toBe('New Name')
    })
  })

  describe('fillSelect', () => {
    it('selects option by value', async () => {
      document.body.innerHTML = `
        <select id="country">
          <option value="">Select...</option>
          <option value="US">United States</option>
          <option value="CN">China</option>
        </select>
      `
      const select = document.getElementById('country') as HTMLSelectElement
      
      const result = await fillSelect(select, 'US')
      
      expect(result.success).toBe(true)
      expect(select.value).toBe('US')
    })

    it('selects option by text match', async () => {
      document.body.innerHTML = `
        <select id="country">
          <option value="">Select...</option>
          <option value="US">United States</option>
          <option value="CN">China</option>
        </select>
      `
      const select = document.getElementById('country') as HTMLSelectElement
      
      const result = await fillSelect(select, 'United States')
      
      expect(result.success).toBe(true)
      expect(select.value).toBe('US')
    })

    it('selects option by partial text match', async () => {
      document.body.innerHTML = `
        <select id="degree">
          <option value="">Select...</option>
          <option value="bachelor">Bachelor's Degree</option>
          <option value="master">Master's Degree</option>
        </select>
      `
      const select = document.getElementById('degree') as HTMLSelectElement
      
      const result = await fillSelect(select, 'Master')
      
      expect(result.success).toBe(true)
      expect(select.value).toBe('master')
    })

    it('dispatches change event', async () => {
      document.body.innerHTML = `
        <select id="country">
          <option value="US">United States</option>
        </select>
      `
      const select = document.getElementById('country') as HTMLSelectElement
      const changeHandler = vi.fn()
      select.addEventListener('change', changeHandler)
      
      await fillSelect(select, 'US')
      
      expect(changeHandler).toHaveBeenCalled()
    })

    it('returns error for no matching option', async () => {
      document.body.innerHTML = `
        <select id="country">
          <option value="US">United States</option>
        </select>
      `
      const select = document.getElementById('country') as HTMLSelectElement
      
      const result = await fillSelect(select, 'NonExistent')
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('fillRadio', () => {
    it('selects radio by value', async () => {
      document.body.innerHTML = `
        <input type="radio" name="choice" value="yes" id="yes" />
        <input type="radio" name="choice" value="no" id="no" />
      `
      const radio = document.getElementById('yes') as HTMLInputElement
      
      const result = await fillRadio(radio, 'yes')
      
      expect(result.success).toBe(true)
      expect(radio.checked).toBe(true)
    })

    it('finds and selects correct radio in group', async () => {
      document.body.innerHTML = `
        <input type="radio" name="choice" value="yes" id="yes" />
        <input type="radio" name="choice" value="no" id="no" />
      `
      const radioYes = document.getElementById('yes') as HTMLInputElement
      
      const result = await fillRadio(radioYes, 'no')
      
      expect(result.success).toBe(true)
      const radioNo = document.getElementById('no') as HTMLInputElement
      expect(radioNo.checked).toBe(true)
    })

    it('matches yes/no boolean values', async () => {
      document.body.innerHTML = `
        <input type="radio" name="authorized" value="yes" id="auth-yes" />
        <input type="radio" name="authorized" value="no" id="auth-no" />
      `
      const radio = document.getElementById('auth-yes') as HTMLInputElement
      
      const result = await fillRadio(radio, 'true')
      
      expect(result.success).toBe(true)
      expect(radio.checked).toBe(true)
    })
  })

  describe('fillCheckbox', () => {
    it('checks checkbox for truthy value', async () => {
      document.body.innerHTML = '<input type="checkbox" id="terms" />'
      const checkbox = document.getElementById('terms') as HTMLInputElement
      
      const result = await fillCheckbox(checkbox, 'yes')
      
      expect(result.success).toBe(true)
      expect(checkbox.checked).toBe(true)
    })

    it('unchecks checkbox for falsy value', async () => {
      document.body.innerHTML = '<input type="checkbox" id="terms" checked />'
      const checkbox = document.getElementById('terms') as HTMLInputElement
      
      const result = await fillCheckbox(checkbox, 'no')
      
      expect(result.success).toBe(true)
      expect(checkbox.checked).toBe(false)
    })

    it('dispatches click and change events', async () => {
      document.body.innerHTML = '<input type="checkbox" id="terms" />'
      const checkbox = document.getElementById('terms') as HTMLInputElement
      const clickHandler = vi.fn()
      const changeHandler = vi.fn()
      checkbox.addEventListener('click', clickHandler)
      checkbox.addEventListener('change', changeHandler)
      
      await fillCheckbox(checkbox, 'yes')
      
      expect(clickHandler).toHaveBeenCalled()
      expect(changeHandler).toHaveBeenCalled()
    })
  })

  describe('fillCombobox', () => {
    it('types value and selects matching option', async () => {
      document.body.innerHTML = `
        <div role="combobox">
          <input type="text" id="school" aria-controls="options" />
          <div id="options" role="listbox" style="display:none">
            <div role="option" data-value="MIT">MIT</div>
            <div role="option" data-value="Stanford">Stanford University</div>
          </div>
        </div>
      `
      const input = document.getElementById('school') as HTMLInputElement
      const listbox = document.getElementById('options') as HTMLElement
      
      input.addEventListener('focus', () => {
        listbox.style.display = 'block'
      })
      
      const result = await fillCombobox(input, 'Stanford')
      
      expect(result.success).toBe(true)
      expect(input.value).toContain('Stanford')
    })
  })

  describe('fillField', () => {
    it('routes to correct fill function based on widget kind', async () => {
      document.body.innerHTML = '<input type="text" id="name" />'
      const input = document.getElementById('name') as HTMLInputElement
      const context = createMockFieldContext(input, 'text')
      
      const result = await fillField(context, 'John')
      
      expect(result.success).toBe(true)
      expect(input.value).toBe('John')
    })

    it('handles select widget', async () => {
      document.body.innerHTML = `
        <select id="country">
          <option value="US">US</option>
        </select>
      `
      const select = document.getElementById('country') as HTMLSelectElement
      const context = createMockFieldContext(select, 'select')
      
      const result = await fillField(context, 'US')
      
      expect(result.success).toBe(true)
      expect(select.value).toBe('US')
    })
  })

  describe('Snapshot and Restore', () => {
    it('creates snapshot of text input', () => {
      document.body.innerHTML = '<input type="text" id="name" value="John" />'
      const input = document.getElementById('name') as HTMLInputElement
      
      const snapshot = createFillSnapshot(input)
      
      expect(snapshot.value).toBe('John')
    })

    it('creates snapshot of select', () => {
      document.body.innerHTML = `
        <select id="country">
          <option value="US">US</option>
          <option value="CN" selected>China</option>
        </select>
      `
      const select = document.getElementById('country') as HTMLSelectElement
      
      const snapshot = createFillSnapshot(select)
      
      expect(snapshot.selectedIndex).toBe(1)
    })

    it('creates snapshot of checkbox', () => {
      document.body.innerHTML = '<input type="checkbox" id="terms" checked />'
      const checkbox = document.getElementById('terms') as HTMLInputElement
      
      const snapshot = createFillSnapshot(checkbox)
      
      expect(snapshot.checked).toBe(true)
    })

    it('restores text input from snapshot', () => {
      document.body.innerHTML = '<input type="text" id="name" value="New Value" />'
      const input = document.getElementById('name') as HTMLInputElement
      const snapshot = { value: 'Original Value' }
      
      restoreSnapshot(input, snapshot)
      
      expect(input.value).toBe('Original Value')
    })

    it('restores select from snapshot', () => {
      document.body.innerHTML = `
        <select id="country">
          <option value="US">US</option>
          <option value="CN">China</option>
        </select>
      `
      const select = document.getElementById('country') as HTMLSelectElement
      select.selectedIndex = 1
      const snapshot = { selectedIndex: 0, value: 'US' }
      
      restoreSnapshot(select, snapshot)
      
      expect(select.selectedIndex).toBe(0)
    })

    it('restores checkbox from snapshot', () => {
      document.body.innerHTML = '<input type="checkbox" id="terms" checked />'
      const checkbox = document.getElementById('terms') as HTMLInputElement
      const snapshot = { checked: false }
      
      restoreSnapshot(checkbox, snapshot)
      
      expect(checkbox.checked).toBe(false)
    })
  })
})
