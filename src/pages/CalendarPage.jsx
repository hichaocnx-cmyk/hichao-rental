import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const DAYS_TH = ['อา','จ','อ','พ','พฤ','ศ','ส']

const COLORS = [
  'bg-blue-400', 'bg-purple-400', 'bg-pink-400', 'bg-orange-400',
  'bg-teal-400', 'bg-indigo-400', 'bg-rose-400', 'bg-amber-400',
  'bg-cyan-400', 'bg-green-400',
]
const COLORS_LIGHT = [
  'bg-blue-100 text-blue-800', 'bg-purple-100 text-purple-800', 'bg-pink-100 text-pink-800',
  'bg-orange-100 text-orange-800', 'bg-teal-100 text-teal-800', 'bg-indigo-100 text-indigo-800',
  'bg-rose-100 text-rose-800', 'bg-amber-100 text-amber-800', 'bg-cyan-100 text-cyan-800',
  'bg-green-100 text-green-800',
]

const dateStr = (y, m, d) => `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

export default function CalendarPage() {
  const { rentals: allRentals, loading } = useApp()
  const rentals = allRentals.filter(r => r.status !== 'cancelled')
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState(null)

  const today = new Date()
  const todayStr = dateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Assign color index per camera
  const cameraColorMap = useMemo(() => {
    const map = {}
    let idx = 0
    rentals.forEach(r => {
      if (r.camera_id && !(r.camera_id in map)) {
        map[r.camera_id] = idx % COLORS.length
        idx++
      }
    })
    return map
  }, [rentals])

  // Get rentals active on a given date string
  const getRentalsOnDate = (ds) =>
    rentals.filter(r => r.start_date <= ds && r.end_date >= ds)

  // For each day cell: compute which rentals are active and if it's start/end/middle
  const getDayInfo = (d) => {
    if (!d) return { active: [] }
    const ds = dateStr(year, month, d)
    const active = getRentalsOnDate(ds).map(r => ({
      ...r,
      isStart: r.start_date === ds,
      isEnd: r.end_date === ds,
      colorIdx: cameraColorMap[r.camera_id] ?? 0,
    }))
    return { ds, active }
  }

  // Build calendar cells
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selectedInfo = selected ? getDayInfo(selected) : null
  const selectedRentals = selectedInfo?.active || []

  const prevMonth = () => setCurrent(new Date(year, month - 1))
  const nextMonth = () => setCurrent(new Date(year, month + 1))
  const goToday = () => { setCurrent(new Date()); setSelected(null) }

  // Active rentals this month (for side panel)
  const monthStart = dateStr(year, month, 1)
  const monthEnd = dateStr(year, month, daysInMonth)
  const monthRentals = rentals.filter(r =>
    r.start_date <= monthEnd && r.end_date >= monthStart
  )

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">ปฏิทินการเช่า</h2>
        <p className="text-gray-500 text-sm mt-0.5">คลิกวันเพื่อดูรายละเอียด</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">

        {/* ── CALENDAR ── */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">{MONTHS_TH[month]} {year + 543}</h3>
              <button onClick={goToday} className="text-xs px-3 py-1 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-full font-medium transition-colors">
                วันนี้
              </button>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS_TH.map((d, i) => (
              <div key={d} className={`py-2.5 text-center text-xs font-semibold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((d, i) => {
                if (!d) return <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-gray-50" />
                const ds = dateStr(year, month, d)
                const { active } = getDayInfo(d)
                const isToday = ds === todayStr
                const isSelected = selected === d
                const isWeekend = (i % 7 === 0) || (i % 7 === 6)

                return (
                  <div
                    key={d}
                    onClick={() => setSelected(isSelected ? null : d)}
                    className={`min-h-[80px] border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors relative
                      ${isSelected ? 'bg-brand-50 ring-1 ring-inset ring-brand-300' : isWeekend ? 'bg-gray-50/50 hover:bg-gray-100/70' : 'hover:bg-gray-50'}`}
                  >
                    {/* Date number */}
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1
                      ${isToday ? 'bg-brand-500 text-white' : isSelected ? 'text-brand-700 font-bold' : isWeekend ? 'text-gray-500' : 'text-gray-700'}`}>
                      {d}
                    </div>

                    {/* Rental bars */}
                    <div className="space-y-0.5">
                      {active.slice(0, 3).map((r) => (
                        <div
                          key={r.id}
                          className={`h-5 rounded-sm flex items-center px-1.5 text-white text-xs font-medium overflow-hidden
                            ${COLORS[r.colorIdx]}
                            ${r.isStart ? 'rounded-l-full ml-0' : '-ml-1.5 pl-0'}
                            ${r.isEnd ? 'rounded-r-full mr-0' : '-mr-1.5 pr-0'}`}
                          title={`${r.camera?.name} — ${r.customer?.name}`}
                        >
                          {r.isStart && (
                            <span className="truncate leading-none">
                              {r.camera?.name?.split(' ')[0] || ''}
                            </span>
                          )}
                        </div>
                      ))}
                      {active.length > 3 && (
                        <div className="text-xs text-gray-400 font-medium pl-0.5">+{active.length - 3}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Legend */}
          {Object.keys(cameraColorMap).length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-3">
              {rentals
                .filter((r, i, arr) => arr.findIndex(x => x.camera_id === r.camera_id) === i)
                .map(r => (
                  <div key={r.camera_id} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${COLORS[cameraColorMap[r.camera_id] ?? 0]}`} />
                    <span className="text-xs text-gray-600">{r.camera?.name}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* ── SIDE PANEL ── */}
        <div className="space-y-4">
          {/* Selected day detail */}
          {selected && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 text-sm">
                  {selected} {MONTHS_TH[month]}
                </h4>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {selectedRentals.length === 0 ? (
                <div className="text-center py-5">
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">ว่างทุกตัว</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedRentals.map(r => (
                    <div key={r.id} className={`rounded-xl p-3 ${COLORS_LIGHT[r.colorIdx]}`}>
                      <div className="flex items-start gap-2">
                        {r.camera?.image_url
                          ? <img src={r.camera.image_url} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
                          : <div className={`w-8 h-8 rounded-lg flex-shrink-0 ${COLORS[r.colorIdx]} opacity-40`} />
                        }
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{r.camera?.name}</p>
                          <p className="text-xs mt-0.5 opacity-80">{r.customer?.name}</p>
                          {r.customer?.phone && <p className="text-xs opacity-70">{r.customer.phone}</p>}
                          <div className="flex items-center gap-1 mt-1.5 text-xs opacity-75">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25" /></svg>
                            {r.start_date} → {r.end_date}
                          </div>
                          {r.pickup_location && (
                            <p className="text-xs opacity-70 mt-0.5">📍 {r.pickup_location}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Month summary */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 text-sm mb-3">
              รายการเดือนนี้
              {monthRentals.length > 0 && (
                <span className="ml-2 text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{monthRentals.length}</span>
              )}
            </h4>
            {monthRentals.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">ไม่มีรายการ</p>
            ) : (
              <div className="space-y-2">
                {monthRentals.map(r => (
                  <div
                    key={r.id}
                    onClick={() => setSelected(parseInt(r.start_date.split('-')[2]))}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${COLORS[cameraColorMap[r.camera_id] ?? 0]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.camera?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{r.customer?.name} · {r.start_date.slice(5)} → {r.end_date.slice(5)}</p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${r.status === 'active' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {r.status === 'active' ? 'เช่า' : 'คืน'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
