'use client'

import React, { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

export type ToastType = 'success' | 'warning' | 'info' | 'error'

interface Toast {
  id: number
  message: string
  type: ToastType
  onUndo?: () => void
}

let toastIdCounter = 0
const toastListeners: Set<(toast: Toast) => void> = new Set()
const removeListeners: Set<(id: number) => void> = new Set()

export function showDemoToast(message: string, type: ToastType = 'info', onUndo?: () => void) {
  const toast: Toast = {
    id: ++toastIdCounter,
    message,
    type,
    onUndo,
  }
  toastListeners.forEach(listener => listener(toast))
  return toast.id
}

export function removeDemoToast(id: number) {
  removeListeners.forEach(listener => listener(id))
}

export function DemoToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const addToast = (toast: Toast) => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 4000)
    }

    const removeToast = (id: number) => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }

    toastListeners.add(addToast)
    removeListeners.add(removeToast)

    return () => {
      toastListeners.delete(addToast)
      removeListeners.delete(removeToast)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-2" style={{ width: 320 }}>
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [exiting, setExiting] = useState(false)

  const handleClose = () => {
    setExiting(true)
    setTimeout(onClose, 300)
  }

  const colors: Record<ToastType, string> = {
    success: 'bg-green-600',
    warning: 'bg-amber-500',
    info: 'bg-blue-600',
    error: 'bg-red-600',
  }

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4" />,
    warning: <AlertCircle className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
  }

  return (
    <div
      className={`
        px-4 py-3 rounded-xl shadow-lg ${colors[toast.type]} text-white text-sm
        flex items-center justify-between gap-2
        ${exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}
      `}
    >
      <div className="flex items-center gap-2">
        {icons[toast.type]}
        <span>{toast.message}</span>
      </div>
      <div className="flex items-center gap-2">
        {toast.onUndo && (
          <button
            onClick={() => {
              toast.onUndo?.()
              handleClose()
            }}
            className="px-2 py-1 text-xs bg-white/20 hover:bg-white/30 rounded"
          >
            Undo
          </button>
        )}
        <button onClick={handleClose} className="opacity-70 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
