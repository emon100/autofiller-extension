'use client'

import React from 'react'
import { Linkedin, Building2, Briefcase, FileText, Split, Calendar, Phone, ToggleLeft } from 'lucide-react'
import { useDemoContext } from './DemoContext'
import { FORM_TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/demo/templates'

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="w-3.5 h-3.5" />,
  greenhouse: <Building2 className="w-3.5 h-3.5" />,
  workday: <Briefcase className="w-3.5 h-3.5" />,
  generic: <FileText className="w-3.5 h-3.5" />,
  'synonym-name': <Split className="w-3.5 h-3.5" />,
  'synonym-date': <Calendar className="w-3.5 h-3.5" />,
  'synonym-phone': <Phone className="w-3.5 h-3.5" />,
  'synonym-bool': <ToggleLeft className="w-3.5 h-3.5" />,
}

export function FormTemplateSelector() {
  const { currentTemplate, loadTemplate } = useDemoContext()

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Form Templates</h3>

      {TEMPLATE_CATEGORIES.map(category => (
        <div key={category.name} className="space-y-1.5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{category.name}</p>
          <div className="space-y-1">
            {category.templates.map(templateId => {
              const template = FORM_TEMPLATES[templateId]
              if (!template) return null

              const isActive = currentTemplate?.id === templateId
              const isRealSite = category.name === 'Real Job Sites'

              return (
                <button
                  key={templateId}
                  onClick={() => loadTemplate(templateId)}
                  className={`
                    w-full px-3 py-2 text-left text-xs rounded-lg border transition-colors
                    ${isActive
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : isRealSite
                        ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        : 'border-purple-200 bg-purple-50/50 hover:border-purple-300 hover:bg-purple-50'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    {TEMPLATE_ICONS[templateId]}
                    <span className="font-medium">{template.title}</span>
                  </div>
                  <span className={`block mt-0.5 ${isActive ? 'text-blue-400' : 'text-gray-400'}`}>
                    {template.subtitle}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
