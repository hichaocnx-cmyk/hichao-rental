import { useMemo, useState } from 'react'
import { rentalRevenue, hasStarted, todayStr } from '../lib/revenue'
import { rentalDays } from '../lib/rentalDays'

/* ══════════════════════════════════════════════════════════════
   กล้องยอดนิยม — อยู่ในรายงานย้อนหลัง (ใช้ช่วง 3/6 เดือนเดียวกับรายงาน)
   - อันดับ 1 เป็นการ์ดเด่น · อันดับ 2–5 เป็นรายการพร้อมแถบสัดส่วน
   - สลับเรียงตาม "จำนวนครั้ง" หรือ "รายได้"
   - นับเฉพาะคิวที่ถึงวันรับกล้องแล้ว ไม่นับรายการยกเลิก (กติกาเดียวกับทั้งแอป)
   ══════════════════════════════════════════════════════════════ */

const baht = (n) => '฿' + Math.round(n).toLocaleString()
const MEDAL = ['🥇', '🥈', '🥉']

const CamIcon = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
  </svg>
)

export default function TopCameras({ rentals = [], months = [], period }) {
  const [sortBy, setSortBy] = useState('count')   // 'count' | 'revenue'

  const { list, totalRevenue, totalCount } = useMemo(() => {
    const prefixes = new Set(months.map(m => m.prefix))
    const today = todayStr()
    const map = {}
    let totalRevenue = 0, totalCount = 0
    for (const r of rentals) {
      if (r.status === 'cancelled' || !r.camera_id) continue
      if (!prefixes.has((r.start_date || '').slice(0, 7)) || !hasStarted(r, today)) continue
      if (!map[r.camera_id]) map[r.camera_id] = { id: r.camera_id, camera: r.camera, count: 0, revenue: 0, days: 0 }
      const m = map[r.camera_id]
      const rev = rentalRevenue(r)
      m.count += 1; m.revenue += rev; m.days += rentalDays(r)
      totalRevenue += rev; totalCount += 1
    }
    return { list: Object.values(map), totalRevenue, totalCount }
  }, [rentals, months])

  const ranked = useMemo(() => {
    const key = sortBy === 'revenue' ? 'revenue' : 'count'
    const other = key === 'count' ? 'revenue' : 'count'
    return [...list].sort((a, b) => b[key] - a[key] || b[other] - a[other]).slice(0, 5)
  }, [list, sortBy])

  const top = ranked[0]
  const rest = ranked.slice(1)
  const maxVal = top ? (sortBy === 'revenue' ? top.revenue : top.count) : 1
  const share = (c) => (totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* หัวการ์ด */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">กล้องยอดนิยม</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            ย้อนหลัง {period} เดือน · เช่ารวม {totalCount} ครั้ง · {baht(totalRevenue)}
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {[['count', 'จำนวนครั้ง'], ['revenue', 'รายได้']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setSortBy(k)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                sortBy === k ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {!top ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CamIcon className="w-8 h-8 text-gray-200 mb-2" />
          <p className="text-gray-400 text-sm">ยังไม่มีข้อมูลการเช่าในช่วงนี้</p>
        </div>
      ) : (
        <div className="px-5 pb-5">
          {/* อันดับ 1 — การ์ดเด่น */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white p-4 sm:p-5">
            <CamIcon className="absolute -right-5 -top-5 w-28 h-28 text-white/10" />
            <div className="relative flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <CamIcon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white/80 tracking-wide">🥇 อันดับ 1 · {sortBy === 'revenue' ? 'ทำเงินสูงสุด' : 'ถูกเช่าบ่อยสุด'}</p>
                <p className="text-lg font-bold leading-tight truncate mt-0.5">{top.camera?.name || 'กล้อง'}</p>
                {top.camera?.brand && <p className="text-xs text-white/70">{top.camera.brand}</p>}
              </div>
            </div>
            <div className="relative grid grid-cols-3 gap-2 mt-4">
              {[
                [`${top.count}`, 'ครั้ง'],
                [baht(top.revenue), 'รายได้'],
                [`${top.days}`, 'วันที่ถูกเช่า'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,.12)" }}>
                  <p className="text-base sm:text-lg font-bold leading-tight truncate">{v}</p>
                  <p className="text-[11px] text-white/75">{l}</p>
                </div>
              ))}
            </div>
            <div className="relative mt-3">
              <div className="flex justify-between text-[11px] text-white/80 mb-1">
                <span>สัดส่วนรายได้ทั้งร้าน</span><span className="font-semibold text-white">{share(top)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-white" style={{ width: `${share(top)}%` }} />
              </div>
            </div>
          </div>

          {/* อันดับ 2–5 */}
          {rest.length > 0 && (
            <div className="mt-3 divide-y divide-gray-50">
              {rest.map((c, i) => {
                const v = sortBy === 'revenue' ? c.revenue : c.count
                const pct = Math.max(4, Math.round((v / maxVal) * 100))
                const rank = i + 2
                return (
                  <div key={c.id} className="flex items-center gap-3 py-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${rank <= 3 ? '' : 'bg-gray-100 text-gray-500 text-xs font-bold'}`}>
                      {MEDAL[rank - 1] || rank}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0">
                      <CamIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.camera?.name || 'กล้อง'}</p>
                        <p className="text-sm font-bold text-gray-800 flex-shrink-0 tabular-nums">
                          {sortBy === 'revenue' ? baht(c.revenue) : `${c.count} ครั้ง`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-brand-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] text-gray-400 flex-shrink-0 tabular-nums">
                          {sortBy === 'revenue' ? `${c.count} ครั้ง` : baht(c.revenue)} · {c.days} วัน · {share(c)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
