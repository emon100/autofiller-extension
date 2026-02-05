export type ToastType = 'success' | 'warning' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  action?: ToastAction
}

let toastContainer: HTMLElement | null = null
let toastIdCounter = 0

function ensureContainer(): HTMLElement {
  if (toastContainer && document.body.contains(toastContainer)) {
    return toastContainer
  }

  toastContainer = document.createElement('div')
  toastContainer.className = 'af-toast-container'
  document.body.appendChild(toastContainer)
  return toastContainer
}

export function showToast(
  message: string,
  type: ToastType = 'info',
  undoCallbackOrOptions?: (() => void) | ToastOptions
): number {
  const container = ensureContainer()
  const id = ++toastIdCounter

  // Handle both old (undoCallback) and new (options) signature
  let undoCallback: (() => void) | undefined
  let options: ToastOptions | undefined

  if (typeof undoCallbackOrOptions === 'function') {
    undoCallback = undoCallbackOrOptions
  } else if (undoCallbackOrOptions) {
    options = undoCallbackOrOptions
  }

  const toast = document.createElement('div')
  toast.id = `af-toast-${id}`
  toast.className = `af-toast af-toast-${type} af-animate-toastIn`

  const bgColors: Record<ToastType, string> = {
    success: '#16a34a',
    warning: '#f59e0b',
    info: '#1f2937'
  }
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    color: white;
    font-size: 14px;
    background: ${bgColors[type]};
  `

  const textSpan = document.createElement('span')
  textSpan.textContent = message
  toast.appendChild(textSpan)

  // Undo button (legacy support)
  if (type === 'success' && undoCallback) {
    const undoBtn = document.createElement('button')
    undoBtn.textContent = 'Undo'
    undoBtn.style.cssText = `
      color: rgba(255,255,255,0.8);
      text-decoration: underline;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
    `
    undoBtn.onmouseover = () => undoBtn.style.color = 'white'
    undoBtn.onmouseout = () => undoBtn.style.color = 'rgba(255,255,255,0.8)'
    undoBtn.onclick = () => {
      removeToast(id)
      undoCallback!()
    }
    toast.appendChild(undoBtn)
  }

  // Action button (new)
  if (options?.action) {
    const actionBtn = document.createElement('button')
    actionBtn.textContent = options.action.label
    actionBtn.style.cssText = `
      color: white;
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 6px;
      padding: 4px 12px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    `
    actionBtn.onmouseover = () => actionBtn.style.background = 'rgba(255,255,255,0.3)'
    actionBtn.onmouseout = () => actionBtn.style.background = 'rgba(255,255,255,0.2)'
    const handler = options.action.onClick
    actionBtn.onclick = () => {
      removeToast(id)
      handler()
    }
    toast.appendChild(actionBtn)
  }

  const closeBtn = document.createElement('button')
  closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`
  closeBtn.style.cssText = `
    color: rgba(255,255,255,0.6);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
  `
  closeBtn.onmouseover = () => closeBtn.style.color = 'white'
  closeBtn.onmouseout = () => closeBtn.style.color = 'rgba(255,255,255,0.6)'
  closeBtn.onclick = () => removeToast(id)
  toast.appendChild(closeBtn)

  container.appendChild(toast)

  setTimeout(() => removeToast(id), 5000)

  return id
}

export function removeToast(id: number): void {
  const toast = document.getElementById(`af-toast-${id}`)
  if (toast) {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(20px)'
    toast.style.transition = 'all 0.3s ease-out'
    setTimeout(() => toast.remove(), 300)
  }
}
