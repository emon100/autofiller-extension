import { WIDGET_STYLES } from './styles'
import { showToast } from './Toast'
import { TAXONOMY_OPTIONS } from '@/utils/typeLabels'
import { isExtensionContextValid, ExtensionContextInvalidatedError, AuthStorage } from '@/storage'
import { t } from '@/i18n'
import type { FillDebugInfo } from '@/utils/logger'
import type { FillAnimationStage } from '@/types'

export type WidgetPhase = 'widget' | 'learning' | 'success' | 'database' | 'filling' | 'hidden'

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

export interface FillAnimationState {
  stage: FillAnimationStage
  currentFieldIndex: number
  totalFields: number
  currentFieldLabel: string
  progress: number  // 0-100
}

export interface FloatingWidgetCallbacks {
  onSave?: () => DetectedField[] | Promise<DetectedField[]>
  onFill?: (animated?: boolean, onProgress?: (state: FillAnimationState) => void) => Promise<FillResult>
  onConfirm?: (fields: DetectedField[]) => Promise<void>
  getSiteKey?: () => string
}

const ICONS = {
  sparkles: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>`,
  database: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>`,
  chevronRight: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>`,
  chevronLeft: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 19l-7-7 7-7"/></svg>`,
  grip: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="2"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/><circle cx="15" cy="18" r="2"/></svg>`,
  close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`,
}

export class FloatingWidget {
  private container: HTMLElement | null = null
  private styleElement: HTMLStyleElement | null = null
  private currentPhase: WidgetPhase = 'widget'
  private fields: DetectedField[] = []
  private callbacks: FloatingWidgetCallbacks = {}
  private sidePanelOpen = false
  private isMinimized = false

  private position = { right: 24, bottom: 24 }
  private isDragging = false
  private dragStart = { x: 0, y: 0 }
  private dragStartPos = { right: 0, bottom: 0 }

  // Animation state
  private fillAnimationState: FillAnimationState = {
    stage: 'idle',
    currentFieldIndex: 0,
    totalFields: 0,
    currentFieldLabel: '',
    progress: 0
  }

  constructor(callbacks: FloatingWidgetCallbacks = {}) {
    this.callbacks = callbacks
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
    this.checkSidePanelState()
  }

  show(): void {
    if (this.container) return
    this.checkMinimizedState()
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
      case 'filling':
        popup = this.renderFillingPopup()
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
    const arrowIcon = this.sidePanelOpen ? ICONS.chevronLeft : ICONS.chevronRight
    const buttonText = this.sidePanelOpen ? 'Close Panel' : 'Manage Database'

    // Minimized state - show small button to restore
    if (this.isMinimized) {
      return `
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
          <button id="af-btn-restore" class="af-btn-hover" style="width: 40px; height: 40px; background: linear-gradient(to right, #3b82f6, #2563eb); border-radius: 50%; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); display: flex; align-items: center; justify-content: center; color: white; transition: transform 0.15s, box-shadow 0.15s;" title="Show OneFillr">
            ${ICONS.sparkles}
          </button>
        </div>
      `
    }

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
            <div style="width: 1px; height: 24px; background: #e5e7eb;"></div>
            <button id="af-btn-minimize" class="af-btn-hover" style="padding: 12px 10px; font-size: 14px; color: #9ca3af; display: flex; align-items: center; transition: color 0.15s;" title="Minimize OneFillr">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>
            </button>
          </div>
        </div>
        <a href="#" id="af-link-database" style="font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 4px; text-decoration: none; transition: color 0.15s; background: white; padding: 6px 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;">
          ${ICONS.database}
          <span>${buttonText}</span>
          ${arrowIcon}
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
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">${this.escapeHtml(field.label)}</div>
            <input type="text" value="${this.escapeHtml(field.value)}" data-field-input="${field.id}" style="width: 100%; font-size: 13px; font-weight: 500; color: #1f2937; background: transparent; border: none; padding: 0; outline: none;">
          </div>
          <button data-delete-field="${field.id}" style="padding: 4px; color: #9ca3af; border-radius: 4px; transition: all 0.15s; flex-shrink: 0;">
            ${ICONS.trash}
          </button>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; margin-left: 28px;">
          <span style="font-size: 10px; color: #9ca3af;">Type:</span>
          <select data-field-type="${field.id}" style="font-size: 11px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 4px; background: white; color: ${field.type === 'UNKNOWN' ? '#dc2626' : '#374151'}; outline: none; cursor: pointer;">
            ${TAXONOMY_OPTIONS.map(t => `<option value="${t.value}" ${field.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
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

  private renderFillingPopup(): string {
    const { stage, currentFieldIndex, totalFields, currentFieldLabel, progress } = this.fillAnimationState

    const stageText = {
      idle: 'Preparing...',
      scanning: 'Scanning',
      thinking: 'Thinking',
      filling: 'Filling',
      done: 'Complete!'
    }[stage] || 'Processing...'

    const stageEmoji = {
      idle: '⏳',
      scanning: '🔍',
      thinking: '🧠',
      filling: '✍️',
      done: '✨'
    }[stage] || '⚙️'

    const dots = stage !== 'done' ? '<span class="af-dot-bounce"></span><span class="af-dot-bounce"></span><span class="af-dot-bounce"></span>' : ''

    return `
      <div class="af-filling-container" style="position: relative;">
        <div class="af-filling-popup">
          <div class="af-filling-header">
            <div class="af-filling-stage" data-stage="${stage}" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>${stageEmoji}</span>
              <span>${stageText}</span>
              <span style="display: inline-flex; gap: 3px; margin-left: 4px;">${dots}</span>
            </div>
            <div class="af-filling-field">
              ${stage === 'filling' && currentFieldLabel ? `📝 ${this.escapeHtml(currentFieldLabel)}` : ''}
              ${stage === 'done' ? '🎉 All fields filled!' : ''}
            </div>
          </div>
          <div class="af-filling-progress">
            <div class="af-progress-bar">
              <div class="af-progress-fill" style="width: ${progress}%;"></div>
            </div>
            <div class="af-filling-stats">
              <span>${stage === 'filling' ? `Field ${currentFieldIndex + 1} of ${totalFields}` : ''}</span>
              <span>${Math.round(progress)}%</span>
            </div>
          </div>
        </div>
        <div style="position: absolute; bottom: -8px; right: 32px; width: 16px; height: 16px; background: linear-gradient(135deg, #1e1b4b, #312e81); border-right: 1px solid rgba(129, 140, 248, 0.3); border-bottom: 1px solid rgba(129, 140, 248, 0.3); transform: rotate(45deg);"></div>
      </div>
    `
  }

  // Update filling animation state - only re-render on stage change
  updateFillAnimationState(state: Partial<FillAnimationState>): void {
    this.fillAnimationState = { ...this.fillAnimationState, ...state }

    if (this.currentPhase === 'filling' && this.container) {
      const stageEl = this.container.querySelector('.af-filling-stage')
      const currentStageAttr = stageEl?.getAttribute('data-stage')

      // Only do full re-render when stage actually changes
      if (state.stage && state.stage !== currentStageAttr) {
        this.render()
        return
      }

      // For same-stage updates, just update dynamic parts (no re-render)
      const fieldEl = this.container.querySelector('.af-filling-field')
      const progressEl = this.container.querySelector('.af-progress-fill') as HTMLElement
      const statsEl = this.container.querySelector('.af-filling-stats')

      if (fieldEl && this.fillAnimationState.currentFieldLabel) {
        fieldEl.innerHTML = `📝 ${this.escapeHtml(this.fillAnimationState.currentFieldLabel)}`
      }

      if (progressEl) {
        progressEl.style.width = `${this.fillAnimationState.progress}%`
      }

      if (statsEl && this.fillAnimationState.stage === 'filling') {
        statsEl.innerHTML = `
          <span>Field ${this.fillAnimationState.currentFieldIndex + 1} of ${this.fillAnimationState.totalFields}</span>
          <span>${Math.round(this.fillAnimationState.progress)}%</span>
        `
      }
    }
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
    const minimizeBtn = document.getElementById('af-btn-minimize')
    const restoreBtn = document.getElementById('af-btn-restore')

    dragHandle?.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    saveBtn?.addEventListener('click', () => this.handleSave())
    fillBtn?.addEventListener('click', () => this.handleFill())
    dbLink?.addEventListener('click', (e) => { e.preventDefault(); this.openSidePanel() })
    cancelBtn?.addEventListener('click', () => this.showPhase('widget'))
    confirmBtn?.addEventListener('click', () => this.handleConfirm())
    doneBtn?.addEventListener('click', () => this.showPhase('widget'))
    viewDbLink?.addEventListener('click', (e) => { e.preventDefault(); this.openSidePanel() })
    closeDbBtn?.addEventListener('click', () => this.showPhase('widget'))
    minimizeBtn?.addEventListener('click', () => this.minimize())
    restoreBtn?.addEventListener('click', () => this.restore())

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
    // Check extension context before attempting save
    if (!isExtensionContextValid()) {
      showToast('Extension updated. Please refresh the page.', 'warning')
      return
    }

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

      // Check if it's an extension context error
      if (error instanceof ExtensionContextInvalidatedError ||
          (error instanceof Error && error.message.includes('Extension context invalidated'))) {
        showToast('Extension updated. Please refresh the page.', 'warning')
      } else {
        showToast('Error detecting fields', 'warning')
      }
      this.showPhase('widget')
    }
  }

  private async handleFill(): Promise<void> {
    const fillBtn = document.getElementById('af-btn-fill')
    if (!fillBtn) return

    // Check extension context before attempting fill
    if (!isExtensionContextValid()) {
      showToast('Extension updated. Please refresh the page.', 'warning')
      return
    }

    const originalContent = fillBtn.innerHTML

    // Check if animation is enabled (default true)
    let animationEnabled = true
    try {
      const result = await chrome.storage.local.get('fillAnimationConfig')
      animationEnabled = result.fillAnimationConfig?.enabled ?? true
    } catch {
      // Default to enabled if storage fails
    }

    if (animationEnabled) {
      // Show animated filling popup
      this.fillAnimationState = {
        stage: 'scanning',
        currentFieldIndex: 0,
        totalFields: 0,
        currentFieldLabel: '',
        progress: 0
      }
      this.showPhase('filling')

      try {
        if (this.callbacks.onFill) {
          const { count, debug } = await this.callbacks.onFill(true, (state) => {
            this.updateFillAnimationState(state)
          })

          if (count > 0) {
            this.updateFillAnimationState({ stage: 'done', progress: 100 })
            showToast(`Filled ${count} fields successfully!`, 'success')

            // Check if user is logged in, if not, prompt to login for AI features
            this.checkAndPromptLogin()
            // Prompt to enable autofill for this site if not enabled
            this.checkAndPromptAutofill()

            // Return to widget after showing complete state
            setTimeout(() => {
              this.showPhase('widget')
            }, 1500)
          } else {
            const reason = this.getFailureReason(debug)
            showToast(reason, 'info')
            console.log('[AutoFiller Debug]', debug)
            this.showPhase('widget')
          }
        }
      } catch (error) {
        console.error('[AutoFiller] Fill error:', error)
        this.showPhase('widget')

        if (error instanceof ExtensionContextInvalidatedError ||
            (error instanceof Error && error.message.includes('Extension context invalidated'))) {
          showToast('Extension updated. Please refresh the page.', 'warning')
        } else {
          showToast('Error filling fields', 'warning')
        }
      }
    } else {
      // Non-animated mode (original behavior)
      fillBtn.innerHTML = `
        <span class="af-animate-spin" style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; display: inline-block;"></span>
        <span>Filling...</span>
      `
      fillBtn.setAttribute('disabled', 'true')
      fillBtn.style.opacity = '0.8'

      try {
        if (this.callbacks.onFill) {
          const { count, debug } = await this.callbacks.onFill(false)

          if (count > 0) {
            fillBtn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>
              <span>Done!</span>
            `
            fillBtn.style.background = 'linear-gradient(to right, #22c55e, #10b981)'
            showToast(`Filled ${count} fields successfully!`, 'success')

            // Check if user is logged in, if not, prompt to login for AI features
            this.checkAndPromptLogin()
            // Prompt to enable autofill for this site if not enabled
            this.checkAndPromptAutofill()

            setTimeout(() => {
              fillBtn.innerHTML = originalContent
              fillBtn.style.background = 'linear-gradient(to right, #3b82f6, #2563eb)'
              fillBtn.style.opacity = '1'
              fillBtn.removeAttribute('disabled')
            }, 1500)
          } else {
            fillBtn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <span>No fields</span>
            `
            fillBtn.style.background = 'linear-gradient(to right, #6b7280, #4b5563)'

            const reason = this.getFailureReason(debug)
            showToast(reason, 'info')
            console.log('[AutoFiller Debug]', debug)

            setTimeout(() => {
              fillBtn.innerHTML = originalContent
              fillBtn.style.background = 'linear-gradient(to right, #3b82f6, #2563eb)'
              fillBtn.style.opacity = '1'
              fillBtn.removeAttribute('disabled')
            }, 1500)
          }
        }
      } catch (error) {
        console.error('[AutoFiller] Fill error:', error)
        fillBtn.innerHTML = originalContent
        fillBtn.style.opacity = '1'
        fillBtn.removeAttribute('disabled')

        if (error instanceof ExtensionContextInvalidatedError ||
            (error instanceof Error && error.message.includes('Extension context invalidated'))) {
          showToast('Extension updated. Please refresh the page.', 'warning')
        } else {
          showToast('Error filling fields', 'warning')
        }
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

  private async checkAndPromptLogin(): Promise<void> {
    try {
      const authStorage = new AuthStorage()
      const authState = await authStorage.getAuthState()

      // If user is not logged in, show login prompt after a delay
      if (!authState?.accessToken) {
        setTimeout(() => {
          showToast(t('toast.loginForAi'), 'info', {
            action: {
              label: t('toast.loginAction'),
              onClick: () => {
                // Open side panel for login
                chrome.runtime.sendMessage({ action: 'openSidePanel' }).catch(() => {
                  // Fallback: show hint to click extension icon
                  showToast(t('toast.sidePanelHint'), 'info')
                })
              }
            }
          })
        }, 2000)
      }
    } catch {
      // Ignore errors - don't disrupt the fill success flow
    }
  }

  private async checkAndPromptAutofill(): Promise<void> {
    try {
      const siteKey = this.callbacks.getSiteKey?.()
      if (!siteKey) return

      // Check if autofill is already enabled for this site
      const result = await chrome.storage.local.get('siteSettings')
      const allSettings = result.siteSettings || {}
      const siteSettings = allSettings[siteKey]

      // If autofill is already enabled or user has explicitly configured this site, don't prompt
      if (siteSettings?.autofillEnabled) return

      // Show prompt to enable autofill for this site
      setTimeout(() => {
        showToast(t('toast.enableAutofillPrompt'), 'info', {
          action: {
            label: t('toast.enableAutofillAction'),
            onClick: async () => {
              try {
                const result = await chrome.storage.local.get('siteSettings')
                const allSettings = result.siteSettings || {}
                const current = allSettings[siteKey] || {
                  siteKey,
                  recordEnabled: true,
                  autofillEnabled: false,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                }
                current.autofillEnabled = true
                current.updatedAt = Date.now()
                allSettings[siteKey] = current
                await chrome.storage.local.set({ siteSettings: allSettings })
                showToast(t('toast.autofillEnabled'), 'success')
              } catch {
                showToast('Failed to enable autofill', 'warning')
              }
            }
          }
        })
      }, 2500) // Show after login prompt
    } catch {
      // Ignore errors - don't disrupt the fill success flow
    }
  }

  private async handleConfirm(): Promise<void> {
    // Check extension context before attempting confirm
    if (!isExtensionContextValid()) {
      showToast('Extension updated. Please refresh the page.', 'warning')
      this.showPhase('widget')
      return
    }

    try {
      if (this.callbacks.onConfirm) {
        await this.callbacks.onConfirm(this.fields)
      }
      this.showPhase('success')
    } catch (error) {
      console.error('[AutoFiller] Confirm error:', error)

      if (error instanceof ExtensionContextInvalidatedError ||
          (error instanceof Error && error.message.includes('Extension context invalidated'))) {
        showToast('Extension updated. Please refresh the page.', 'warning')
      } else {
        showToast('Error saving fields', 'warning')
      }
      this.showPhase('widget')
    }
  }

  private openSidePanel(): void {
    if (!isExtensionContextValid()) {
      showToast('Extension updated. Please refresh the page.', 'warning')
      return
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      if (this.sidePanelOpen) {
        // Side panel is open, send message to close it
        chrome.runtime.sendMessage({ action: 'closeSidePanel' })
        // Immediately update state since pagehide async callback may not complete
        this.sidePanelOpen = false
        this.render()
        return
      }

      chrome.runtime.sendMessage({ action: 'openSidePanel' }, (response) => {
        if (response?.success) {
          this.sidePanelOpen = true
          this.render()
        } else {
          console.error('[AutoFiller] Failed to open side panel:', response?.error)
          showToast('Click extension icon to open side panel', 'info')
        }
      })
    } else {
      showToast('Side panel not available', 'info')
    }
  }

  private checkSidePanelState(): void {
    if (!isExtensionContextValid()) return
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return

    chrome.runtime.sendMessage({ action: 'getSidePanelState' }, (response) => {
      if (!response?.isOpen) return
      this.sidePanelOpen = true
      if (this.container) this.render()
    })
  }

  setSidePanelOpen(isOpen: boolean): void {
    this.sidePanelOpen = isOpen
    if (this.container) this.render()
  }

  private minimize(): void {
    this.isMinimized = true
    this.render()
    // Save minimized state for this session
    try {
      sessionStorage.setItem('af-widget-minimized', 'true')
    } catch {
      // Ignore storage errors
    }
  }

  private restore(): void {
    this.isMinimized = false
    this.render()
    try {
      sessionStorage.removeItem('af-widget-minimized')
    } catch {
      // Ignore storage errors
    }
  }

  // Check if widget was minimized in this session
  checkMinimizedState(): void {
    try {
      this.isMinimized = sessionStorage.getItem('af-widget-minimized') === 'true'
    } catch {
      this.isMinimized = false
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
