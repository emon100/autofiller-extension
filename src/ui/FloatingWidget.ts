import { WIDGET_STYLES } from './styles'
import { showToast } from './Toast'
import type { FillDebugInfo } from '@/utils/logger'

export type WidgetPhase = 'widget' | 'learning' | 'success' | 'database' | 'hidden'

export interface DetectedField {
  id: string
  label: string
  value: string
  type: string
  sensitive?: boolean
  existingValue?: string
  existingAnswerId?: string
}

export interface FillResult {
  count: number
  debug: FillDebugInfo
}

export interface FloatingWidgetCallbacks {
  onSave?: () => DetectedField[] | Promise<DetectedField[]>
  onFill?: () => Promise<FillResult>
  onConfirm?: (fields: DetectedField[]) => Promise<void>
}

const ICONS = {
  sparkles: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>`,
  database: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>`,
  chevronRight: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>`,
  grip: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="2"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/><circle cx="15" cy="18" r="2"/></svg>`,
  close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`,
}

const TAXONOMY_OPTIONS = [
  'FULL_NAME', 'FIRST_NAME', 'LAST_NAME', 'EMAIL', 'PHONE',
  'SCHOOL', 'DEGREE', 'MAJOR', 'GRAD_DATE', 'GRAD_YEAR', 'GRAD_MONTH',
  'LINKEDIN', 'GITHUB', 'PORTFOLIO', 'LOCATION', 'CITY',
  'WORK_AUTH', 'NEED_SPONSORSHIP', 'START_DATE', 'END_DATE',
  'EEO_GENDER', 'EEO_ETHNICITY', 'EEO_VETERAN', 'EEO_DISABILITY',
  'SALARY', 'GOV_ID', 'RESUME_TEXT', 'UNKNOWN'
]

export class FloatingWidget {
  private container: HTMLElement | null = null
  private styleElement: HTMLStyleElement | null = null
  private currentPhase: WidgetPhase = 'widget'
  private fields: DetectedField[] = []
  private callbacks: FloatingWidgetCallbacks = {}
  
  private position = { right: 24, bottom: 24 }
  private isDragging = false
  private dragStart = { x: 0, y: 0 }
  private dragStartPos = { right: 0, bottom: 0 }

  constructor(callbacks: FloatingWidgetCallbacks = {}) {
    this.callbacks = callbacks
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
  }

  show(): void {
    if (this.container) return
    this.injectStyles()
    this.createContainer()
    this.render()
  }

  hide(): void {
    this.container?.remove()
    this.container = null
  }

  showPhase(phase: WidgetPhase): void {
    this.currentPhase = phase
    if (phase === 'hidden') {
      this.hide()
    } else {
      this.render()
    }
  }

  setFields(fields: DetectedField[]): void {
    this.fields = [...fields]
    if (this.currentPhase === 'learning') {
      this.render()
    }
  }

  private injectStyles(): void {
    if (this.styleElement) return
    this.styleElement = document.createElement('style')
    this.styleElement.textContent = WIDGET_STYLES
    document.head.appendChild(this.styleElement)
  }

  private createContainer(): void {
    this.container = document.createElement('div')
    this.container.className = 'af-widget'
    this.container.setAttribute('data-autofiller-widget', 'true')
    this.updateContainerPosition()
    document.body.appendChild(this.container)
  }

  private updateContainerPosition(): void {
    if (!this.container) return
    this.container.style.right = `${this.position.right}px`
    this.container.style.bottom = `${this.position.bottom}px`
  }

  private handleMouseDown(e: MouseEvent): void {
    e.preventDefault()
    this.isDragging = true
    this.dragStart = { x: e.clientX, y: e.clientY }
    this.dragStartPos = { ...this.position }
    
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('mouseup', this.handleMouseUp)
    
    if (this.container) {
      this.container.style.transition = 'none'
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return
    
    const deltaX = this.dragStart.x - e.clientX
    const deltaY = this.dragStart.y - e.clientY
    
    const maxRight = window.innerWidth - 100
    const maxBottom = window.innerHeight - 100
    
    this.position.right = Math.max(10, Math.min(maxRight, this.dragStartPos.right + deltaX))
    this.position.bottom = Math.max(10, Math.min(maxBottom, this.dragStartPos.bottom + deltaY))
    
    this.updateContainerPosition()
  }

  private handleMouseUp(): void {
    this.isDragging = false
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.handleMouseUp)
    
    if (this.container) {
      this.container.style.transition = ''
    }
  }

  private render(): void {
    if (!this.container) return

    const widgetBar = this.renderWidgetBar()
    let popup = ''

    switch (this.currentPhase) {
      case 'learning':
        popup = this.renderLearningPopup()
        break
      case 'success':
        popup = this.renderSuccessPopup()
        break
      case 'database':
        popup = this.renderDatabasePopup()
        break
    }

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        ${popup}
        ${widgetBar}
      </div>
    `

    this.attachEventListeners()
  }

  private renderWidgetBar(): string {
    return `
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        <div style="background: white; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; overflow: hidden;">
          <div style="display: flex; align-items: center;">
            <div id="af-drag-handle" style="padding: 12px 8px; cursor: grab; color: #6b7280; border-right: 1px solid #f3f4f6; user-select: none;">
              ${ICONS.grip}
            </div>
            <button id="af-btn-save" class="af-btn-hover" style="padding: 12px 16px; font-size: 14px; font-weight: 500; color: #374151; display: flex; align-items: center; gap: 8px; transition: background 0.15s;">
              <span style="color: #3b82f6;">${ICONS.sparkles}</span>
              <span>Save</span>
            </button>
            <div style="width: 1px; height: 24px; background: #e5e7eb;"></div>
            <button id="af-btn-fill" class="af-btn-hover" style="padding: 12px 16px; font-size: 14px; font-weight: 500; color: white; background: linear-gradient(to right, #3b82f6, #2563eb); display: flex; align-items: center; gap: 8px;">
              ${ICONS.check}
              <span>Fill</span>
            </button>
          </div>
        </div>
        <a href="#" id="af-link-database" style="font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 4px; text-decoration: none; transition: color 0.15s; background: white; padding: 6px 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;">
          ${ICONS.database}
          <span>Manage Database</span>
          ${ICONS.chevronRight}
        </a>
      </div>
    `
  }

  private renderLearningPopup(): string {
    const fieldsList = this.fields.map((field, index) => {
      const hasConflict = field.existingValue && field.existingValue !== field.value
      const conflictStyle = hasConflict ? 'background: rgba(239,68,68,0.1); margin: 0 -8px; padding-left: 8px; padding-right: 8px; border-radius: 4px;' : ''
      const rowStyle = field.sensitive ? 'background: rgba(251,191,36,0.1); margin: 0 -8px; padding-left: 8px; padding-right: 8px; border-radius: 4px;' : conflictStyle
      
      return `
      <div class="af-animate-slideIn" style="display: flex; flex-direction: column; gap: 4px; padding: 8px 0; border-bottom: 1px solid #bfdbfe; animation-delay: ${index * 50}ms; ${rowStyle}" data-field-id="${field.id}">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; ${field.type === 'UNKNOWN' ? 'background: #fee2e2;' : hasConflict ? 'background: #fef3c7;' : field.sensitive ? 'background: #fef3c7;' : 'background: #dcfce7;'}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${field.type === 'UNKNOWN' ? '#dc2626' : hasConflict ? '#d97706' : field.sensitive ? '#d97706' : '#16a34a'}" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">${field.label}</div>
            <input type="text" value="${this.escapeHtml(field.value)}" data-field-input="${field.id}" style="width: 100%; font-size: 13px; font-weight: 500; color: #1f2937; background: transparent; border: none; padding: 0; outline: none;">
          </div>
          <button data-delete-field="${field.id}" style="padding: 4px; color: #9ca3af; border-radius: 4px; transition: all 0.15s; flex-shrink: 0;">
            ${ICONS.trash}
          </button>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; margin-left: 28px;">
          <span style="font-size: 10px; color: #9ca3af;">Type:</span>
          <select data-field-type="${field.id}" style="font-size: 11px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 4px; background: white; color: ${field.type === 'UNKNOWN' ? '#dc2626' : '#374151'}; outline: none; cursor: pointer;">
            ${TAXONOMY_OPTIONS.map(t => `<option value="${t}" ${field.type === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          ${field.sensitive ? '<span style="font-size: 10px; color: #d97706; margin-left: 4px;">(sensitive)</span>' : ''}
          ${hasConflict ? `<span style="font-size: 10px; color: #dc2626; margin-left: 4px;">⚠ Will replace: "${this.escapeHtml(field.existingValue || '')}"</span>` : ''}
        </div>
      </div>
    `}).join('')

    return `
      <div class="af-animate-fadeIn" style="position: relative;">
        <div style="background: linear-gradient(to bottom right, #eff6ff, #e0f2fe); border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid #bfdbfe; width: 340px; overflow: hidden;">
          <div style="padding: 16px 16px 8px;">
            <div style="display: flex; align-items: center; gap: 8px; color: #1d4ed8; font-weight: 500;">
              ${ICONS.sparkles}
              <span>I just learned these:</span>
            </div>
            <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">(Edit values and types, then confirm)</p>
          </div>
          <div id="af-fields-list" class="af-scrollbar" style="padding: 0 16px 8px; max-height: 300px; overflow-y: auto;">
            ${fieldsList}
          </div>
          <div style="padding: 12px 16px; background: rgba(255,255,255,0.5); border-top: 1px solid #bfdbfe; display: flex; justify-content: space-between; align-items: center;">
            <button id="af-btn-cancel" style="font-size: 14px; color: #6b7280; transition: color 0.15s;">Cancel</button>
            <button id="af-btn-confirm" class="af-btn-hover" style="padding: 8px 24px; background: linear-gradient(to right, #3b82f6, #2563eb); color: white; font-size: 14px; font-weight: 500; border-radius: 9999px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 8px;">
              ${ICONS.check}
              <span>Confirm</span>
            </button>
          </div>
        </div>
        <div style="position: absolute; bottom: -8px; right: 32px; width: 16px; height: 16px; background: linear-gradient(to bottom right, #eff6ff, #e0f2fe); border-right: 1px solid #bfdbfe; border-bottom: 1px solid #bfdbfe; transform: rotate(45deg);"></div>
      </div>
    `
  }

  private renderSuccessPopup(): string {
    return `
      <div class="af-animate-fadeIn" style="position: relative;">
        <div style="background: linear-gradient(to bottom right, #f0fdf4, #ecfdf5); border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid #86efac; width: 288px; overflow: hidden;">
          <div style="padding: 32px 24px; text-align: center;">
            <div class="af-animate-checkBounce" style="width: 64px; height: 64px; margin: 0 auto 16px; background: linear-gradient(to bottom right, #4ade80, #10b981); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>
            </div>
            <h3 style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">Saved to Database!</h3>
            <p style="font-size: 14px; color: #4b5563; margin-bottom: 16px;">Your answers have been saved and will be used for auto-filling.</p>
            <a href="#" id="af-link-view-db" style="display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: #2563eb; font-weight: 500; text-decoration: none;">
              ${ICONS.database}
              <span>View/Edit Database</span>
              ${ICONS.chevronRight}
            </a>
          </div>
          <div style="padding: 12px 16px; background: rgba(255,255,255,0.5); border-top: 1px solid #86efac; display: flex; justify-content: center;">
            <button id="af-btn-done" class="af-btn-hover" style="padding: 8px 32px; background: linear-gradient(to right, #22c55e, #10b981); color: white; font-size: 14px; font-weight: 500; border-radius: 9999px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 8px;">
              ${ICONS.check}
              <span>Done</span>
            </button>
          </div>
        </div>
        <div style="position: absolute; bottom: -8px; right: 32px; width: 16px; height: 16px; background: linear-gradient(to bottom right, #f0fdf4, #ecfdf5); border-right: 1px solid #86efac; border-bottom: 1px solid #86efac; transform: rotate(45deg);"></div>
      </div>
    `
  }

  private renderDatabasePopup(): string {
    return `
      <div class="af-animate-fadeIn" style="position: relative;">
        <div style="background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; width: 384px; overflow: hidden;">
          <div style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 28px; height: 28px; background: linear-gradient(to bottom right, #3b82f6, #2563eb); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>
              </div>
              <span style="font-weight: 600; color: #1f2937;">Database</span>
            </div>
            <button id="af-btn-close-db" style="padding: 6px; color: #9ca3af; border-radius: 8px; transition: all 0.15s;">
              ${ICONS.close}
            </button>
          </div>
          <div style="padding: 16px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>Open the side panel for full database management.</p>
            <p style="margin-top: 8px; font-size: 12px;">Click the extension icon → Open Side Panel</p>
          </div>
        </div>
        <div style="position: absolute; bottom: -8px; right: 32px; width: 16px; height: 16px; background: white; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; transform: rotate(45deg);"></div>
      </div>
    `
  }

  private attachEventListeners(): void {
    const dragHandle = document.getElementById('af-drag-handle')
    const saveBtn = document.getElementById('af-btn-save')
    const fillBtn = document.getElementById('af-btn-fill')
    const dbLink = document.getElementById('af-link-database')
    const cancelBtn = document.getElementById('af-btn-cancel')
    const confirmBtn = document.getElementById('af-btn-confirm')
    const doneBtn = document.getElementById('af-btn-done')
    const viewDbLink = document.getElementById('af-link-view-db')
    const closeDbBtn = document.getElementById('af-btn-close-db')

    dragHandle?.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    saveBtn?.addEventListener('click', () => this.handleSave())
    fillBtn?.addEventListener('click', () => this.handleFill())
    dbLink?.addEventListener('click', (e) => { e.preventDefault(); this.openSidePanel() })
    cancelBtn?.addEventListener('click', () => this.showPhase('widget'))
    confirmBtn?.addEventListener('click', () => this.handleConfirm())
    doneBtn?.addEventListener('click', () => this.showPhase('widget'))
    viewDbLink?.addEventListener('click', (e) => { e.preventDefault(); this.openSidePanel() })
    closeDbBtn?.addEventListener('click', () => this.showPhase('widget'))

    document.querySelectorAll('[data-delete-field]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-field')
        if (id) {
          this.fields = this.fields.filter(f => f.id !== id)
          const row = document.querySelector(`[data-field-id="${id}"]`)
          row?.remove()
          if (this.fields.length === 0) {
            this.showPhase('widget')
          }
        }
      })
    })

    document.querySelectorAll('[data-field-input]').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = (e.target as HTMLInputElement).getAttribute('data-field-input')
        const value = (e.target as HTMLInputElement).value
        if (id) {
          const field = this.fields.find(f => f.id === id)
          if (field) field.value = value
        }
      })
    })

    document.querySelectorAll('[data-field-type]').forEach(select => {
      select.addEventListener('change', (e) => {
        const id = (e.target as HTMLSelectElement).getAttribute('data-field-type')
        const type = (e.target as HTMLSelectElement).value
        if (id) {
          const field = this.fields.find(f => f.id === id)
          if (field) field.type = type
        }
      })
    })
  }

  private async handleSave(): Promise<void> {
    const saveBtn = document.getElementById('af-btn-save')
    if (saveBtn) {
      saveBtn.innerHTML = `<span class="af-animate-spin" style="width: 16px; height: 16px; border: 2px solid #3b82f6; border-top-color: transparent; border-radius: 50%; display: inline-block;"></span>`
    }

    try {
      if (this.callbacks.onSave) {
        const detectedFields = await this.callbacks.onSave()
        this.fields = detectedFields
      }

      if (this.fields.length > 0) {
        this.showPhase('learning')
      } else {
        showToast('No filled fields detected', 'info')
        this.showPhase('widget')
      }
    } catch (error) {
      console.error('[AutoFiller] Save error:', error)
      showToast('Error detecting fields', 'warning')
      this.showPhase('widget')
    }
  }

  private async handleFill(): Promise<void> {
    if (this.callbacks.onFill) {
      const { count, debug } = await this.callbacks.onFill()
      if (count > 0) {
        showToast(`Filled ${count} fields successfully!`, 'success')
      } else {
        const reason = this.getFailureReason(debug)
        showToast(reason, 'info')
        console.log('[AutoFiller Debug]', debug)
      }
    }
  }

  private getFailureReason(debug: FillDebugInfo): string {
    if (!debug.autofillEnabled) {
      return 'Autofill is disabled for this site. Enable it in settings.'
    }
    if (debug.fieldsScanned === 0) {
      return 'No form fields found on this page.'
    }
    
    const unknownCount = debug.fieldsParsed.filter(f => f.type === 'UNKNOWN').length
    const noAnswersCount = debug.fieldsParsed.filter(f => f.reason?.includes('No matching answers')).length
    
    if (unknownCount === debug.fieldsScanned) {
      return `Found ${debug.fieldsScanned} fields but couldn't identify their types.`
    }
    if (noAnswersCount > 0 && debug.plansCreated === 0) {
      return `Found ${debug.fieldsScanned} fields but no matching answers in database. Save some answers first.`
    }
    if (debug.suggestionsCreated > 0 || debug.sensitiveFieldsFound > 0) {
      return `Found ${debug.suggestionsCreated + debug.sensitiveFieldsFound} fields requiring manual selection (see badges).`
    }
    
    return 'No matching fields found. Check console for debug details.'
  }

  private async handleConfirm(): Promise<void> {
    if (this.callbacks.onConfirm) {
      await this.callbacks.onConfirm(this.fields)
    }
    this.showPhase('success')
  }

  private openSidePanel(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ action: 'openSidePanel' }, (response) => {
        if (!response?.success) {
          showToast('Click extension icon to open side panel', 'info')
        }
      })
    } else {
      showToast('Side panel not available', 'info')
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
