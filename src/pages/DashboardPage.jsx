import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { sendLineNotify } from '../lib/lineNotify'
import { DashboardSkeleton } from '../components/Skeleton'
import CountUp from '../components/CountUp'
import { useToast } from '../context/ToastContext'
import CameraIcon from '../components/CameraIcon'
import ReportSection from '../components/ReportSection'
import PaymentQRCard from '../components/PaymentQRCard'

// ── Donut Chart ────────────────────────────────────────────────────
function DonutChart({ data, total, colors }) {
  const [hovered, setHovered] = useState(null)
  const R = 70, cx = 90, cy = 90
  const circumference = 2 * Math.PI * R
  const GAP = 2

  let cumulative = 0
  const slices = data.map(([cat, val], i) => {
    const pct = val / total
    const offset = cumulative
    cumulative += pct
    return { cat, val, pct, offset, color: colors[i % colors.length] }
  })

  return (
    <div className="flex items-center gap-6">
      <div className="flex-shrink-0 relative" style={{ width: 180, height: 180 }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          {slices.map((s, i) => {
            const dashLen = Math.max(0, s.pct * circumference - GAP)
            const dashOffset = -(s.offset * circumference)
            const isHov = hovered === i
            return (
              <circle key={s.cat} cx={cx} cy={cy} r={R}
                fill="none" stroke={s.color}
                strokeWidth={isHov ? 20 : 16}
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={dashOffset} strokeLinecap="round"
                style={{ transition: 'stroke-width 0.15s', cursor: 'pointer', transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
            )
          })}
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="11" fill="#9ca3af" fontFamily="sans-serif">รายจ่ายรวม</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="13" fontWeight="600" fill="#111827" fontFamily="sans-serif">
            {hovered !== null ? `฿${slices[hovered].val.toLocaleString()}` : `฿${total.toLocaleString()}`}
          </text>
          {hovered !== null && (
            <text x={cx} y={cy + 28} textAnchor="middle" fontSize="10" fill="#6b7280" fontFamily="sans-serif">
              {Math.round(slices[hovered].pct * 100)}%
            </text>
          )}
        </svg>
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        {slices.map((s, i) => (
          <div key={s.cat}
            className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg transition-colors cursor-default ${hovered === i ? 'bg-gray-50' : ''}`}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-xs text-gray-700 truncate">{s.cat}</span>
            </div>
            <span className="text-xs font-semibold text-gray-600 flex-shrink-0">฿{s.val.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Queue Item ─────────────────────────────────────────────────────
function QueueItem({ rental, type }) {
  const time = type === 'pickup' ? rental.pickup_time : rental.return_time
  const loc  = type === 'pickup' ? rental.pickup_location : rental.return_location
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <CameraIcon className="w-9 h-9 rounded-xl flex-shrink-0" size="text-lg" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{rental.camera?.name || '—'}</p>
        <p className="text-xs text-gray-400 truncate">{rental.customer?.name || '—'}</p>
        {time && <p className="text-xs text-brand-500 font-medium mt-0.5">🕐 {time.slice(0,5)} น.</p>}
        {loc  && <p className="text-xs text-gray-400 truncate">📍 {loc}</p>}
      </div>
    </div>
  )
}

// ── Constants ──────────────────────────────────────────────────────
const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const DAYS_TH   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']
const EXP_COLORS = ['#C9376B','#D98324','#14684C','#5B3FA8','#17518F']

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'สวัสดีตอนเช้า'
  if (h < 17) return 'สวัสดีตอนบ่าย'
  return 'สวัสดีตอนเย็น'
}

const currentMonthLabel = () => {
  const d = new Date()
  return `${MONTHS_TH[d.getMonth()]} ${d.getFullYear()}`
}


// ── Main Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const { stats, rentals, loading } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const [lineSending, setLineSending] = useState(false)
  const [lineSent, setLineSent]       = useState(false)

  const fmt      = (v) => loading ? '—' : v
  const fmtMoney = (v) => loading ? '—' : `฿${Number(v).toLocaleString()}`

  // ── วันนี้ ───────────────────────────────────────────────────────
  const today    = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const dayLabel = `${DAYS_TH[today.getDay()]}ที่ ${today.getDate()} ${MONTHS_TH[today.getMonth()]} ${today.getFullYear() + 543}`

  const pickups = rentals.filter(r => r.start_date === todayStr && (r.status === 'booked' || r.status === 'active'))
  const returns = rentals.filter(r => r.end_date === todayStr && r.status === 'active' && r.start_date !== todayStr)
  const hasQueue = pickups.length > 0 || returns.length > 0

  // ── Send LINE queue ───────────────────────────────────────────────
  const handleSendQueueLine = async () => {
    setLineSending(true)
    try {
      let msg = `[HICHAO.CNX] 📋 คิวประจำวัน\n${dayLabel}\n`
      msg += `\n📦 รับกล้อง (${pickups.length} รายการ)\n`
      if (pickups.length === 0) {
        msg += `  — ไม่มีรายการ\n`
      } else {
        pickups.forEach((r, i) => {
          const time = r.pickup_time ? ` เวลา ${r.pickup_time.slice(0,5)}` : ''
          const loc  = r.pickup_location ? ` 📍 ${r.pickup_location}` : ''
          msg += `  ${i+1}. 📷 ${r.camera?.name||'—'} · ${r.customer?.name||'—'}${time}${loc}\n`
        })
      }
      msg += `\n🔄 คืนกล้อง (${returns.length} รายการ)\n`
      if (returns.length === 0) {
        msg += `  — ไม่มีรายการ\n`
      } else {
        returns.forEach((r, i) => {
          const time = r.return_time ? ` เวลา ${r.return_time.slice(0,5)}` : ''
          const loc  = r.return_location ? ` 📍 ${r.return_location}` : ''
          msg += `  ${i+1}. 📷 ${r.camera?.name||'—'} · ${r.customer?.name||'—'}${time}${loc}\n`
        })
      }
      msg += `\nรวม ${pickups.length + returns.length} รายการ`
      await sendLineNotify(msg)
      setLineSent(true)
      toast.success('ส่งสรุปคิวไป LINE แล้ว')
      setTimeout(() => setLineSent(false), 4000)
    } catch (e) { toast.error('ส่ง LINE ไม่สำเร็จ: ' + e.message) }
    finally { setLineSending(false) }
  }

  const bd       = stats.revenueBreakdown || {}
  const revTotal = stats.monthRevenue || 0

  // ── กราฟ: แนวโน้มรายได้ย้อนหลัง 6 เดือน + กล้องทำเงินสูงสุด ──
  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-4">

      {/* ── Greeting Header ─────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 px-5 py-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-2xl flex-shrink-0">🐱</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-900">{getGreeting()}, คุณนิจ ☀️</h2>
          <span className="inline-block mt-1 text-[11px] font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
            {(pickups.length + returns.length) > 0
              ? `วันนี้มีคิว ${pickups.length + returns.length} รายการนะนิจ~`
              : 'วันนี้ไม่มีคิว ชิลล์ๆ ได้เลยนิจ ✨'}
          </span>
        </div>
        <div className="w-10 h-10 bg-brand-500 rounded-2xl flex items-center justify-center shadow-sm shadow-brand-200 flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
          </svg>
        </div>
      </div>

      {/* ── QR รับเงิน + คิวประจำวัน ──────────────────────────────
           (แทนปฏิทินการจอง/จองล่วงหน้าเดิม — ปฏิทินเต็มยังเปิดได้ที่ /calendar)
           มือถือ: QR อยู่บนสุด · จอใหญ่: QR ซ้าย คิววันนี้ขวา              */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4 items-start">
        <PaymentQRCard pickups={pickups} />

      {/* ── คิวประจำวัน ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">คิวประจำวัน</h3>
            <p className="text-xs text-gray-400 mt-0.5">{dayLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSendQueueLine} disabled={lineSending || !hasQueue}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors disabled:opacity-40
                ${lineSent ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-500 hover:border-brand-200 hover:text-brand-500'}`}>
              {lineSending
                ? <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : lineSent
                  ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" /></svg>
              }
              {lineSent ? 'ส่งแล้ว!' : 'ส่ง LINE'}
            </button>
            <button onClick={() => navigate('/rentals')}
              className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
              ดูทั้งหมด
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasQueue ? (
          <div className="flex flex-col items-center py-10 gap-2">
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">ว่างทั้งวัน ไม่มีคิววันนี้ 🎉</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-50">

            {/* รับกล้อง */}
            <div>
              <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <p className="text-xs font-semibold text-emerald-700">📦 รับกล้อง</p>
                <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{pickups.length} รายการ</span>
              </div>
              <div className="px-5 divide-y divide-gray-50">
                {pickups.length === 0
                  ? <p className="py-6 text-sm text-gray-300 text-center">ไม่มีรายการ</p>
                  : pickups.map(r => <QueueItem key={r.id} rental={r} type="pickup" />)
                }
              </div>
            </div>

            {/* คืนกล้อง */}
            <div>
              <div className="flex items-center gap-2 px-5 py-3 bg-orange-50/50">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                <p className="text-xs font-semibold text-orange-700">🔄 คืนกล้อง</p>
                <span className="ml-auto text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">{returns.length} รายการ</span>
              </div>
              <div className="px-5 divide-y divide-gray-50">
                {returns.length === 0
                  ? <p className="py-6 text-sm text-gray-300 text-center">ไม่มีรายการ</p>
                  : returns.map(r => <QueueItem key={r.id} rental={r} type="return" />)
                }
              </div>
            </div>

          </div>
        )}
      </div>
      </div>

      {/* ── สรุปเดือนนี้ (รวมแถวตัวเลข + รายได้ + รายจ่าย ไว้การ์ดเดียว) ──────
           นับถึง "วันนี้" เท่านั้น — คิวที่ยังไม่ถึงวันรับกล้องยังไม่นับ (src/lib/revenue.js) */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-50">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">สรุปเดือนนี้ — {currentMonthLabel()}</h3>
            <p className="text-xs text-gray-400 mt-0.5">นับถึงวันที่ {today.getDate()} · คิวที่ยังไม่ถึงวันรับกล้องยังไม่นับ</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full">
              📅 คิววันนี้ {pickups.length + returns.length} · รับ {pickups.length} คืน {returns.length}
            </span>
            <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full">
              📷 กล้องว่าง {fmt(stats.availableCameras ?? 0)}/{fmt(stats.totalCameras)} ตัว
            </span>
          </div>
        </div>

        {/* ตัวเลขหลัก */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
          <div className="bg-brand-50 rounded-2xl p-4">
            <p className="text-[11px] font-medium text-brand-500">รายได้ค่าเช่า</p>
            <p className="text-lg sm:text-xl font-bold text-brand-700 leading-tight truncate mt-1">{loading ? '—' : <CountUp value={bd.rentalIncome ?? 0} format={(v) => `฿${v.toLocaleString()}`} />}</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-4">
            <p className="text-[11px] font-medium text-red-500">รายจ่าย</p>
            <p className="text-lg sm:text-xl font-bold text-red-600 leading-tight truncate mt-1">{loading ? '—' : <CountUp value={stats.monthExpenseTotal ?? 0} format={(v) => `฿${v.toLocaleString()}`} />}</p>
          </div>
          <div className={`rounded-2xl p-4 ${(stats.monthProfit ?? 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <p className={`text-[11px] font-medium ${(stats.monthProfit ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>กำไรสุทธิ</p>
            <p className={`text-lg sm:text-xl font-bold leading-tight truncate mt-1 ${(stats.monthProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{loading ? '—' : <CountUp value={Math.abs(stats.monthProfit ?? 0)} format={(v) => `${(stats.monthProfit ?? 0) < 0 ? '−' : ''}฿${v.toLocaleString()}`} />}</p>
          </div>
          <div className="bg-violet-50 rounded-2xl p-4">
            <p className="text-[11px] font-medium text-violet-500">ลูกค้าเช่า</p>
            <p className="text-lg sm:text-xl font-bold text-violet-700 leading-tight mt-1">{loading ? '—' : <CountUp value={stats.monthCustomerCount ?? 0} />} <span className="text-xs font-medium text-violet-500">คน · {stats.monthRentalCount ?? 0} รายการ</span></p>
          </div>
        </div>

        {/* รายละเอียด: รายได้ (ซ้าย) · รายจ่ายแยกหมวด (ขวา) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 border-t border-gray-50 divide-y lg:divide-y-0 lg:divide-x divide-gray-50">
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">รายได้ · แยกตามสถานะ</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 rounded-full bg-brand-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">รายได้ค่าเช่า</p>
                  <p className="text-[11px] text-gray-400">คืนแล้ว + กำลังเช่า + มัดจำ ✅</p>
                </div>
                <p className="text-base font-bold text-gray-900">{fmtMoney(bd.rentalIncome ?? 0)}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 rounded-full bg-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">ประกันถือไว้ <span className="text-gray-300">(ไม่นับเป็นรายได้)</span></p>
                  <p className="text-[11px] text-gray-400">คืนให้ลูกค้าวันคืนกล้อง 🔒</p>
                </div>
                <p className="text-base font-bold text-gray-900">{fmtMoney(bd.heldInsurance ?? 0)}</p>
              </div>
            </div>
            {revTotal > 0 && (
              <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100 mt-4">
                {[{v:bd.rentalIncome??0,c:'#C9376B'},{v:bd.heldInsurance??0,c:'#f59e0b'}]
                  .filter(x => x.v > 0)
                  .map((x, i) => (
                    <div key={i} style={{width:`${(x.v/revTotal)*100}%`,background:x.c}} />
                  ))}
              </div>
            )}
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500">รายจ่าย · แยกหมวด</p>
              <button onClick={() => navigate('/expenses')}
                className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                ดูทั้งหมด
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (stats.expByCategory || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-300">ยังไม่มีรายจ่ายเดือนนี้</p>
                <button onClick={() => navigate('/expenses')} className="mt-2 text-xs text-brand-500 hover:underline">+ เพิ่มรายจ่าย</button>
              </div>
            ) : (
              <DonutChart data={stats.expByCategory || []} total={stats.monthExpenseTotal} colors={EXP_COLORS} />
            )}
          </div>
        </div>
      </div>

      {/* ── รายงานย้อนหลัง ─────────────────────────────────────── */}
      <ReportSection />

    </div>
  )
}
