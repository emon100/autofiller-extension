import { FieldContext, AnswerValue, FillSource } from '@/types'
import { BadgeState, getBadgeColor, getBadgeIcon, getBadgeTooltip, FILL_METHOD_LABELS } from './Badge'

const BADGE_CLASS = 'autofiller-badge'
const BADGE_DROPDOWN_CLASS = 'autofiller-badge-dropdown'
const BADGE_Z_INDEX = 2147483647

export interface BadgeCallbacks {
  onCandidateSelect?: (field: FieldContext, answer: AnswerValue) => void
  onUndo?: (field: FieldContext) => void
  onDismiss?: (field: FieldContext) => void
}

export class BadgeManager {
  private badges = new Map<HTMLElement, HTMLElement>()
  private callbacks: BadgeCallbacks = {}
  private styleInjected = false

  constructor(callbacks: BadgeCallbacks = {}) {
    this.callbacks = callbacks
  }

  showBadge(field: FieldContext, state: BadgeState): void {
    this.injectStyles()
    
    const existing = this.badges.get(field.element)
    if (existing) {
      this.updateBadgeContent(existing, state, field)
      return
    }

    const badge = this.createBadge(state, field)
    this.insertBadgeNextToElement(field.element, badge)
    this.badges.set(field.element, badge)
  }

  hideBadge(field: FieldContext): void {
    const badge = this.badges.get(field.element)
    if (badge) {
      badge.remove()
      this.badges.delete(field.element)
    }
  }

  updateBadge(field: FieldContext, state: BadgeState): void {
    const badge = this.badges.get(field.element)
    if (badge) {
      this.updateBadgeContent(badge, state, field)
    }
  }

  hideAll(): void {
    for (const badge of this.badges.values()) {
      badge.remove()
    }
    this.badges.clear()
  }

  private createBadge(state: BadgeState, field: FieldContext): HTMLElement {
    const badge = document.createElement('span')
    badge.className = BADGE_CLASS
    badge.setAttribute('data-state', state.type)
    
    this.updateBadgeContent(badge, state, field)
    
    return badge
  }

  private updateBadgeContent(badge: HTMLElement, state: BadgeState, field: FieldContext): void {
    const color = getBadgeColor(state)
    const icon = getBadgeIcon(state)
    const tooltip = getBadgeTooltip(state)

    badge.setAttribute('data-state', state.type)
    badge.setAttribute('data-color', color)
    badge.title = tooltip

    badge.innerHTML = ''

    const iconSpan = document.createElement('span')
    iconSpan.className = 'autofiller-badge-icon'
    iconSpan.textContent = icon
    badge.appendChild(iconSpan)

    if (state.type === 'filled' && state.canUndo) {
      const undoBtn = document.createElement('button')
      undoBtn.className = 'autofiller-badge-undo'
      undoBtn.textContent = '×'
      undoBtn.title = 'Undo'
      undoBtn.onclick = (e) => {
        e.stopPropagation()
        this.callbacks.onUndo?.(field)
        this.hideBadge(field)
      }
      badge.appendChild(undoBtn)
    }

    if (state.type === 'suggest' || state.type === 'sensitive') {
      badge.onclick = () => this.showDropdown(badge, state.candidates, field, state.sources)
    }
  }

  private showDropdown(badge: HTMLElement, candidates: AnswerValue[], field: FieldContext, sources?: Map<string, FillSource>): void {
    const existingDropdown = badge.querySelector(`.${BADGE_DROPDOWN_CLASS}`)
    if (existingDropdown) {
      existingDropdown.remove()
      return
    }

    const dropdown = document.createElement('div')
    dropdown.className = BADGE_DROPDOWN_CLASS

    for (const candidate of candidates) {
      const item = document.createElement('button')
      item.className = 'autofiller-badge-dropdown-item'
      item.textContent = candidate.display || candidate.value

      // Build tooltip with source info
      const source = sources?.get(candidate.id)
      let tooltipText = `${candidate.type}: ${candidate.value}`
      if (source) {
        const method = FILL_METHOD_LABELS[source.method]
        const confidence = `${Math.round(source.confidence * 100)}%`
        tooltipText += `\n(${method}, ${confidence})`
        if (source.reason) {
          tooltipText += `\n${source.reason}`
        }
      }
      item.title = tooltipText

      item.onclick = (e) => {
        e.stopPropagation()
        this.callbacks.onCandidateSelect?.(field, candidate)
        dropdown.remove()
        this.updateBadge(field, { type: 'filled', answerId: candidate.id, canUndo: true, source })
      }
      dropdown.appendChild(item)
    }

    const dismissItem = document.createElement('button')
    dismissItem.className = 'autofiller-badge-dropdown-item autofiller-badge-dismiss'
    dismissItem.textContent = 'Dismiss'
    dismissItem.onclick = (e) => {
      e.stopPropagation()
      this.callbacks.onDismiss?.(field)
      this.hideBadge(field)
    }
    dropdown.appendChild(dismissItem)

    badge.appendChild(dropdown)

    const closeDropdown = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node) && !badge.contains(e.target as Node)) {
        dropdown.remove()
        document.removeEventListener('click', closeDropdown)
      }
    }
    setTimeout(() => document.addEventListener('click', closeDropdown), 0)
  }

  private insertBadgeNextToElement(element: HTMLElement, badge: HTMLElement): void {
    element.insertAdjacentElement('afterend', badge)
  }

  private injectStyles(): void {
    if (this.styleInjected) return
    this.styleInjected = true

    const style = document.createElement('style')
    style.textContent = `
      .${BADGE_CLASS} {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        cursor: pointer;
        transition: all 0.15s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        user-select: none;
        vertical-align: middle;
        margin-left: 4px;
        position: relative;
        z-index: ${BADGE_Z_INDEX};
      }
      
      .${BADGE_CLASS}[data-color="green"] {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #86efac;
      }
      
      .${BADGE_CLASS}[data-color="blue"] {
        background: #dbeafe;
        color: #1e40af;
        border: 1px solid #93c5fd;
      }
      
      .${BADGE_CLASS}[data-color="gray"] {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
      }
      
      .${BADGE_CLASS}[data-color="yellow"] {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fcd34d;
      }
      
      .${BADGE_CLASS}:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      }
      
      .autofiller-badge-icon {
        font-size: 11px;
      }
      
      .autofiller-badge-undo {
        background: none;
        border: none;
        padding: 0 2px;
        margin-left: 2px;
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.15s;
        font-size: 14px;
        line-height: 1;
        color: inherit;
      }

      .${BADGE_CLASS}:hover .autofiller-badge-undo {
        opacity: 1;
      }

      .autofiller-badge-undo:hover {
        opacity: 1;
        color: #dc2626;
      }
      
      .${BADGE_DROPDOWN_CLASS} {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 4px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 150px;
        max-width: 250px;
        z-index: ${BADGE_Z_INDEX};
        overflow: hidden;
      }
      
      .autofiller-badge-dropdown-item {
        display: block;
        width: 100%;
        padding: 8px 12px;
        border: none;
        background: none;
        text-align: left;
        cursor: pointer;
        font-size: 13px;
        color: #374151;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .autofiller-badge-dropdown-item:hover {
        background: #f3f4f6;
      }
      
      .autofiller-badge-dismiss {
        color: #6b7280;
        border-top: 1px solid #e5e7eb;
      }
    `
    document.head.appendChild(style)
  }
}
