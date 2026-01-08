import { AnswerValue } from '@/types'

export type BadgeState =
  | { type: 'filled'; answerId: string; canUndo: boolean }
  | { type: 'suggest'; candidates: AnswerValue[] }
  | { type: 'sensitive'; candidates: AnswerValue[] }
  | { type: 'pending'; value: string }

export type BadgeColor = 'green' | 'blue' | 'gray' | 'yellow'

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
    case 'filled': return 'Auto-filled'
    case 'suggest': return 'Suggestions available'
    case 'sensitive': return 'Sensitive field - click to fill'
    case 'pending': return 'Pending save'
  }
}
