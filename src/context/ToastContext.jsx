import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)
const ConfirmContext = createContext(null)

// ── Toast types config ──────────────────────────────────────────
const TYPE_CFG = {
  success: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    chip: 'bg-emerald-50',
    icon_cls: 'text-emerald-500',
  },
  error: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
    chip: 'bg-red-50',
    icon_cls: 'text-red-500',
  },
  info: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
      </svg>
    ),
    chip: 'bg-sky-50',
    icon_cls: 'text-sky-500',
  },
  warning: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    ),
    chip: 'bg-amber-50',
    icon_cls: 'text-amber-500',
  },
}

// ── Toast item ──────────────────────────────────────────────────
function ToastItem({ toast, onRemove }) {
  const cfg = TYPE_CFG[toast.type] || TYPE_CFG.info
  return (
    <div
      className="flex items-start gap-3 bg-white border border-gray-100 rounded-2xl shadow-lg px-4 py-3 w-full max-w-sm pointer-events-auto"
      style={{ animation: 'hcToastIn .3s cubic-bezier(.22,1,.36,1)' }}
    >
      {/* icon chip */}
      <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${cfg.chip} ${cfg.icon_cls}`}>{cfg.icon}</span>
      {/* message */}
      <p className="flex-1 text-sm text-gray-800 leading-snug">{toast.message}</p>
      {/* close */}
      <button onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors mt-0.5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ── Confirm Dialog ──────────────────────────────────────────────
function ConfirmDialog({ dialog, onResolve }) {
  if (!dialog) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          {dialog.icon && (
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 ${
              dialog.variant === 'danger' ? 'bg-red-50' : 'bg-brand-50'
            }`}>
              {dialog.icon}
            </div>
          )}
          <p className="text-base font-semibold text-gray-900">{dialog.title}</p>
          {dialog.message && (
            <p className="text-sm text-gray-500 mt-1">{dialog.message}</p>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={() => onResolve(false)}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
            {dialog.cancelLabel || 'ยกเลิก'}
          </button>
          <button onClick={() => onResolve(true)}
            className={`flex-1 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors ${
              dialog.variant === 'danger'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-brand-500 hover:bg-brand-600'
            }`}>
            {dialog.confirmLabel || 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Providers ───────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const resolveRef = useRef(null)
  const counter = useRef(0)

  const remove = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++counter.current
    setToasts(t => [...t.slice(-4), { id, message, type }])
    setTimeout(() => remove(id), duration)
  }, [remove])

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error:   (msg, dur) => addToast(msg, 'error', dur ?? 5000),
    info:    (msg, dur) => addToast(msg, 'info', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
  }

  // confirm() replacement — returns Promise<boolean>
  const confirm = useCallback((opts) => {
    return new Promise(resolve => {
      setDialog(typeof opts === 'string' ? { title: opts } : opts)
      resolveRef.current = resolve
    })
  }, [])

  const handleResolve = (value) => {
    setDialog(null)
    resolveRef.current?.(value)
    resolveRef.current = null
  }

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        {/* Toast container — bottom-right on desktop, bottom-center on mobile */}
        <div className="fixed bottom-6 right-4 sm:right-6 z-[9998] flex flex-col gap-2 items-end pointer-events-none w-full sm:w-auto">
          <style>{`
            @keyframes hcToastIn {
              0%   { opacity: 0; transform: translateY(14px) scale(0.95); }
              60%  { opacity: 1; transform: translateY(-2px) scale(1.015); }
              100% { opacity: 1; transform: translateY(0)    scale(1); }
            }
          `}</style>
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onRemove={remove} />
          ))}
        </div>

        {/* Confirm dialog */}
        <ConfirmDialog dialog={dialog} onResolve={handleResolve} />
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}

export const useToast   = () => useContext(ToastContext)
export const useConfirm = () => useContext(ConfirmContext)
