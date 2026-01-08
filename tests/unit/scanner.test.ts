import { describe, it, expect, beforeEach } from 'vitest'
import { scanFields, extractFieldContext, extractLabelText } from '@/scanner'
import { FieldContext, WidgetKind } from '@/types'

describe('DOM Scanner', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('extractLabelText', () => {
    it('extracts label from label[for] element', () => {
      document.body.innerHTML = `
        <label for="name">Full Name</label>
        <input type="text" id="name" />
      `
      const input = document.querySelector('input') as HTMLInputElement
      expect(extractLabelText(input)).toBe('Full Name')
    })

    it('extracts label from aria-label attribute', () => {
      document.body.innerHTML = `
        <input type="text" aria-label="Email Address" />
      `
      const input = document.querySelector('input') as HTMLInputElement
      expect(extractLabelText(input)).toBe('Email Address')
    })

    it('extracts label from aria-labelledby', () => {
      document.body.innerHTML = `
        <span id="phone-label">Phone Number</span>
        <input type="tel" aria-labelledby="phone-label" />
      `
      const input = document.querySelector('input') as HTMLInputElement
      expect(extractLabelText(input)).toBe('Phone Number')
    })

    it('extracts label from placeholder', () => {
      document.body.innerHTML = `
        <input type="text" placeholder="Enter your city" />
      `
      const input = document.querySelector('input') as HTMLInputElement
      expect(extractLabelText(input)).toBe('Enter your city')
    })

    it('extracts label from parent label element', () => {
      document.body.innerHTML = `
        <label>
          School Name
          <input type="text" />
        </label>
      `
      const input = document.querySelector('input') as HTMLInputElement
      expect(extractLabelText(input)).toBe('School Name')
    })

    it('extracts label from nearby text', () => {
      document.body.innerHTML = `
        <div>
          <span>Company</span>
          <input type="text" />
        </div>
      `
      const input = document.querySelector('input') as HTMLInputElement
      expect(extractLabelText(input)).toContain('Company')
    })
  })

  describe('extractFieldContext', () => {
    it('identifies text input widget kind', () => {
      document.body.innerHTML = `
        <label for="name">Name</label>
        <input type="text" id="name" name="fullName" />
      `
      const input = document.querySelector('input') as HTMLInputElement
      const context = extractFieldContext(input)
      
      expect(context.widgetSignature.kind).toBe('text')
      expect(context.attributes['name']).toBe('fullName')
      expect(context.attributes['type']).toBe('text')
    })

    it('identifies email input widget kind', () => {
      document.body.innerHTML = `
        <input type="email" id="email" autocomplete="email" />
      `
      const input = document.querySelector('input') as HTMLInputElement
      const context = extractFieldContext(input)
      
      expect(context.widgetSignature.kind).toBe('text')
      expect(context.attributes['type']).toBe('email')
      expect(context.attributes['autocomplete']).toBe('email')
    })

    it('identifies select widget kind', () => {
      document.body.innerHTML = `
        <label for="country">Country</label>
        <select id="country" name="country">
          <option value="US">United States</option>
          <option value="CN">China</option>
        </select>
      `
      const select = document.querySelector('select') as HTMLSelectElement
      const context = extractFieldContext(select)
      
      expect(context.widgetSignature.kind).toBe('select')
      expect(context.optionsText).toContain('United States')
      expect(context.optionsText).toContain('China')
    })

    it('identifies radio group', () => {
      document.body.innerHTML = `
        <div>
          <span>Work Authorization</span>
          <label><input type="radio" name="workAuth" value="yes" /> Yes</label>
          <label><input type="radio" name="workAuth" value="no" /> No</label>
        </div>
      `
      const radio = document.querySelector('input[type="radio"]') as HTMLInputElement
      const context = extractFieldContext(radio)
      
      expect(context.widgetSignature.kind).toBe('radio')
    })

    it('identifies checkbox', () => {
      document.body.innerHTML = `
        <label><input type="checkbox" name="terms" /> I agree to terms</label>
      `
      const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement
      const context = extractFieldContext(checkbox)
      
      expect(context.widgetSignature.kind).toBe('checkbox')
    })

    it('identifies textarea', () => {
      document.body.innerHTML = `
        <label for="resume">Resume</label>
        <textarea id="resume" name="resume"></textarea>
      `
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement
      const context = extractFieldContext(textarea)
      
      expect(context.widgetSignature.kind).toBe('textarea')
    })

    it('identifies date input', () => {
      document.body.innerHTML = `
        <label for="gradDate">Graduation Date</label>
        <input type="date" id="gradDate" name="gradDate" />
      `
      const input = document.querySelector('input') as HTMLInputElement
      const context = extractFieldContext(input)
      
      expect(context.widgetSignature.kind).toBe('date')
    })

    it('identifies combobox by role', () => {
      document.body.innerHTML = `
        <div role="combobox" aria-expanded="false">
          <input type="text" aria-autocomplete="list" />
          <div role="listbox">
            <div role="option">Option 1</div>
            <div role="option">Option 2</div>
          </div>
        </div>
      `
      const input = document.querySelector('input') as HTMLInputElement
      const context = extractFieldContext(input)
      
      expect(context.widgetSignature.kind).toBe('combobox')
      expect(context.optionsText).toContain('Option 1')
      expect(context.optionsText).toContain('Option 2')
    })

    it('extracts section title from fieldset legend', () => {
      document.body.innerHTML = `
        <fieldset>
          <legend>Personal Information</legend>
          <label for="name">Name</label>
          <input type="text" id="name" />
        </fieldset>
      `
      const input = document.querySelector('input') as HTMLInputElement
      const context = extractFieldContext(input)
      
      expect(context.sectionTitle).toBe('Personal Information')
    })

    it('extracts section title from nearest heading', () => {
      document.body.innerHTML = `
        <h2>Education Details</h2>
        <div>
          <label for="school">School</label>
          <input type="text" id="school" />
        </div>
      `
      const input = document.querySelector('input') as HTMLInputElement
      const context = extractFieldContext(input)
      
      expect(context.sectionTitle).toBe('Education Details')
    })
  })

  describe('scanFields', () => {
    it('finds all input fields in document', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="name" />
          <input type="email" name="email" />
          <input type="tel" name="phone" />
          <select name="country"><option>US</option></select>
          <textarea name="bio"></textarea>
        </form>
      `
      const fields = scanFields(document.body)
      
      expect(fields.length).toBe(5)
    })

    it('ignores hidden and disabled fields', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="visible" />
          <input type="hidden" name="hidden" />
          <input type="text" name="disabled" disabled />
          <input type="text" name="readonly" readonly />
        </form>
      `
      const fields = scanFields(document.body)
      
      expect(fields.length).toBe(2)
      expect(fields.some(f => f.attributes['name'] === 'visible')).toBe(true)
      expect(fields.some(f => f.attributes['name'] === 'readonly')).toBe(true)
    })

    it('ignores submit and button inputs', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="name" />
          <input type="submit" value="Submit" />
          <input type="button" value="Click" />
          <button type="submit">Submit</button>
        </form>
      `
      const fields = scanFields(document.body)
      
      expect(fields.length).toBe(1)
    })

    it('scans fields inside open shadow DOM', () => {
      const host = document.createElement('div')
      document.body.appendChild(host)
      const shadow = host.attachShadow({ mode: 'open' })
      shadow.innerHTML = `
        <input type="text" name="shadowField" />
        <input type="email" name="shadowEmail" />
      `
      
      const fields = scanFields(document.body)
      
      expect(fields.length).toBe(2)
      expect(fields[0].shadowPath.length).toBeGreaterThan(0)
    })

    it('groups radio buttons by name', () => {
      document.body.innerHTML = `
        <div>
          <input type="radio" name="choice" value="a" />
          <input type="radio" name="choice" value="b" />
          <input type="radio" name="choice" value="c" />
        </div>
      `
      const fields = scanFields(document.body)
      
      expect(fields.length).toBe(1)
      expect(fields[0].widgetSignature.kind).toBe('radio')
    })
  })
})
