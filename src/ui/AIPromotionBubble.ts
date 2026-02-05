/**
 * AI Promotion Bubble - Shows after fill completion when LLM is disabled
 *
 * Encourages users to try AI features when there are unrecognized fields.
 */

import { t } from '@/i18n'

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export interface AIPromotionState {
  lastDismissedAt: number   // Timestamp when user clicked "don't remind"
  impressions: number       // Total times shown
  conversions: number       // Times user clicked "try AI"
}

const STORAGE_KEY = 'aiPromotionState'

export class AIPromotionBubble {
  private container: HTMLElement | null = null

  async shouldShow(llmEnabled: boolean, unrecognizedCount: number, totalFields: number): Promise<boolean> {
    // Don't show if LLM is already enabled
    if (llmEnabled) return false

    // Don't show if no unrecognized fields
    if (unrecognizedCount === 0) return false

    // Don't show if fill rate is already high (>80%)
    if (totalFields > 0 && ((totalFields - unrecognizedCount) / totalFields) > 0.8) return false

    // Check if user dismissed recently
    const state = await this.getState()
    if (state.lastDismissedAt && (Date.now() - state.lastDismissedAt < THREE_DAYS_MS)) {
      return false
    }

    return true
  }

  async show(filledCount: number, totalFields: number, onTryAI: () => void): Promise<void> {
    this.hide()

    // Increment impressions
    const state = await this.getState()
    state.impressions++
    await this.setState(state)

    const fillRate = totalFields > 0 ? Math.round((filledCount / totalFields) * 100) : 0

    this.container = document.createElement('div')
    this.container.className = 'af-ai-promo-bubble'
    this.container.innerHTML = `
      <div class="af-ai-promo-content">
        <div class="af-ai-promo-header">
          <span class="af-ai-promo-icon">✨</span>
          <span class="af-ai-promo-title">${t('aiPromo.title')}</span>
        </div>

        <div class="af-ai-promo-stats">
          <div class="af-ai-promo-stat-row">
            <span>${t('aiPromo.thisFill')}</span>
            <span class="af-ai-promo-stat-value">${t('aiPromo.fields', { filled: filledCount, total: totalFields, rate: fillRate })}</span>
          </div>
          <div class="af-ai-promo-stat-row">
            <span>${t('aiPromo.withAi')}</span>
            <span class="af-ai-promo-stat-value af-ai-promo-highlight">${t('aiPromo.canRecognize')}</span>
          </div>
        </div>

        <ul class="af-ai-promo-benefits">
          <li>• ${t('aiPromo.benefit1')}</li>
          <li>• ${t('aiPromo.benefit2')}</li>
          <li>• ${t('aiPromo.benefit3')}</li>
        </ul>

        <div class="af-ai-promo-actions">
          <button id="af-ai-promo-dismiss" class="af-ai-promo-btn-secondary">
            ${t('aiPromo.dismiss')}
          </button>
          <button id="af-ai-promo-try" class="af-ai-promo-btn-primary">
            ✨ ${t('aiPromo.tryAi')}
          </button>
        </div>

        <p class="af-ai-promo-privacy">
          ${t('aiPromo.privacy')}
        </p>
      </div>
    `

    // Add styles
    this.injectStyles()

    document.body.appendChild(this.container)

    // Attach event listeners
    const dismissBtn = this.container.querySelector('#af-ai-promo-dismiss')
    const tryBtn = this.container.querySelector('#af-ai-promo-try')

    dismissBtn?.addEventListener('click', async () => {
      const state = await this.getState()
      state.lastDismissedAt = Date.now()
      await this.setState(state)
      this.hide()
    })

    tryBtn?.addEventListener('click', async () => {
      const state = await this.getState()
      state.conversions++
      await this.setState(state)
      this.hide()
      onTryAI()
    })

    // Auto-hide after 15 seconds
    setTimeout(() => this.hide(), 15000)
  }

  hide(): void {
    this.container?.remove()
    this.container = null
  }

  private async getState(): Promise<AIPromotionState> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      return result[STORAGE_KEY] || {
        lastDismissedAt: 0,
        impressions: 0,
        conversions: 0,
      }
    } catch {
      return {
        lastDismissedAt: 0,
        impressions: 0,
        conversions: 0,
      }
    }
  }

  private async setState(state: AIPromotionState): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: state })
    } catch {
      // Ignore storage errors
    }
  }

  private injectStyles(): void {
    if (document.getElementById('af-ai-promo-styles')) return

    const style = document.createElement('style')
    style.id = 'af-ai-promo-styles'
    style.textContent = `
      .af-ai-promo-bubble {
        position: fixed;
        bottom: 100px;
        right: 24px;
        z-index: 2147483647;
        animation: af-slideUp 0.3s ease-out;
      }

      @keyframes af-slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .af-ai-promo-content {
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
        border-radius: 16px;
        padding: 16px;
        width: 300px;
        color: white;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      .af-ai-promo-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .af-ai-promo-icon {
        font-size: 20px;
      }

      .af-ai-promo-title {
        font-size: 14px;
        font-weight: 600;
      }

      .af-ai-promo-stats {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 12px;
      }

      .af-ai-promo-stat-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-bottom: 4px;
      }

      .af-ai-promo-stat-row:last-child {
        margin-bottom: 0;
      }

      .af-ai-promo-stat-value {
        font-weight: 500;
      }

      .af-ai-promo-highlight {
        color: #a5b4fc;
      }

      .af-ai-promo-benefits {
        list-style: none;
        padding: 0;
        margin: 0 0 12px 0;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
      }

      .af-ai-promo-benefits li {
        margin-bottom: 4px;
      }

      .af-ai-promo-actions {
        display: flex;
        gap: 8px;
      }

      .af-ai-promo-btn-secondary {
        flex: 1;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.8);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s;
      }

      .af-ai-promo-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .af-ai-promo-btn-primary {
        flex: 1;
        padding: 8px 12px;
        background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
      }

      .af-ai-promo-btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      }

      .af-ai-promo-privacy {
        text-align: center;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        margin-top: 8px;
        margin-bottom: 0;
      }
    `
    document.head.appendChild(style)
  }
}

export const aiPromotionBubble = new AIPromotionBubble()
