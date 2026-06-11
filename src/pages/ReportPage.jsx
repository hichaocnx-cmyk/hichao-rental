import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { ReportSkeleton } from '../components/Skeleton'

// ── Helpers ────────────────────────────────────────────────────
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function fmtMoney(v) {
  if (v >= 1_000_000) return `฿${(v/1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `฿${(v/1_000).toFixed(1)}k`
  return `฿${Number(v).toLocaleString()}`
}

function getLastNMonths(n) {
  const result = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      year:  d.getFullYear(),
      month: d.getMonth(),
      label: MONTHS_TH[d.getMonth()],
      prefix: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    })
  }
  return result
}

// ── Bar Chart ──────────────────────────────────────────────────
function BarChart({ data, maxVal }) {
  const [tooltip, setTooltip] = useState(null)
  const chartH = 180
  const barW = 32
  const gap = 14
  const totalW = data.length * (barW + gap) - gap
  const padL = 44, padB = 28, padT = 20

  return (
    <div className="relative overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW + padL + 16} ${chartH + padB + padT}`}
        className="w-full min-w-[320px]"
        style={{ height: chartH + padB + padT }}
      >
        <defs>
          <filter id="ttShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Y grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padT + chartH - frac * chartH
          return (
            <g key={frac}>
              <line x1={padL} y1={y} x2={totalW + padL} y2={y}
                stroke="#f3f4f6" strokeWidth={1} />
              <text x={padL - 6} y={y + 4} textAnchor="end"
                fontSize={9} fill="#d1d5db">
                {fmtMoney(maxVal * frac)}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = padL + i * (barW + gap)
          const barH = maxVal > 0 ? (d.revenue / maxVal) * chartH : 0
          const expH = maxVal > 0 ? Math.min((d.expenses / maxVal) * chartH, barH) : 0
          const y = padT + chartH - barH
          const isHovered = tooltip?.i === i
          const isCurrent = i === data.length - 1

          return (
            <g key={i}
              onMouseEnter={() => setTooltip({ i, ...d })}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'pointer' }}>
              {/* Revenue bar */}
              <rect x={x} y={y} width={barW} height={Math.max(barH, 0)}
                rx={6} fill={isCurrent ? '#FF6B9D' : isHovered ? '#ffaac9' : '#ffd6e7'}
                style={{ transition: 'fill 0.15s' }}
              />
              {/* Expense overlay */}
              {expH > 0 && (
                <rect x={x} y={padT + chartH - expH} width={barW} height={expH}
                  rx={6} fill={isCurrent ? '#fb923c' : '#fed7aa'}
                  style={{ transition: 'fill 0.15s' }}
                />
              )}
              {/* X label */}
              <text x={x + barW / 2} y={padT + chartH + 16}
                textAnchor="middle" fontSize={10}
                fill={isCurrent ? '#FF6B9D' : '#9ca3af'}
                fontWeight={isCurrent ? '600' : '400'}>
                {d.label}
              </text>
              {/* Value above bar */}
              {barH > 14 && (
                <text x={x + barW / 2} y={y - 4}
                  textAnchor="middle" fontSize={9}
                  fill={isCurrent ? '#FF6B9D' : '#d1d5db'}>
                  {fmtMoney(d.revenue)}
                </text>
              )}
            </g>
          )
        })}

        {/* Tooltip */}
        {tooltip && (() => {
          const i = tooltip.i
          const x = padL + i * (barW + gap)
          const ttW = 124, ttH = 58
          const ttX = Math.max(padL, Math.min(x + barW / 2 - ttW / 2, totalW + padL - ttW))
          const ttY = padT
          return (
            <g pointerEvents="none">
              <rect x={ttX} y={ttY} width={ttW} height={ttH} rx={8}
                fill="white" stroke="#e5e7eb" strokeWidth={1} filter="url(#ttShadow)" />
              <text x={ttX + 10} y={ttY + 18} fontSize={11} fill="#374151" fontWeight="600">
                {tooltip.label} {tooltip.year}
              </text>
              <text x={ttX + 10} y={ttY + 33} fontSize={10} fill="#FF6B9D">
                รายรับ {fmtMoney(tooltip.revenue)}
              </text>
              <text x={ttX + 10} y={ttY + 48} fontSize={10} fill="#fb923c">
                รายจ่าย {fmtMoney(tooltip.expenses)}
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-brand-300" />
          <span className="text-xs text-gray-400">รายรับ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-orange-300" />
          <span className="text-xs text-gray-400">รายจ่าย</span>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function ReportPage() {
  const { rentals, expenses, cameras, loading } = useApp()
  const [period, setPeriod] = useState(6)

  const months = useMemo(() => getLastNMonths(period), [period])

  const monthlyData = useMemo(() => {
    return months.map(m => {
      const mRentals = rentals.filter(r =>
        r.status !== 'cancelled' && (r.start_date || '').startsWith(m.prefix)
      )
      const mExpenses = expenses.filter(e => (e.date || '').startsWith(m.prefix))
      // รายรับ = เงินที่รับแล้วจริง (นิยามเดียวกับหน้าหลัก):
      // คืนแล้ว/กำลังเช่า = ค่าเช่าเต็ม+ค่าส่ง, จองแล้ว = เฉพาะมัดจำที่รับมา
      const revenue = mRentals.reduce((s, r) => {
        const full = Number(r.total_price || 0) + Number(r.delivery_fee || 0)
        return s + (r.status === 'booked' ? Number(r.deposit || 0) : full)
      }, 0)
      // ยอดรอรับจากคิวจอง (ส่วนที่ยังไม่ได้เก็บ)
      const pending = mRentals.reduce((s, r) => r.status === 'booked'
        ? s + Math.max(0, Number(r.total_price || 0) + Number(r.delivery_fee || 0) - Number(r.deposit || 0))
        : s, 0)
      const exp = mExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
      return { ...m, revenue, pending, expenses: exp, profit: revenue - exp, count: mRentals.length }
    })
  }, [months, rentals, expenses])

  const maxVal = Math.max(...monthlyData.map(d => Math.max(d.revenue, d.expenses)), 1)
  const totalRevenue  = monthlyData.reduce((s, d) => s + d.revenue, 0)
  const totalExpenses = monthlyData.reduce((s, d) => s + d.expenses, 0)
  const totalProfit   = totalRevenue - totalExpenses
  const totalCount    = monthlyData.reduce((s, d) => s + d.count, 0)
  const totalPending  = monthlyData.reduce((s, d) => s + d.pending, 0)
  const currentMonth  = monthlyData[monthlyData.length - 1]

  const cameraRankings = useMemo(() => {
    const prefixes = new Set(months.map(m => m.prefix))
    const map = {}
    rentals
      .filter(r => r.status !== 'cancelled' && prefixes.has((r.start_date || '').slice(0, 7)))
      .forEach(r => {
        if (!r.camera_id) return
        if (!map[r.camera_id]) map[r.camera_id] = { count: 0, revenue: 0, camera: r.camera }
        map[r.camera_id].count += 1
        map[r.camera_id].revenue += Number(r.total_price || 0)
      })
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [rentals, months])

  const expCategories = useMemo(() => {
    const map = {}
    const prefixes = months.map(m => m.prefix)
    expenses
      .filter(e => prefixes.some(p => (e.date || '').startsWith(p)))
      .forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0) })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [expenses, months])

  if (loading) return <ReportSkeleton />

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">รายงาน</h2>
          <p className="text-xs text-gray-400 mt-0.5">ข้อมูลรายรับ-รายจ่ายและสถิติ</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {[3, 6].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                period === p ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {p} เดือน
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            label: 'รายรับรวม', value: fmtMoney(totalRevenue),
            sub: totalPending > 0 ? `${totalCount} รายการ · รอรับอีก ${fmtMoney(totalPending)}` : `${totalCount} รายการ`, iconBg: 'bg-brand-50', iconColor: 'text-brand-500',
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75" />,
          },
          {
            label: 'รายจ่ายรวม', value: fmtMoney(totalExpenses),
            sub: `${expCategories.length} หมวดหมู่`, iconBg: 'bg-orange-50', iconColor: 'text-orange-400',
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" />,
          },
          {
            label: 'กำไรสุทธิ',
            value: `${totalProfit < 0 ? '−' : ''}${fmtMoney(Math.abs(totalProfit))}`,
            valueColor: totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500',
            sub: totalRevenue > 0 ? `margin ${Math.round((totalProfit/totalRevenue)*100)}%` : '—',
            iconBg: totalProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50',
            iconColor: totalProfit >= 0 ? 'text-emerald-500' : 'text-red-400',
            icon: totalProfit >= 0
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" />,
          },
          {
            label: 'เดือนนี้', value: fmtMoney(currentMonth.revenue),
            sub: currentMonth.pending > 0 ? `${currentMonth.count} รายการ · รอรับ ${fmtMoney(currentMonth.pending)}` : `${currentMonth.count} รายการ`, iconBg: 'bg-sky-50', iconColor: 'text-sky-400',
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />,
          },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
              <div className={`w-8 h-8 ${s.iconBg} rounded-xl flex items-center justify-center`}>
                <svg className={`w-4 h-4 ${s.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {s.icon}
                </svg>
              </div>
            </div>
            <p className={`text-xl font-bold ${s.valueColor || 'text-gray-900'}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Bar Chart ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-800">รายรับ-รายจ่าย รายเดือน</h3>
          <p className="text-xs text-gray-400 mt-0.5">ย้อนหลัง {period} เดือน</p>
        </div>
        {totalRevenue === 0 && totalExpenses === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium text-sm">ยังไม่มีข้อมูล</p>
            <p className="text-gray-400 text-xs mt-1">เริ่มบันทึกการเช่าและรายจ่ายเพื่อดูกราฟ</p>
          </div>
        ) : (
          <BarChart data={monthlyData} maxVal={maxVal} />
        )}
      </div>

      {/* ── Bottom two columns ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Top cameras */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">กล้องที่ถูกเช่ามากสุด</h3>
          {cameraRankings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg className="w-8 h-8 text-gray-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              </svg>
              <p className="text-gray-400 text-sm">ยังไม่มีข้อมูล</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cameraRankings.map((item, i) => {
                const pct = Math.round((item.count / cameraRankings[0].count) * 100)
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm w-6 text-center">{medal}</span>
                        <p className="text-sm text-gray-800 font-medium">{item.camera?.name || '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="text-xs font-bold text-gray-700">{item.count} ครั้ง</span>
                        <span className="text-xs text-brand-500 ml-2">{fmtMoney(item.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-brand-400 transition-all duration-500"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Expense breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">รายจ่ายแยกหมวดหมู่</h3>
          {expCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg className="w-8 h-8 text-gray-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125 1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75" />
              </svg>
              <p className="text-gray-400 text-sm">ยังไม่มีรายจ่ายในช่วงนี้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expCategories.map(([cat, amt], i) => {
                const pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0
                const COLORS = ['#FF6B9D','#fb923c','#facc15','#34d399','#60a5fa']
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: COLORS[i % COLORS.length] }} />
                        <p className="text-sm text-gray-700">{cat || 'อื่นๆ'}</p>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <span className="text-xs font-bold text-gray-700">{fmtMoney(amt)}</span>
                        <span className="text-xs text-gray-400 ml-1.5">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
