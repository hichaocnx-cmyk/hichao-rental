import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { sendLineNotify } from '../lib/lineNotify'
import { useToast } from '../context/ToastContext'
import EmptyState from '../components/EmptyState'

const TYPE_CONFIG = {
  overdue:      { label: 'เกินกำหนด',      cls: 'bg-red-100 text-red-700',      dot: 'bg-red-500',    border: 'border-red-200'    },
  due_today:    { label: 'คืนวันนี้',       cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', border: 'border-orange-200' },
  due_tomorrow: { label: 'คืนพรุ่งนี้',    cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', border: 'border-yellow-200' },
}

export default function NotificationsPage() {
  const { notifications, unreadCount, readIds, markRead, markAllRead } = useApp()
  const toast = useToast()
  const [filter, setFilter] = useState('all')
  const [sending, setSending] = useState({})
  const [sent, setSent] = useState({})
  const navigate = useNavigate()

  const filtered = filter === 'all'
    ? notifications
    : filter === 'unread'
      ? notifications.filter(n => !readIds.has(n.id))
      : notifications.filter(n => n.type === filter)

  const handleSendLine = async (n) => {
    setSending(s => ({ ...s, [n.id]: true }))
    try {
      const time = n.rental?.return_time ? `\n🕐 เวลาคืน: ${n.rental.return_time.slice(0,5)}` : ''
      const loc  = n.rental?.return_location ? `\n📍 สถานที่คืน: ${n.rental.return_location}` : ''
      const msg = `[HICHAO.CNX]\n📷 ${n.title}\n${n.body}${time}${loc}\n🗓 วันคืน: ${n.date}`
      await sendLineNotify(msg)
      setSent(s => ({ ...s, [n.id]: true }))
      markRead(n.id)
      toast.success('ส่ง LINE แล้ว')
    } catch (e) {
      toast.error('ส่ง LINE ไม่สำเร็จ: ' + e.message)
    } finally {
      setSending(s => ({ ...s, [n.id]: false }))
    }
  }

  const handleSendAll = async () => {
    const urgent = notifications.filter(n => n.urgent)
    if (urgent.length === 0) { toast.warning('ไม่มีรายการเร่งด่วน'); return }
    setSending(s => ({ ...s, all: true }))
    try {
      const lines = urgent.map(n => {
        const time = n.rental?.return_time ? ` · 🕐 ${n.rental.return_time.slice(0,5)}` : ''
        const loc  = n.rental?.return_location ? ` · 📍 ${n.rental.return_location}` : ''
        return `📷 ${n.title}: ${n.body}${time}${loc} (คืน ${n.date})`
      }).join('\n')
      await sendLineNotify(`[HICHAO.CNX] แจ้งเตือนด่วน ${urgent.length} รายการ\n${lines}`)
      urgent.forEach(n => { setSent(s => ({ ...s, [n.id]: true })); markRead(n.id) })
      toast.success(`ส่ง LINE ${urgent.length} รายการแล้ว`)
    } catch (e) {
      toast.error('ส่ง LINE ไม่สำเร็จ: ' + e.message)
    } finally {
      setSending(s => ({ ...s, all: false }))
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">การแจ้งเตือน</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} รายการที่ยังไม่ได้อ่าน` : 'อ่านครบทุกรายการแล้ว'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              อ่านทั้งหมด
            </button>
          )}
          <button
            onClick={handleSendAll}
            disabled={sending.all || notifications.filter(n => n.urgent).length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {sending.all
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.952 1.651a.75.75 0 0 1 .298.655v6.125a.75.75 0 0 1-.75.75H4.5a.75.75 0 0 1 0-1.5h14.25V2.306a.75.75 0 0 1 1.202-.655Z" /><path fillRule="evenodd" d="M.75 9.875a.75.75 0 0 1 .75-.75h18a.75.75 0 0 1 .543 1.265l-9 9.5a.75.75 0 0 1-1.086 0l-9-9.5A.75.75 0 0 1 .75 9.875Zm3.082.75 6.918 7.306 6.918-7.306H3.832Z" clipRule="evenodd" /></svg>
            }
            ส่ง LINE ด่วน
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5 w-fit flex-wrap">
        {[
          { key: 'all', label: `ทั้งหมด (${notifications.length})` },
          { key: 'unread', label: `ยังไม่อ่าน (${unreadCount})` },
          { key: 'overdue', label: 'เกินกำหนด' },
          { key: 'due_today', label: 'วันนี้' },
          { key: 'due_tomorrow', label: 'พรุ่งนี้' },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100">
          <EmptyState title="ไม่มีการแจ้งเตือน" subtitle="เคลียร์ครบทุกรายการแล้ว สบายตัวเลยนิจ ✨" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.due_tomorrow
            const isRead = readIds.has(n.id)
            const isSent = sent[n.id]
            return (
              <div key={n.id}
                className={`bg-white rounded-2xl border ${cfg.border} p-4 flex items-start gap-4 transition-opacity ${isRead ? 'opacity-70' : ''}`}>
                <span className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                    {!isRead && <span className="text-xs text-blue-500 font-medium">● ใหม่</span>}
                    {isSent && <span className="text-xs text-green-600 font-medium">✓ ส่ง LINE แล้ว</span>}
                  </div>
                  <p className="text-sm font-medium text-gray-900">{n.body}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>📷 {n.rental?.camera?.name || '—'}</span>
                    <span>👤 {n.rental?.customer?.name || '—'}</span>
                    <span>🗓 วันคืน: {n.date}</span>
                    {n.rental?.return_time && <span>🕐 {n.rental.return_time.slice(0,5)} น.</span>}
                    {n.rental?.return_location && <span>📍 {n.rental.return_location}</span>}
                    {n.rental?.customer?.phone && <span>📞 {n.rental.customer.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isRead && (
                    <button onClick={() => markRead(n.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100">
                      อ่านแล้ว
                    </button>
                  )}
                  <button
                    onClick={() => handleSendLine(n)}
                    disabled={sending[n.id] || isSent}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    {sending[n.id]
                      ? <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      : isSent ? '✓ ส่งแล้ว' : 'ส่ง LINE'
                    }
                  </button>
                  <button
                    onClick={() => navigate('/rentals')}
                    className="px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors">
                    ดูรายการ
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
