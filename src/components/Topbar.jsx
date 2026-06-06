import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Topbar({ onMenuClick, title = 'Dashboard' }) {
  const { notifications, unreadCount, readIds, markRead, markAllRead } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  const today = new Date().toLocaleDateString('th-TH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // ปิด dropdown เมื่อคลิกนอก
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const typeStyle = {
    overdue:      { cls: 'bg-red-100 text-red-700',    dot: 'bg-red-500'    },
    due_today:    { cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
    due_tomorrow: { cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  }

  const preview = notifications.slice(0, 5)

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm text-gray-500">{today}</span>

        {/* Bell */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => { setOpen(o => !o) }}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="font-semibold text-gray-900 text-sm">การแจ้งเตือน</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-brand-500 hover:underline">
                    อ่านทั้งหมด
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto">
                {preview.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">ไม่มีการแจ้งเตือน</div>
                ) : (
                  preview.map(n => {
                    const s = typeStyle[n.type] || typeStyle.due_tomorrow
                    const isRead = readIds.has(n.id)
                    return (
                      <div
                        key={n.id}
                        onClick={() => { markRead(n.id); setOpen(false); navigate('/notifications') }}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!isRead ? 'bg-blue-50/40' : ''}`}
                      >
                        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.cls}`}>{n.title}</span>
                            {!isRead && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">{n.body}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">คืน {n.date}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-2.5">
                  <button
                    onClick={() => { setOpen(false); navigate('/notifications') }}
                    className="w-full text-center text-xs text-brand-500 hover:underline font-medium"
                  >
                    ดูทั้งหมด ({notifications.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
          <span className="text-brand-600 text-xs font-bold">HC</span>
        </div>
      </div>
    </header>
  )
}
