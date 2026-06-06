import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { sendLineNotify } from '../lib/lineNotify'
import { DashboardSkeleton } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'

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
      {rental.camera?.image_url
        ? <img src={rental.camera.image_url} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" alt="" />
        : <div className="w-9 h-9 bg-brand-50 rounded-xl flex-shrink-0 flex items-center justify-center">
            <svg className="w-4 h-4 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            </svg>
          </div>
      }
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
const EXP_COLORS = ['#FF6B9D','#f59e0b','#10b981','#6366f1','#3b82f6']

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

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-4">

      {/* ── Greeting Header ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg">🌸</span>
            <h2 className="text-base font-bold text-gray-900">{getGreeting()}, คุณนิจ เจ้าของร้าน</h2>
          </div>
          <p className="text-xs text-gray-400">{dayLabel}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm shadow-brand-200">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Stats Cards Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">

        {/* รายได้ค่าเช่า */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg style={{width:18,height:18}} className="text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span className="text-[10px] font-medium text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded-full leading-tight">{currentMonthLabel()}</span>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 leading-tight">{fmtMoney(bd.rentalIncome ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">รายได้ค่าเช่า</p>
          </div>
        </div>

        {/* กำไรสุทธิ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${(stats.monthProfit ?? 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <svg style={{width:18,height:18}} className={`${(stats.monthProfit ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
          </div>
          <div>
            <p className={`text-xl font-bold leading-tight ${(stats.monthProfit ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {loading ? '—' : `${(stats.monthProfit ?? 0) < 0 ? '−' : ''}฿${Math.abs(stats.monthProfit ?? 0).toLocaleString()}`}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">กำไรสุทธิเดือนนี้</p>
          </div>
        </div>

        {/* คิววันนี้ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg style={{width:18,height:18}} className="text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 leading-tight">{fmt(pickups.length + returns.length)}</p>
            <p className="text-xs text-gray-400 mt-0.5">คิววันนี้ · รับ {pickups.length} คืน {returns.length}</p>
          </div>
        </div>

        {/* กล้องว่าง */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg style={{width:18,height:18}} className="text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
            </div>
            <span className="text-[10px] text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded-full leading-tight">จาก {fmt(stats.totalCameras)} ตัว</span>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 leading-tight">{fmt(stats.availableCameras)}</p>
            <p className="text-xs text-gray-400 mt-0.5">กล้องว่างพร้อมเช่า</p>
          </div>
        </div>

      </div>

      {/* ── Revenue Breakdown ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">รายได้เดือนนี้ — {currentMonthLabel()}</h3>
            <p className="text-xs text-gray-400 mt-0.5">แยกตามสถานะการเช่า</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-50">
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-1.5 h-10 rounded-full bg-brand-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">รายได้ค่าเช่า</p>
              <p className="text-base font-bold text-gray-900">{fmtMoney(bd.rentalIncome ?? 0)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">คืนแล้ว + กำลังเช่า + มัดจำ ✅</p>
            </div>
          </div>
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-1.5 h-10 rounded-full bg-amber-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">ประกันถือไว้</p>
              <p className="text-base font-bold text-gray-900">{fmtMoney(bd.heldInsurance ?? 0)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">คืนให้ลูกค้าวันรับกล้อง 🔒</p>
            </div>
          </div>
        </div>
        {revTotal > 0 && (
          <div className="px-5 pb-4">
            <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
              {[{v:bd.rentalIncome??0,c:'#FF6B9D'},{v:bd.heldInsurance??0,c:'#f59e0b'}]
                .filter(s => s.v > 0)
                .map((s, i) => (
                  <div key={i} style={{width:`${(s.v/revTotal)*100}%`,background:s.c}} />
                ))}
            </div>
          </div>
        )}
      </div>

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

      {/* ── รายจ่ายเดือนนี้ ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">รายจ่ายเดือนนี้ — {currentMonthLabel()}</h3>
          </div>
          <button onClick={() => navigate('/expenses')}
            className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
            ดูทั้งหมด
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 divide-y xl:divide-y-0 xl:divide-x divide-gray-50">

          {/* Summary */}
          <div className="px-5 py-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg style={{width:18,height:18}} className="text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400">รายจ่ายรวมเดือนนี้</p>
                <p className="text-lg font-bold text-red-500">{fmtMoney(stats.monthExpenseTotal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${(stats.monthProfit ?? 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <svg style={{width:18,height:18}} className={`${(stats.monthProfit ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400">กำไรสุทธิ</p>
                <p className={`text-lg font-bold ${(stats.monthProfit ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {loading ? '—' : `${(stats.monthProfit ?? 0) < 0 ? '−' : ''}฿${Math.abs(stats.monthProfit ?? 0).toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="xl:col-span-2 px-5 py-5">
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

    </div>
  )
}
