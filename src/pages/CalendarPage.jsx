import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const DAYS_TH = ['อา','จ','อ','พ','พฤ','ศ','ส']
const DAYS_FULL = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']

// Color per rental (not per camera)
const RENTAL_COLORS = [
  { bar:'#007AFF', bg:'#ddeeff', text:'#004fa3' },
  { bar:'#34C759', bg:'#d4f5df', text:'#1a6e3c' },
  { bar:'#AF52DE', bg:'#ecdeff', text:'#6b21a8' },
  { bar:'#FF9500', bg:'#ffeacc', text:'#a05000' },
  { bar:'#FF2D55', bg:'#ffd6de', text:'#9b1c2e' },
  { bar:'#00C7BE', bg:'#ccf5f3', text:'#0a6b67' },
  { bar:'#5856D6', bg:'#e4e3ff', text:'#3730a3' },
  { bar:'#FF6B35', bg:'#ffe4d6', text:'#9a3400' },
  { bar:'#30B0C7', bg:'#ccf0f8', text:'#0a5a6e' },
  { bar:'#8E8E93', bg:'#e8e8ea', text:'#3a3a3c' },
]

const STATUS_STYLE = {
  booked:   { label:'จองแล้ว',   bg:'#f0f0f5', text:'#555' },
  active:   { label:'กำลังเช่า', bg:'#ddeeff', text:'#004fa3' },
  returned: { label:'คืนแล้ว',   bg:'#d4f5df', text:'#1a6e3c' },
}

const mkDs = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
const fmtTime = t => t ? t.slice(0,5) + ' น.' : ''
const fmtDate = iso => {
  if (!iso) return ''
  const [,m,d] = iso.split('-')
  return `${parseInt(d)} ${MONTHS_TH[parseInt(m)-1]}`
}

export default function CalendarPage() {
  const { rentals: allRentals, loading } = useApp()
  const rentals = allRentals.filter(r => r.status !== 'cancelled')

  const [current, setCurrent] = useState(new Date())
  const [selectedDs, setSelectedDs] = useState(() => {
    const t = new Date()
    return mkDs(t.getFullYear(), t.getMonth(), t.getDate())
  })

  const today = new Date()
  const todayDs = mkDs(today.getFullYear(), today.getMonth(), today.getDate())
  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()

  // Assign color per rental (consistent across all days)
  const rentalColorMap = useMemo(() => {
    const map = {}; let idx = 0
    // Sort by start_date so colors are consistent
    const sorted = [...allRentals].sort((a, b) => a.start_date?.localeCompare(b.start_date))
    sorted.forEach(r => {
      if (r.id && !(r.id in map)) {
        map[r.id] = RENTAL_COLORS[idx % RENTAL_COLORS.length]
        idx++
      }
    })
    return map
  }, [allRentals])

  const getRentalsOnDate = (dateStr) =>
    rentals.filter(r => r.start_date <= dateStr && r.end_date >= dateStr)

  // Build calendar cells
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: prevDays - firstDay + 1 + i, type: 'prev' })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: 'cur' })
  const remainder = 42 - cells.length
  for (let i = 1; i <= remainder; i++) cells.push({ day: i, type: 'next' })

  const selectedRentals = useMemo(() => {
    if (!selectedDs) return []
    return getRentalsOnDate(selectedDs).map(r => ({
      ...r,
      color: rentalColorMap[r.id] || RENTAL_COLORS[0],
      isPickup: r.start_date === selectedDs,
      isReturn: r.end_date === selectedDs,
    }))
  }, [selectedDs, rentals, rentalColorMap])

  const selectedDate = selectedDs ? new Date(selectedDs + 'T00:00:00') : null
  const selectedDayLabel = selectedDate
    ? `${DAYS_FULL[selectedDate.getDay()]}ที่ ${selectedDate.getDate()} ${MONTHS_TH[selectedDate.getMonth()]} ${selectedDate.getFullYear() + 543}`
    : ''

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">ปฏิทินการเช่า</h2>
        <p className="text-gray-500 text-sm mt-0.5">คลิกวันเพื่อดูรายละเอียด</p>
      </div>

      {/* ── Calendar card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => setCurrent(new Date(year, month - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-base font-semibold text-gray-900">{MONTHS_TH[month]} {year + 543}</span>
            <button
              onClick={() => { setCurrent(new Date()); setSelectedDs(todayDs) }}
              className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              วันนี้
            </button>
          </div>
          <button
            onClick={() => setCurrent(new Date(year, month + 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS_TH.map((d, i) => (
            <div key={d} className={`py-3 text-center text-xs sm:text-sm font-semibold tracking-wide
              ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const cellDs = cell.type === 'cur'
                ? mkDs(year, month, cell.day)
                : cell.type === 'prev'
                  ? mkDs(year, month - 1, cell.day)
                  : mkDs(year, month + 1, cell.day)

              const active = cell.type === 'cur' ? getRentalsOnDate(cellDs) : []
              const isToday = cellDs === todayDs
              const isSelected = cellDs === selectedDs
              const isOtherMonth = cell.type !== 'cur'
              const colIndex = i % 7

              return (
                <div
                  key={`${cell.type}-${cell.day}-${i}`}
                  onClick={() => cell.type === 'cur' && setSelectedDs(cellDs)}
                  className={`border-b border-r border-gray-100 min-h-[80px] sm:min-h-[100px] p-1 sm:p-1.5 relative
                    ${cell.type === 'cur' ? 'cursor-pointer' : 'cursor-default'}
                    ${isSelected && !isOtherMonth ? 'bg-blue-50/60' : isOtherMonth ? 'bg-gray-50/20' : 'hover:bg-gray-50'}`}
                >
                  {/* Date number */}
                  <div className="flex justify-center mb-1">
                    <span className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-sm sm:text-base font-semibold
                      ${isToday
                        ? 'bg-blue-500 text-white'
                        : isOtherMonth
                          ? 'text-gray-300'
                          : colIndex === 0
                            ? 'text-red-400'
                            : colIndex === 6
                              ? 'text-blue-400'
                              : isSelected
                                ? 'text-blue-600 font-bold'
                                : 'text-gray-700'}`}
                    >
                      {cell.day}
                    </span>
                  </div>

                  {/* Event rows — show up to 2 on mobile, 3 on desktop */}
                  {!isOtherMonth && (
                    <div className="space-y-0.5">
                      {active.slice(0, 3).map(r => {
                        const color = rentalColorMap[r.id] || RENTAL_COLORS[0]
                        const isStart = r.start_date === cellDs
                        const isEnd = r.end_date === cellDs
                        const loc = isStart ? r.pickup_location : isEnd ? r.return_location : null
                        const camShort = r.camera?.name?.replace('Ricoh ', '').replace('Canon ', '') || '—'
                        const custShort = r.customer?.name?.split(' ')[0] || '—'

                        return (
                          <div
                            key={r.id}
                            title={`${r.camera?.name} · ${r.customer?.name}${loc ? ' · ' + loc : ''}`}
                            style={{
                              backgroundColor: color.bg,
                              borderLeft: `3px solid ${color.bar}`,
                            }}
                            className="rounded-r-md px-1 sm:px-1.5 py-0.5 text-left leading-tight overflow-hidden"
                          >
                            <p className="text-[11px] sm:text-xs font-semibold truncate" style={{ color: color.text }}>
                              {camShort}
                            </p>
                            <p className="text-[10px] sm:text-[11px] truncate hidden sm:block" style={{ color: color.text, opacity: 0.8 }}>
                              {custShort}{loc ? ` · ${loc}` : ''}
                            </p>
                          </div>
                        )
                      })}
                      {active.length > 3 && (
                        <p className="text-[10px] sm:text-xs text-gray-400 pl-1">+{active.length - 3}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Agenda section ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {selectedDayLabel || 'เลือกวัน'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : selectedRentals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">ไม่มีรายการวันนี้</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {selectedRentals.map(r => {
              const status = STATUS_STYLE[r.status] || STATUS_STYLE.booked
              const pickupTime = fmtTime(r.pickup_time)
              const returnTime = fmtTime(r.return_time)
              const badgeLabel = r.isPickup && r.isReturn ? 'รับ-คืนวันเดียว'
                : r.isPickup ? 'รับวันนี้'
                : r.isReturn ? 'คืนวันนี้'
                : status.label
              const badgeBg = r.isPickup && !r.isReturn ? '#d4f5df'
                : r.isReturn && !r.isPickup ? '#ffeacc'
                : status.bg
              const badgeText = r.isPickup && !r.isReturn ? '#1a6e3c'
                : r.isReturn && !r.isPickup ? '#a05000'
                : status.text

              return (
                <div key={r.id} className="flex items-stretch gap-3 px-4 py-3.5">
                  {/* Color bar */}
                  <div
                    className="w-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: r.color.bar, minHeight: '44px' }}
                  />

                  {/* Camera image */}
                  {r.camera?.image_url ? (
                    <img src={r.camera.image_url} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 self-start mt-0.5" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 self-start mt-0.5 flex items-center justify-center"
                      style={{ backgroundColor: r.color.bg }}>
                      <svg className="w-5 h-5" style={{ color: r.color.bar }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                      </svg>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.camera?.name || '—'}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{ backgroundColor: badgeBg, color: badgeText }}>
                        {badgeLabel}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                      <span className="truncate">{r.customer?.name || '—'}</span>
                      {r.customer?.phone && <span className="text-gray-400 flex-shrink-0">· {r.customer.phone}</span>}
                    </p>

                    {/* Pickup info */}
                    {r.isPickup && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        รับ{pickupTime ? ` ${pickupTime}` : ''}{r.pickup_location ? ` · ${r.pickup_location}` : ''}
                      </p>
                    )}

                    {/* Return info */}
                    {r.isReturn && (
                      <p className="text-xs text-orange-500 mt-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        คืน{returnTime ? ` ${returnTime}` : ''}{r.return_location ? ` · ${r.return_location}` : ''}
                      </p>
                    )}

                    {/* Middle day — show both locations */}
                    {!r.isPickup && !r.isReturn && (r.pickup_location || r.return_location) && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        <span className="truncate">{r.pickup_location || r.return_location}</span>
                      </p>
                    )}

                    <p className="text-xs text-gray-300 mt-1">{fmtDate(r.start_date)} → {fmtDate(r.end_date)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
