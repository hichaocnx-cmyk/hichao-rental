import { useMemo, useState } from 'react'

/* ════════════════════════════════════════════════════════════
   BookingCalendar — ปฏิทินเดือนที่ลากแถบการจองยาวคาดตามจำนวนวัน
   ────────────────────────────────────────────────────────────
   · อ่านอย่างเดียว ไม่แก้ข้อมูลใดๆ (รับ rentals มาแล้ววาด)
   · 1 แถบ = 1 รายการเช่า ยาวจาก start_date ถึง end_date
   · ถ้าการจองคร่อมสัปดาห์ แถบจะถูกตัดเป็นท่อนตามแถว
     ท่อนที่ไม่ใช่หัว/ท้ายจริงจะมุมตัดตรง + มีเครื่องหมาย ‹ นำหน้า
   · ความสูงแถว/แถบคุมด้วยตัวแปร CSS ในคลาส .bcal (ดู index.css)
     เพราะแถบวาง absolute จึงคำนวณ top เองจาก --bc-lane
   ════════════════════════════════════════════════════════════ */

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const MONTHS_SHORT_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const DOW_TH = ['อา','จ','อ','พ','พฤ','ศ','ส']

// สีของแถบ — อ่อนพอให้ตัวหนังสือเข้มอ่านออก และแยกกันได้ด้วยตาเปล่า
export const BOOKING_COLORS = [
  { bg: '#FADCE7', fg: '#A82B57', bar: '#E8709B' },
  { bg: '#DCE8F8', fg: '#17518F', bar: '#6C9BD8' },
  { bg: '#DCEFE6', fg: '#14684C', bar: '#5FAF8D' },
  { bg: '#FAE6CF', fg: '#9A4A07', bar: '#E0A05A' },
  { bg: '#E6E0F5', fg: '#5B3FA8', bar: '#9784D2' },
  { bg: '#D9EDEF', fg: '#14636B', bar: '#63AEB5' },
]

const LANES = 3          // ต้องตรงกับ --bc-lanes ใน index.css
const pad2 = (n) => String(n).padStart(2, '0')

export const mkDs = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`
export const shortDate = (ds) => {
  if (!ds) return ''
  const [, m, d] = ds.split('-')
  return `${parseInt(d, 10)} ${MONTHS_SHORT_TH[parseInt(m, 10) - 1]}`
}
export const daySpan = (r) => {
  const a = Date.parse(r.start_date + 'T00:00:00')
  const b = Date.parse(r.end_date + 'T00:00:00')
  if (Number.isNaN(a) || Number.isNaN(b)) return 1
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

// สีคงที่ต่อ 1 รายการเช่า — เรียงตามวันเริ่มเพื่อให้สีไม่สลับไปมาเวลารีโหลด
export function useRentalColors(rentals) {
  return useMemo(() => {
    const map = {}
    let i = 0
    ;[...rentals]
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
      .forEach(r => {
        if (r.id != null && !(r.id in map)) {
          map[r.id] = BOOKING_COLORS[i % BOOKING_COLORS.length]
          i++
        }
      })
    return map
  }, [rentals])
}

export default function BookingCalendar({
  rentals = [],
  todayDs,
  selectedDs,
  onSelectDay,
  colorMap,
}) {
  const [cursor, setCursor] = useState(() => {
    const t = todayDs ? new Date(todayDs + 'T00:00:00') : new Date()
    return { y: t.getFullYear(), m: t.getMonth() }
  })

  const { y, m } = cursor
  const fallbackColors = useRentalColors(rentals)
  const colors = colorMap || fallbackColors

  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const rows = Math.ceil((firstDow + daysInMonth) / 7)

  // แปลง 'YYYY-MM-DD' -> เลขวันที่นับจากวันที่ 1 ของเดือนที่กำลังดู
  // (ค่าติดลบ = เดือนก่อน, เกิน daysInMonth = เดือนถัดไป)
  const dsToDay = (ds) => {
    if (!ds) return null
    const [yy, mm, dd] = ds.split('-').map(Number)
    if (!yy || !mm || !dd) return null
    return Math.round((Date.UTC(yy, mm - 1, dd) - Date.UTC(y, m, 1)) / 86400000) + 1
  }

  const firstVisible = 1 - firstDow
  const lastVisible = rows * 7 - firstDow

  // รายการที่คาบเกี่ยวกับเดือนนี้ + จัดเลนไม่ให้แถบทับกัน
  const bars = useMemo(() => {
    const list = rentals
      .filter(r => r.status !== 'cancelled' && r.start_date && r.end_date)
      .map(r => ({ r, s: dsToDay(r.start_date), e: dsToDay(r.end_date) }))
      .filter(b => b.s != null && b.e != null && b.e >= firstVisible && b.s <= lastVisible)
      .sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s))

    const laneEnd = []
    list.forEach(b => {
      let l = 0
      while (laneEnd[l] !== undefined && laneEnd[l] >= b.s) l++
      laneEnd[l] = b.e
      b.lane = l
    })
    return list
  }, [rentals, y, m, firstDow, daysInMonth])

  const monthCount = bars.length
  const goMonth = (delta) => {
    const d = new Date(y, m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }
  const goToday = () => {
    const t = todayDs ? new Date(todayDs + 'T00:00:00') : new Date()
    setCursor({ y: t.getFullYear(), m: t.getMonth() })
  }

  const dayDs = (dayNum) => {
    const d = new Date(y, m, dayNum)
    return mkDs(d.getFullYear(), d.getMonth(), d.getDate())
  }

  const pct = (n) => `${(n * 100) / 7}%`

  return (
    <div className="bcal bg-white rounded-2xl border border-gray-100 overflow-hidden">

      {/* ── หัวปฏิทิน ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3">
        <h3 className="text-[15px] sm:text-lg font-bold text-gray-900 tracking-tight">
          {MONTHS_TH[m]} {y + 543}
        </h3>
        <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full whitespace-nowrap">
          {monthCount} การจอง
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={() => goMonth(-1)} aria-label="เดือนก่อนหน้า"
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-brand-200 hover:text-brand-500 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m15 6-6 6 6 6" /></svg>
          </button>
          <button type="button" onClick={() => goMonth(1)} aria-label="เดือนถัดไป"
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-brand-200 hover:text-brand-500 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" /></svg>
          </button>
          <button type="button" onClick={goToday}
            className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:border-brand-200 hover:text-brand-500 transition-colors">
            วันนี้
          </button>
        </div>
      </div>

      {/* ── แถบหัววัน ─────────────────────────────────────────── */}
      <div className="flex" style={{ background: '#FAF8F6', borderTop: '1px solid var(--hc-grid)', borderBottom: '1px solid var(--hc-grid)' }}>
        {DOW_TH.map((d, i) => (
          <div key={d} className="text-center text-[10.5px] sm:text-xs font-semibold py-1.5"
            style={{
              width: pct(1),
              color: i === 0 || i === 6 ? '#B5AEA7' : '#6E6A66',
              borderRight: i === 6 ? 'none' : '1px solid var(--hc-grid)',
            }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── แถวสัปดาห์ ────────────────────────────────────────── */}
      {Array.from({ length: rows }, (_, row) => {
        const start = row * 7 - firstDow + 1
        const days = Array.from({ length: 7 }, (_, i) => start + i)
        const isLast = row === rows - 1

        const segs = []
        let overflow = 0
        bars.forEach(b => {
          const s = Math.max(b.s, start)
          const e = Math.min(b.e, start + 6)
          if (s > e) return
          if (b.lane >= LANES) { overflow++; return }
          const c = colors[b.r.id] || BOOKING_COLORS[0]
          const headL = b.s >= s
          const headR = b.e <= e
          segs.push(
            <div key={b.r.id + '-' + row}
              className="bcal-bar flex items-center gap-1 px-1 sm:px-2 overflow-hidden"
              style={{
                '--bc-lane': b.lane,
                left: `calc(${pct(s - start)} + 2px)`,
                width: `calc(${pct(e - s + 1)} - 4px)`,
                background: c.bg,
                boxShadow: headL ? `inset 3px 0 0 ${c.bar}` : 'none',
                borderRadius: `${headL ? 7 : 2}px ${headR ? 7 : 2}px ${headR ? 7 : 2}px ${headL ? 7 : 2}px`,
                paddingLeft: headL ? undefined : 4,
              }}>
              <span className="truncate text-[9px] sm:text-[11.5px] font-semibold leading-none" style={{ color: c.fg }}>
                {headL ? '' : '‹ '}{b.r.camera?.name || 'กล้อง'} · {b.r.customer?.name || '—'}
              </span>
              {headL && headR && (
                <span className="hidden sm:inline ml-auto text-[10px] font-semibold whitespace-nowrap" style={{ color: c.fg, opacity: .7 }}>
                  {daySpan(b.r)} วัน
                </span>
              )}
            </div>
          )
        })

        return (
          <div key={row} className={`bcal-row${overflow > 0 ? ' bcal-row--more' : ''}`}>

            {/* ชั้นที่ 1 — ช่องวัน (กดได้) */}
            {days.map((d, i) => {
              const out = d < 1 || d > daysInMonth
              const ds = out ? null : dayDs(d)
              const isToday = !out && ds === todayDs
              const isSel = !out && ds === selectedDs
              return (
                <button key={i} type="button" disabled={out}
                  onClick={() => { if (!out && onSelectDay) onSelectDay(ds) }}
                  className="absolute top-0 h-full p-0 border-0 disabled:cursor-default"
                  style={{
                    left: pct(i),
                    width: pct(1),
                    background: isToday ? 'var(--hc-today)' : out ? 'var(--hc-out)' : (i === 0 || i === 6) ? 'var(--hc-wknd)' : 'transparent',
                    borderRight: i === 6 ? 'none' : '1px solid var(--hc-grid)',
                    borderBottom: isLast ? 'none' : '1px solid var(--hc-grid)',
                    boxShadow: isSel && !isToday ? 'inset 0 0 0 1.5px #E06894' : 'none',
                  }}
                  aria-label={ds || undefined}
                />
              )
            })}

            {/* ชั้นที่ 2 — ตัวเลขวันที่ */}
            {days.map((d, i) => {
              const out = d < 1 || d > daysInMonth
              const shown = out
                ? (d < 1 ? new Date(y, m, 0).getDate() + d : d - daysInMonth)
                : d
              const isToday = !out && dayDs(d) === todayDs
              return (
                <div key={'n' + i}
                  className="absolute flex items-center justify-center pointer-events-none"
                  style={{ left: pct(i), width: pct(1), top: 2, height: 'calc(var(--bc-dateh) - 4px)' }}>
                  <span
                    className="flex items-center justify-center rounded-full tabular-nums text-[11.5px] sm:text-[13px] min-w-[19px] h-[19px] sm:min-w-[24px] sm:h-6"
                    style={{
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? '#fff' : out ? '#C8C3BD' : '#1C1A19',
                      background: isToday ? '#C9376B' : 'transparent',
                    }}>
                    {shown}
                  </span>
                </div>
              )
            })}

            {/* ชั้นที่ 3 — แถบการจอง */}
            {segs}
            {overflow > 0 && (
              <div className="bcal-more text-[9px] sm:text-[10.5px] text-gray-400" style={{ left: 6 }}>
                +{overflow} รายการ
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
