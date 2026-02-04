'use client'

import React from 'react'
import { Check, Zap, AlertTriangle, Clock } from 'lucide-react'
import { BadgeType } from '@/lib/demo/types'

interface DemoBadgeProps {
  type: BadgeType
  className?: string
}

export function DemoBadge({ type, className = '' }: DemoBadgeProps) {
  const configs: Record<BadgeType, { bg: string; text: string; border: string; icon: React.ReactNode; label: string }> = {
    filled: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: <Check className="w-3 h-3" />,
      label: 'Filled',
    },
    transformed: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: <Zap className="w-3 h-3" />,
      label: 'Transformed',
    },
    suggest: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: null,
      label: 'Suggest',
    },
    sensitive: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: <AlertTriangle className="w-3 h-3" />,
      label: 'Sensitive',
    },
    pending: {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      border: 'border-gray-200',
      icon: <Clock className="w-3 h-3" />,
      label: 'Pending',
    },
  }

  const config = configs[type]

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        ${config.bg} ${config.text} border ${config.border}
        animate-fade-in
        ${className}
      `}
    >
      {config.icon}
      {config.label}
    </span>
  )
}

interface FieldBadgeWrapperProps {
  badge: BadgeType | null
  children: React.ReactNode
}

export function FieldBadgeWrapper({ badge, children }: FieldBadgeWrapperProps) {
  return (
    <div className="relative group">
      {children}
      {badge && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-2">
          <DemoBadge type={badge} />
        </div>
      )}
    </div>
  )
}
