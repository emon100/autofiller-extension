import { AnswerValue, FillSource, FillMethod } from '@/types'

export type BadgeState =
  | { type: 'filled'; answerId: string; canUndo: boolean; source?: FillSource }
  | { type: 'suggest'; candidates: AnswerValue[]; sources?: Map<string, FillSource> }
  | { type: 'sensitive'; candidates: AnswerValue[]; sources?: Map<string, FillSource> }
  | { type: 'pending'; value: string }

export type BadgeColor = 'green' | 'blue' | 'gray' | 'yellow'

/** Human-readable labels for fill methods */
export const FILL_METHOD_LABELS: Record<FillMethod, string> = {
  rule: 'Rule-based',
  llm: 'AI-classified',
  history: 'From history',
  transform: 'Transformed',
}

export function getBadgeColor(state: BadgeState): BadgeColor {
  switch (state.type) {
    case 'filled': return 'green'
    case 'suggest': return 'blue'
    case 'sensitive': return 'gray'
    case 'pending': return 'yellow'
  }
}

export function getBadgeIcon(state: BadgeState): string {
  switch (state.type) {
    case 'filled': return '✓'
    case 'suggest': return '?'
    case 'sensitive': return '⚠'
    case 'pending': return '…'
  }
}

export function getBadgeTooltip(state: BadgeState): string {
  switch (state.type) {
    case 'filled': {
      const base = 'Auto-filled'
      if (state.source) {
        const method = FILL_METHOD_LABELS[state.source.method]
        const confidence = `${Math.round(state.source.confidence * 100)}%`
        const reason = state.source.reason ? ` - ${state.source.reason}` : ''
        return `${base} (${method}, ${confidence}${reason})`
      }
      return base
    }
    case 'suggest': return 'Suggestions available'
    case 'sensitive': return 'Sensitive field - click to fill'
    case 'pending': return 'Pending save'
  }
}
