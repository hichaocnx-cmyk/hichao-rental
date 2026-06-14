import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

// ── Notification type config ────────────────────────────────────
const N_CFG = {
  overdue: {
    label: 'เกินกำหนด',
    dot:   'bg-red-500',
    badge: 'bg-red-50 text-red-600',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
    iconBg: 'bg-red-50 text-red-500',
  },
  due_today: {
    label: 'คืนวันนี้',
    dot:   'bg-orange-400',
    badge: 'bg-orange-50 text-orange-600',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    iconBg: 'bg-orange-50 text-orange-500',
  },
  due_tomorrow: {
    label: 'คืนพรุ่งนี้',
    dot:   'bg-amber-400',
    badge: 'bg-amber-50 text-amber-600',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
    iconBg: 'bg-amber-50 text-amber-500',
  },
}

function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${String(y).slice(2)}`
}

export default function Topbar({ onMenuClick, title = 'Dashboard' }) {
  const { notifications, unreadCount, readIds, markRead, markAllRead } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  const today = new Date().toLocaleDateString('th-TH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const escHandler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', escHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', escHandler)
    }
  }, [])

  // Group by type for section headers
  const overdue    = notifications.filter(n => n.type === 'overdue')
  const dueToday   = notifications.filter(n => n.type === 'due_today')
  const dueTomorrow = notifications.filter(n => n.type === 'due_tomorrow')

  const grouped = [
    { key: 'overdue',      items: overdue    },
    { key: 'due_today',    items: dueToday   },
    { key: 'due_tomorrow', items: dueTomorrow },
  ].filter(g => g.items.length > 0)

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <img src="/logo.png" alt="HICHAO Camera" className="lg:hidden h-7 w-auto" />
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm text-gray-400">{today}</span>

        {/* ── Bell + Dropdown ─────────────────────────────────── */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(o => !o)}
            className={`relative p-2 rounded-xl transition-colors ${
              open ? 'bg-brand-50 text-brand-500' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">การแจ้งเตือน</p>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead}
                    className="text-[11px] text-brand-500 hover:text-brand-600 font-medium">
                    อ่านทั้งหมด
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="max-h-80 overflow-y-auto">
                {grouped.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-400">ไม่มีการแจ้งเตือน</p>
                    <p className="text-xs text-gray-300">ทุกอย่างปกติดี</p>
                  </div>
                ) : (
                  grouped.map(group => {
                    const cfg = N_CFG[group.key]
                    return (
                      <div key={group.key}>
                        {/* Group label */}
                        <div className={`px-4 py-1.5 flex items-center gap-1.5 ${cfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            {cfg.label} ({group.items.length})
                          </span>
                        </div>
                        {/* Items */}
                        {group.items.map(n => {
                          const isRead = readIds.has(n.id)
                          return (
                            <div key={n.id}
                              onClick={() => { markRead(n.id); setOpen(false); navigate('/rentals') }}
                              className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                                !isRead ? 'bg-brand-50/30' : ''
                              }`}
                            >
                              {/* Icon */}
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
                                {cfg.icon}
                              </div>
                              {/* Text */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-semibold text-gray-800 truncate">
                                    {n.rental?.camera?.name || 'กล้อง'}
                                  </p>
                                  {!isRead && (
                                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                                  {n.rental?.customer?.name || '—'}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  คืน {fmtDate(n.date)}
                                  {n.rental?.return_time ? ` · ${n.rental.return_time.slice(0,5)}` : ''}
                                </p>
                              </div>
                              {/* Arrow */}
                              <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                              </svg>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="border-t border-gray-50 px-4 py-2.5">
                  <button
                    onClick={() => { setOpen(false); navigate('/notifications') }}
                    className="w-full text-center text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors"
                  >
                    ดูทั้งหมด {notifications.length} รายการ →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
          <span className="text-brand-600 text-xs font-bold">HC</span>
        </div>
      </div>
    </header>
  )
}
