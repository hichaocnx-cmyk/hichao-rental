import { useState, useMemo, useEffect, useRef } from 'react'
import { updateRental, deleteRental } from '../lib/rentals'
import { updateCamera } from '../lib/cameras'
import { useApp } from '../context/AppContext'
import { sendLineNotify } from '../lib/lineNotify'
import RentalModal from '../components/RentalModal'
import InvoiceModal from '../components/InvoiceModal'

// ── Calendar constants ──────────────────────────────────────────
const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const DAYS_TH   = ['อา','จ','อ','พ','พฤ','ศ','ส']
const CAL_COLORS = ['bg-blue-400','bg-purple-400','bg-pink-400','bg-orange-400','bg-teal-400','bg-indigo-400','bg-rose-400','bg-amber-400','bg-cyan-400','bg-green-400']
const ds = (y,m,d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

// ── Rental constants ────────────────────────────────────────────
const R_STATUS = {
  booked:    { label: 'จองแล้ว',   cls: 'bg-yellow-100 text-yellow-700' },
  active:    { label: 'กำลังเช่า', cls: 'bg-orange-100 text-orange-700' },
  returned:  { label: 'คืนแล้ว',   cls: 'bg-green-100 text-green-700'  },
  cancelled: { label: 'ยกเลิก',    cls: 'bg-gray-100 text-gray-500'    },
}
const NOTI_CFG = {
  overdue:      { label: 'เกินกำหนด',   cls: 'bg-red-100 text-red-700',       dot: 'bg-red-500',    border: 'border-red-200'    },
  due_today:    { label: 'คืนวันนี้',   cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', border: 'border-orange-200' },
  due_tomorrow: { label: 'คืนพรุ่งนี้', cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', border: 'border-yellow-200' },
}
const fmtTime = t => {
  if (!t) return ''
  const [h, m] = t.split(':'); const hr = parseInt(h)
  return `${hr < 12 ? (hr===0?12:hr) : (hr===12?12:hr-12)}:${m} ${hr<12?'AM':'PM'}`
}
const fmtDate = iso => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${parseInt(d)} ${MONTHS_TH[parseInt(m)-1]} ${parseInt(y) + 543}`
}

export default function RentalsPage() {
  const { rentals, loading, reload, notifications, unreadCount, readIds, markRead, markAllRead } = useApp()

  // Calendar state
  const [current, setCurrent]   = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null) // date string YYYY-MM-DD | null = all

  // Rental list state
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('current')
  const [expanded, setExpanded]       = useState(null)

  // Daily summary LINE
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summarySent, setSummarySent]       = useState(false)

  // ── Auto-notify 1 ชั่วโมงก่อนคิว ────────────────────────────
  const sentNotiRef = useRef(
    new Set(JSON.parse(localStorage.getItem('sent_queue_noti') || '[]'))
  )

  useEffect(() => {
    const checkUpcoming = () => {
      const now   = new Date()
      const nowMs = now.getTime()
      const todayDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

      rentals.forEach(r => {
        if (r.status !== 'booked' && r.status !== 'active') return

        // เช็คคิวรับกล้อง
        if (r.start_date === todayDate && r.pickup_time) {
          const key = `pickup-${r.id}-${r.start_date}`
          if (!sentNotiRef.current.has(key)) {
            const [h, m] = r.pickup_time.split(':').map(Number)
            const queueMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).getTime()
            const diffMin = (queueMs - nowMs) / 60000
            if (diffMin > 0 && diffMin <= 60) {
              const loc = r.pickup_location ? `\n📍 ${r.pickup_location}` : ''
              sendLineNotify(
                `[HICHAO.CNX] ⏰ อีก ${Math.round(diffMin)} นาที — รับกล้อง\n📷 ${r.camera?.name || '—'}\n👤 ${r.customer?.name || '—'}\n🕐 ${r.pickup_time.slice(0,5)}${loc}`
              ).catch(console.warn)
              sentNotiRef.current.add(key)
              localStorage.setItem('sent_queue_noti', JSON.stringify([...sentNotiRef.current]))
            }
          }
        }

        // เช็คคิวคืนกล้อง
        if (r.end_date === todayDate && r.return_time && r.status === 'active') {
          const key = `return-${r.id}-${r.end_date}`
          if (!sentNotiRef.current.has(key)) {
            const [h, m] = r.return_time.split(':').map(Number)
            const queueMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).getTime()
            const diffMin = (queueMs - nowMs) / 60000
            if (diffMin > 0 && diffMin <= 60) {
              const loc = r.return_location ? `\n📍 ${r.return_location}` : ''
              sendLineNotify(
                `[HICHAO.CNX] ⏰ อีก ${Math.round(diffMin)} นาที — คืนกล้อง\n📷 ${r.camera?.name || '—'}\n👤 ${r.customer?.name || '—'}\n🕐 ${r.return_time.slice(0,5)}${loc}`
              ).catch(console.warn)
              sentNotiRef.current.add(key)
              localStorage.setItem('sent_queue_noti', JSON.stringify([...sentNotiRef.current]))
            }
          }
        }
      })
    }

    // เช็คทันทีตอนโหลด และทุก 1 นาที
    checkUpcoming()
    const interval = setInterval(checkUpcoming, 60000)
    return () => clearInterval(interval)
  }, [rentals])

  // Modals
  const [rentalModal, setRentalModal] = useState(null) // null | 'new' | rental object
  const [invoiceRental, setInvoiceRental] = useState(null)
  const [notiOpen, setNotiOpen]       = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // LINE state
  const [lineSending, setLineSending] = useState({})
  const [lineSent, setLineSent]       = useState({})

  // ── Calendar computed ──────────────────────────────────────────
  const today = new Date()
  const todayStr = ds(today.getFullYear(), today.getMonth(), today.getDate())
  const year  = current.getFullYear()
  const month = current.getMonth()
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()

  const activeRentals = rentals.filter(r => r.status !== 'cancelled' && r.status !== 'returned')

  const cameraColorMap = useMemo(() => {
    const map = {}; let idx = 0
    activeRentals.forEach(r => { if (r.camera_id && !(r.camera_id in map)) { map[r.camera_id] = idx++ % CAL_COLORS.length } })
    return map
  }, [activeRentals])

  const rentalsOnDate = (dateStr) => activeRentals.filter(r => r.start_date <= dateStr && r.end_date >= dateStr)

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // ── Rental list filtered ───────────────────────────────────────
  const filteredRentals = useMemo(() => {
    return rentals.filter(r => {
      if (activeTab === 'current' && r.status === 'returned') return false
      if (activeTab === 'returned' && r.status !== 'returned') return false
      if (selectedDay && !(r.start_date <= selectedDay && r.end_date >= selectedDay)) return false
      if (activeTab === 'current' && filterStatus !== 'all' && r.status !== filterStatus) return false
      if (search) {
        const q = search.toLowerCase()
        if (!`${r.camera?.name||''} ${r.customer?.name||''} ${r.customer?.phone||''} ${r.pickup_location||''}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [rentals, selectedDay, filterStatus, search, activeTab])

  // ── Actions ───────────────────────────────────────────────────
  const handleDeliver = async (rental) => {
    if (!confirm(`ยืนยันส่งกล้อง "${rental.camera?.name}" ให้ลูกค้าแล้ว?`)) return
    try {
      await updateRental(rental.id, { status: 'active' })
      await reload()
      sendLineNotify(
        `[HICHAO.CNX] 🟠 ส่งกล้องแล้ว!\n📷 ${rental.camera?.name || 'กล้อง'}\n👤 ${rental.customer?.name || '—'}\n🗓 คืนวันที่ ${rental.end_date}`
      ).catch(console.warn)
    } catch (e) { alert('เกิดข้อผิดพลาด: ' + e.message) }
  }

  const handleReturn = async (rental) => {
    if (!confirm(`ยืนยันรับกล้อง "${rental.camera?.name}" คืนแล้ว?`)) return
    try {
      await updateRental(rental.id, { status: 'returned' })
      await updateCamera(rental.camera_id, { status: 'available' })
      await reload()
      setActiveTab('returned')
      sendLineNotify(
        `[HICHAO.CNX] ✅ รับกล้องคืนแล้ว!\n📷 ${rental.camera?.name || 'กล้อง'}\n👤 ${rental.customer?.name || '—'}`
      ).catch(console.warn)
    } catch (e) { alert('เกิดข้อผิดพลาด: ' + e.message) }
  }

  const handleSendDailySummary = async () => {
    setSummaryLoading(true); setSummarySent(false)
    try {
      const pickups = rentals.filter(r =>
        r.start_date === todayStr && (r.status === 'booked' || r.status === 'active')
      )
      const returns = rentals.filter(r =>
        r.end_date === todayStr && r.status === 'active'
      )
      const d = today.getDate(), m = MONTHS_TH[today.getMonth()], y = today.getFullYear() + 543
      let msg = `[HICHAO.CNX] 📋 คิวประจำวัน\n${d} ${m} ${y}\n`
      msg += `\n📦 รับกล้องวันนี้ (${pickups.length} รายการ)\n`
      if (pickups.length === 0) {
        msg += `  — ไม่มีรายการ\n`
      } else {
        pickups.forEach((r, i) => {
          const time = r.pickup_time ? ` เวลา ${r.pickup_time.slice(0,5)}` : ''
          const loc  = r.pickup_location ? ` 📍 ${r.pickup_location}` : ''
          msg += `  ${i+1}. 📷 ${r.camera?.name || '—'} · ${r.customer?.name || '—'}${time}${loc}\n`
        })
      }
      msg += `\n🔄 คืนกล้องวันนี้ (${returns.length} รายการ)\n`
      if (returns.length === 0) {
        msg += `  — ไม่มีรายการ\n`
      } else {
        returns.forEach((r, i) => {
          const time = r.return_time ? ` เวลา ${r.return_time.slice(0,5)}` : ''
          const loc  = r.return_location ? ` 📍 ${r.return_location}` : ''
          msg += `  ${i+1}. 📷 ${r.camera?.name || '—'} · ${r.customer?.name || '—'}${time}${loc}\n`
        })
      }
      msg += `\nรวม ${pickups.length + returns.length} รายการ`
      await sendLineNotify(msg)
      setSummarySent(true)
      setTimeout(() => setSummarySent(false), 4000)
    } catch (e) { alert('ส่งไม่สำเร็จ: ' + e.message) }
    finally { setSummaryLoading(false) }
  }

  const handleDelete = async (rental) => {
    if (!confirm('ลบรายการนี้?')) return
    try {
      if (rental.status === 'active') await updateCamera(rental.camera_id, { status: 'available' })
      await deleteRental(rental.id); await reload()
    } catch (e) { alert('เกิดข้อผิดพลาด: ' + e.message) }
  }

  const handleSendLine = async (n) => {
    setLineSending(s => ({ ...s, [n.id]: true }))
    try {
      const time = n.rental?.return_time ? `\n🕐 เวลาคืน: ${n.rental.return_time.slice(0,5)}` : ''
      const loc  = n.rental?.return_location ? `\n📍 สถานที่คืน: ${n.rental.return_location}` : ''
      await sendLineNotify(`[HICHAO.CNX]\n📷 ${n.title}\n${n.body}${time}${loc}\n🗓 วันคืน: ${n.date}`)
      setLineSent(s => ({ ...s, [n.id]: true })); markRead(n.id)
    } catch (e) { alert('ส่ง LINE ไม่สำเร็จ: ' + e.message) }
    finally { setLineSending(s => ({ ...s, [n.id]: false })) }
  }

  const handleSendAllLine = async () => {
    const urgent = notifications.filter(n => n.urgent)
    if (!urgent.length) return
    setLineSending(s => ({ ...s, all: true }))
    try {
      const lines = urgent.map(n => {
        const time = n.rental?.return_time ? ` · 🕐 ${n.rental.return_time.slice(0,5)}` : ''
        const loc  = n.rental?.return_location ? ` · 📍 ${n.rental.return_location}` : ''
        return `📷 ${n.title}: ${n.body}${time}${loc} (คืน ${n.date})`
      }).join('\n')
      await sendLineNotify(`[HICHAO.CNX] แจ้งเตือนด่วน ${urgent.length} รายการ\n${lines}`)
      urgent.forEach(n => { setLineSent(s => ({ ...s, [n.id]: true })); markRead(n.id) })
    } catch (e) { alert('ส่ง LINE ไม่สำเร็จ: ' + e.message) }
    finally { setLineSending(s => ({ ...s, all: false })) }
  }

  const calcDays = (r) => Math.max(1, Math.ceil((new Date(r.end_date) - new Date(r.start_date)) / 86400000) + 1)
  const urgentNoti = notifications.filter(n => n.urgent)
  const showBanner = urgentNoti.length > 0 && !bannerDismissed

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">รายการเช่า</h2>
          <p className="text-gray-500 text-sm mt-0.5">คลิกวันในปฏิทินเพื่อกรองรายการ</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setNotiOpen(true)}
            className="relative p-2 text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={handleSendDailySummary} disabled={summaryLoading}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-60
              ${summarySent
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {summaryLoading
              ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : summarySent
                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" /></svg>
            }
            {summarySent ? 'ส่งแล้ว!' : 'ส่งคิววันนี้ → LINE'}
          </button>
          <button onClick={() => setRentalModal('new')}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            สร้างรายการเช่า
          </button>
        </div>
      </div>

      {/* ── Notification Banner ──────────────────────────────── */}
      {showBanner && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">มี {urgentNoti.length} รายการที่ต้องดูแล</p>
            <p className="text-xs text-red-600 mt-0.5 truncate">
              {urgentNoti.map(n => `${n.rental?.camera?.name||'?'} (${NOTI_CFG[n.type]?.label})`).join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setNotiOpen(true)}
              className="text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 px-2.5 py-1 rounded-lg transition-colors">
              ดูรายละเอียด
            </button>
            <button onClick={() => setBannerDismissed(true)} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout: Calendar (left) + List (right) ──────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">

        {/* ── Calendar ──────────────────────────────────────── */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={() => setCurrent(new Date(year, month-1))} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{MONTHS_TH[month]} {year+543}</span>
              <button onClick={() => { setCurrent(new Date()); setSelectedDay(null) }}
                className="text-[10px] px-2 py-0.5 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-full font-medium">วันนี้</button>
            </div>
            <button onClick={() => setCurrent(new Date(year, month+1))} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS_TH.map((d,i) => (
              <div key={d} className={`py-2 text-center text-[10px] font-semibold ${i===0?'text-red-400':i===6?'text-blue-400':'text-gray-400'}`}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((d, i) => {
                if (!d) return <div key={`e-${i}`} className="min-h-[56px] border-b border-r border-gray-50" />
                const dateStr = ds(year, month, d)
                const dayRentals = rentalsOnDate(dateStr)
                const isToday    = dateStr === todayStr
                const isSel      = selectedDay === dateStr
                const isWeekend  = i%7===0 || i%7===6
                return (
                  <div key={d} onClick={() => setSelectedDay(isSel ? null : dateStr)}
                    className={`min-h-[56px] border-b border-r border-gray-100 p-1 cursor-pointer transition-colors
                      ${isSel ? 'bg-brand-50 ring-1 ring-inset ring-brand-300' : isWeekend ? 'bg-gray-50/40 hover:bg-gray-100/60' : 'hover:bg-gray-50'}`}>
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-0.5
                      ${isToday ? 'bg-brand-500 text-white' : isSel ? 'text-brand-700 font-bold' : isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                      {d}
                    </div>
                    <div className="space-y-px">
                      {dayRentals.slice(0,2).map(r => (
                        <div key={r.id}
                          className={`h-4 rounded-sm flex items-center px-1 text-white text-[9px] font-medium overflow-hidden leading-none
                            ${CAL_COLORS[cameraColorMap[r.camera_id]??0]}
                            ${r.start_date===dateStr ? 'rounded-l-full' : '-ml-1 pl-0'}
                            ${r.end_date===dateStr   ? 'rounded-r-full' : '-mr-1 pr-0'}`}>
                          {r.start_date===dateStr && <span className="truncate">{r.camera?.name?.split(' ')[0]||''}</span>}
                        </div>
                      ))}
                      {dayRentals.length > 2 && <div className="text-[9px] text-gray-400 pl-0.5">+{dayRentals.length-2}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Legend */}
          {Object.keys(cameraColorMap).length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 flex flex-wrap gap-2">
              {activeRentals.filter((r,i,arr)=>arr.findIndex(x=>x.camera_id===r.camera_id)===i).map(r=>(
                <div key={r.camera_id} className="flex items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-sm ${CAL_COLORS[cameraColorMap[r.camera_id]??0]}`} />
                  <span className="text-[10px] text-gray-500">{r.camera?.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Selected day summary */}
          {selectedDay && (
            <div className="border-t border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-700">
                  {parseInt(selectedDay.split('-')[2])} {MONTHS_TH[parseInt(selectedDay.split('-')[1])-1]}
                  <span className="ml-1.5 text-brand-600">({rentalsOnDate(selectedDay).length} รายการ)</span>
                </p>
                <button onClick={() => setSelectedDay(null)} className="text-xs text-gray-400 hover:text-gray-600">ล้าง</button>
              </div>
              {rentalsOnDate(selectedDay).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">ว่างทุกตัว</p>
              ) : (
                <div className="space-y-1.5">
                  {rentalsOnDate(selectedDay).map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-sm flex-shrink-0 ${CAL_COLORS[cameraColorMap[r.camera_id]??0]}`} />
                      <span className="font-medium text-gray-900 truncate">{r.camera?.name}</span>
                      <span className="text-gray-400 truncate">{r.customer?.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Rental List ────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-3">

          {/* Tabs */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
            <button
              onClick={() => { setActiveTab('current'); setFilterStatus('all') }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2
                ${activeTab === 'current' ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span>รายการปัจจุบัน</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                ${activeTab === 'current' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {rentals.filter(r => r.status !== 'returned').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('returned')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2
                ${activeTab === 'returned' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span>คืนแล้ว</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                ${activeTab === 'returned' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {rentals.filter(r => r.status === 'returned').length}
              </span>
            </button>
          </div>

          {/* Search + Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหากล้อง, ลูกค้า, สถานที่..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
            </div>
            {activeTab === 'current' && (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white flex-shrink-0">
                <option value="all">ทุกสถานะ</option>
                <option value="booked">จองแล้ว</option>
                <option value="active">กำลังเช่า</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
            )}
            {selectedDay && (
              <button onClick={() => setSelectedDay(null)}
                className="px-3 py-2 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg flex-shrink-0 whitespace-nowrap">
                ✕ ล้างวันที่
              </button>
            )}
          </div>

          {/* List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-14"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : filteredRentals.length === 0 ? (
              <div className="text-center py-14">
                <svg className="w-9 h-9 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <p className="text-gray-400 text-sm">{selectedDay ? 'ไม่มีรายการในวันนี้' : 'ไม่พบรายการเช่า'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredRentals.map(r => {
                  const noti = notifications.find(n => n.rental?.id === r.id)
                  return (
                    <div key={r.id}>
                      {/* Row — คลิกเพื่อขยาย */}
                      <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                        {r.camera?.image_url
                          ? <img src={r.camera.image_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 mt-0.5" alt="" />
                          : <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0 mt-0.5 flex items-center justify-center">
                              <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /></svg>
                            </div>
                        }
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-gray-900 text-sm">{r.camera?.name || '—'}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${R_STATUS[r.status]?.cls}`}>{R_STATUS[r.status]?.label}</span>
                            {noti && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${NOTI_CFG[noti.type]?.cls}`}>{NOTI_CFG[noti.type]?.label}</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{r.customer?.name}{r.customer?.phone ? ` · ${r.customer.phone}` : ''}</p>
                          <div className="mt-1.5 flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium text-gray-700">📅 {fmtDate(r.start_date)}{r.pickup_time ? ` · ${fmtTime(r.pickup_time)}` : ''}</span>
                              <span className="text-xs text-gray-400">→</span>
                              <span className="text-xs font-medium text-gray-700">{fmtDate(r.end_date)}{r.return_time ? ` · ${fmtTime(r.return_time)}` : ''}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              {r.pickup_location && <span className="text-xs text-gray-400">📍 {r.pickup_location}</span>}
                              <span className="text-xs font-bold text-brand-600">฿{Number(r.total_price).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <svg className={`w-4 h-4 text-gray-300 flex-shrink-0 mt-1 transition-transform ${expanded===r.id?'rotate-180':''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                      </div>

                      {/* Expanded detail + Action buttons */}
                      {expanded === r.id && (
                        <div className="bg-gray-50 border-t border-gray-100">
                          {/* Detail grid */}
                          <div className="px-4 pt-3 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <div><p className="text-xs text-gray-400 mb-0.5">จำนวนวัน</p><p className="font-medium">{calcDays(r)} วัน</p></div>
                            <div><p className="text-xs text-gray-400 mb-0.5">ราคา/วัน</p><p className="font-medium">฿{Number(r.price_per_day).toLocaleString()}</p></div>
                            <div><p className="text-xs text-gray-400 mb-0.5">ราคาเช่ารวม</p><p className="font-medium">฿{Number(r.total_price).toLocaleString()}</p></div>
                            <div><p className="text-xs text-gray-400 mb-0.5">มัดจำแล้ว</p><p className="font-medium text-green-700">-฿{Number(r.deposit).toLocaleString()}</p></div>
                            {Number(r.insurance)>0 && <div><p className="text-xs text-gray-400 mb-0.5">ค่าประกัน</p><p className="font-medium text-orange-600">+฿{Number(r.insurance).toLocaleString()}</p></div>}
                            {Number(r.delivery_fee)>0 && <div><p className="text-xs text-gray-400 mb-0.5">ค่าส่ง</p><p className="font-medium text-blue-600">+฿{Number(r.delivery_fee).toLocaleString()}</p></div>}
                            <div className="col-span-2 bg-brand-50 rounded-lg p-2.5">
                              <p className="text-xs text-gray-400 mb-0.5">จ่ายวันรับกล้อง</p>
                              <p className="font-bold text-brand-700 text-base">฿{Number(r.due_on_pickup||0).toLocaleString()}</p>
                            </div>
                            {r.pickup_time && <div><p className="text-xs text-gray-400 mb-0.5">เวลารับ</p><p className="font-medium">{fmtTime(r.pickup_time)}</p></div>}
                            {r.return_time && <div><p className="text-xs text-gray-400 mb-0.5">เวลาคืน</p><p className="font-medium">{fmtTime(r.return_time)}</p></div>}
                            {r.pickup_location && <div className="col-span-2"><p className="text-xs text-gray-400 mb-0.5">สถานที่รับ</p><p className="font-medium">{r.pickup_location}</p></div>}
                            {r.return_location && <div className="col-span-2"><p className="text-xs text-gray-400 mb-0.5">สถานที่คืน</p><p className="font-medium">{r.return_location}</p></div>}
                            {r.notes && <div className="col-span-4"><p className="text-xs text-gray-400 mb-0.5">หมายเหตุ</p><p className="font-medium">{r.notes}</p></div>}
                          </div>

                          {/* Action bar */}
                          <div className="px-4 py-3 border-t border-gray-200 flex flex-wrap gap-2">
                            {/* แก้ไข */}
                            <button onClick={() => setRentalModal(r)}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                              <span className="hidden sm:inline">แก้ไขรายการ</span>
                            </button>
                            {/* ออกใบเสร็จ */}
                            <button onClick={() => setInvoiceRental(r)}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-700 bg-brand-50 border border-brand-200 hover:bg-brand-100 rounded-lg transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                              <span className="hidden sm:inline">ออกใบเสร็จ</span>
                            </button>
                            {/* ✅ ยืนยันส่งกล้อง — เฉพาะ booked */}
                            {r.status === 'booked' && (
                              <button onClick={() => handleDeliver(r)}
                                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 border border-amber-600 rounded-lg transition-colors shadow-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                                ยืนยันส่งกล้อง
                              </button>
                            )}
                            {/* ✅ ยืนยันคืนกล้อง — เฉพาะ active */}
                            {r.status === 'active' && (
                              <button onClick={() => handleReturn(r)}
                                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-green-500 hover:bg-green-600 border border-green-600 rounded-lg transition-colors shadow-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                                ยืนยันคืนกล้อง
                              </button>
                            )}
                            {/* ส่ง LINE manual */}
                            {noti && (
                              <button onClick={() => handleSendLine(noti)} disabled={lineSending[noti.id] || lineSent[noti.id]}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#06c755] hover:bg-[#05a847] disabled:opacity-50 rounded-lg transition-colors">
                                {lineSending[noti.id]
                                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.952 1.651a.75.75 0 0 1 .298.655v6.125a.75.75 0 0 1-.75.75H4.5a.75.75 0 0 1 0-1.5h14.25V2.306a.75.75 0 0 1 1.202-.655Z" /><path fillRule="evenodd" d="M.75 9.875a.75.75 0 0 1 .75-.75h18a.75.75 0 0 1 .543 1.265l-9 9.5a.75.75 0 0 1-1.086 0l-9-9.5A.75.75 0 0 1 .75 9.875Zm3.082.75 6.918 7.306 6.918-7.306H3.832Z" clipRule="evenodd" /></svg>
                                }
                                <span className="hidden sm:inline">{lineSent[noti.id] ? 'ส่งแล้ว ✓' : 'ส่ง LINE'}</span>
                              </button>
                            )}
                            {/* ลบ */}
                            <button onClick={() => handleDelete(r)}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors ml-auto">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                              <span className="hidden sm:inline">ลบ</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {!loading && filteredRentals.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
                {selectedDay ? `${filteredRentals.length} รายการในวันที่เลือก` : `${filteredRentals.length} จาก ${rentals.length} รายการ`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Notification Popup Modal ──────────────────────────── */}
      {notiOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={e => e.target === e.currentTarget && setNotiOpen(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col">
            {/* Drag handle (mobile only) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                   <p className="font-semibold text-gray-900">การแจ้งเตือน
                {unreadCount > 0 && <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
              </p>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">อ่านทั้งหมด</button>
                )}
                <button onClick={() => setNotiOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">ไม่มีการแจ้งเตือน</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map(n => {
                    const cfg = NOTI_CFG[n.type] || NOTI_CFG.due_tomorrow
                    const isRead = readIds.has(n.id)
                    return (
                      <div key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors ${!isRead ? 'bg-blue-50/40' : ''}`}>
                        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                            {!isRead && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />}
                          </div>
                          <p className="text-sm text-gray-700 truncate">{n.body}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-400">
                            <span>🗓 คืน {n.date}</span>
                            {n.rental?.return_time && <span>🕐 {n.rental.return_time.slice(0,5)} น.</span>}
                            {n.rental?.return_location && <span>📍 {n.rental.return_location}</span>}
                          </div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); handleSendLine(n) }}
                          disabled={lineSending[n.id] || lineSent[n.id]}
                          className="flex-shrink-0 text-xs px-2.5 py-1.5 bg-[#06c755] text-white rounded-lg hover:bg-[#05a847] disabled:opacity-50 transition-colors">
                          {lineSent[n.id] ? '✓' : 'LINE'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {urgentNoti.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
                <button onClick={handleSendAllLine}
                  className="w-full py-2 bg-[#06c755] text-white text-sm font-medium rounded-xl hover:bg-[#05a847] transition-colors">
                  ส่ง LINE ด่วนทั้งหมด ({urgentNoti.length} รายการ)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Rental Modal ─────────────────────────────────────────── */}
      {rentalModal && (
        <RentalModal
          rental={rentalModal === 'new' ? null : rentalModal}
          onClose={() => setRentalModal(null)}
          onSaved={async () => { setRentalModal(null); await reload() }}
        />
      )}

      {/* ── Invoice Modal ────────────────────────────────────────── */}
      {invoiceRental && (
        <InvoiceModal
          rental={invoiceRental}
          onClose={() => setInvoiceRental(null)}
        />
      )}

    </div>
  )
}
