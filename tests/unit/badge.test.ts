import { describe, it, expect } from 'vitest'
import { getBadgeColor, getBadgeIcon, getBadgeTooltip, BadgeState } from '@/ui/Badge'

describe('Badge', () => {
  describe('getBadgeColor', () => {
    it('returns green for filled state', () => {
      const state: BadgeState = { type: 'filled', answerId: '1', canUndo: true }
      expect(getBadgeColor(state)).toBe('green')
    })

    it('returns blue for suggest state', () => {
      const state: BadgeState = { type: 'suggest', candidates: [] }
      expect(getBadgeColor(state)).toBe('blue')
    })

    it('returns gray for sensitive state', () => {
      const state: BadgeState = { type: 'sensitive', candidates: [] }
      expect(getBadgeColor(state)).toBe('gray')
    })

    it('returns yellow for pending state', () => {
      const state: BadgeState = { type: 'pending', value: 'test' }
      expect(getBadgeColor(state)).toBe('yellow')
    })
  })

  describe('getBadgeIcon', () => {
    it('returns checkmark for filled', () => {
      const state: BadgeState = { type: 'filled', answerId: '1', canUndo: true }
      expect(getBadgeIcon(state)).toBe('✓')
    })

    it('returns question mark for suggest', () => {
      const state: BadgeState = { type: 'suggest', candidates: [] }
      expect(getBadgeIcon(state)).toBe('?')
    })

    it('returns warning for sensitive', () => {
      const state: BadgeState = { type: 'sensitive', candidates: [] }
      expect(getBadgeIcon(state)).toBe('⚠')
    })

    it('returns ellipsis for pending', () => {
      const state: BadgeState = { type: 'pending', value: 'test' }
      expect(getBadgeIcon(state)).toBe('…')
    })
  })

  describe('getBadgeTooltip', () => {
    it('returns correct tooltip for each state', () => {
      expect(getBadgeTooltip({ type: 'filled', answerId: '1', canUndo: true })).toBe('Auto-filled')
      expect(getBadgeTooltip({ type: 'suggest', candidates: [] })).toBe('Suggestions available')
      expect(getBadgeTooltip({ type: 'sensitive', candidates: [] })).toBe('Sensitive field - click to fill')
      expect(getBadgeTooltip({ type: 'pending', value: 'test' })).toBe('Pending save')
    })
  })
})
