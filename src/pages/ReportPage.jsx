import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

const fmtMoney = v => `฿${Number(v || 0).toLocaleString()}`
const fmtDate  = iso => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${parseInt(d)} ${MONTHS_TH[parseInt(m)-1]} ${parseInt(y) + 543}`
}

const TODAY     = new Date()
const THIS_YEAR = TODAY.getFullYear()
const THIS_MON  = `${THIS_YEAR}-${String(TODAY.getMonth()+1).padStart(2,'0')}`

// ── Export Excel via SheetJS CDN ─────────────────────────────────
async function exportExcel(rentals, expenses, mode, selectedYear, selectedMonth) {
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs')
  const wb   = XLSX.utils.book_new()

  const filterRentals  = r => mode === 'monthly' ? r.start_date?.startsWith(selectedMonth) : r.start_date?.startsWith(String(selectedYear))
  const filterExpenses = e => mode === 'monthly' ? e.date?.startsWith(selectedMonth)       : e.date?.startsWith(String(selectedYear))

  const filtR = rentals.filter(filterRentals)
  const filtE = expenses.filter(filterExpenses)

  // Sheet 1: สรุป
  const retR       = filtR.filter(r=>r.status==='returned')
  const totalGross = retR.reduce((s,r)=>s+Number(r.total_price)+Number(r.discount||0),0)
  const totalDisc  = retR.reduce((s,r)=>s+Number(r.discount||0),0)
  const totalRev   = retR.reduce((s,r)=>s+Number(r.total_price),0)
  const totalExp   = filtE.reduce((s,e)=>s+Number(e.amount),0)
  const summaryData = [
    ['รายงาน HICHAO.CNX Camera Rental'],
    [mode === 'monthly' ? `เดือน: ${MONTHS_TH[parseInt(selectedMonth.split('-')[1])-1]} ${selectedMonth.split('-')[0]}` : `ปี: ${selectedYear}`],
    [],
    ['หัวข้อ', 'ยอด (฿)'],
    ['รายได้รวม (ก่อนส่วนลด)', totalGross],
    ['ส่วนลดรวม', totalDisc],
    ['รายได้สุทธิ (หลังส่วนลด)', totalRev],
    ['รายจ่ายรวม', totalExp],
    ['กำไรสุทธิ', totalRev - totalExp],
    [],
    ['จำนวนรายการเช่า', filtR.length],
    ['จำนวนรายการคืนแล้ว', retR.length],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุป')

  // Sheet 2: รายการเช่า
  const rentalRows = [['วันรับ','วันคืน','กล้อง','ลูกค้า','เบอร์โทร','สถานะ','ราคาเช่า (ก่อนลด)','ส่วนลด','ราคาสุทธิ','มัดจำ','ประกัน','ค่าส่ง','จ่ายวันรับ','หมายเหตุ']]
  filtR.forEach(r => {
    const disc  = Number(r.discount||0)
    const gross = Number(r.total_price)+disc
    rentalRows.push([
      r.start_date, r.end_date,
      r.camera?.name||'—', r.customer?.name||'—', r.customer?.phone||'—',
      r.status, gross, disc, Number(r.total_price),
      Number(r.deposit), Number(r.insurance||0),
      Number(r.delivery_fee||0), Number(r.due_on_pickup||0), r.notes||''
    ])
  })
  const wsRentals = XLSX.utils.aoa_to_sheet(rentalRows)
  XLSX.utils.book_append_sheet(wb, wsRentals, 'รายการเช่า')

  // Sheet 3: รายจ่าย
  const expRows = [['วันที่','หมวดหมู่','จำนวนเงิน (฿)','หมายเหตุ']]
  filtE.forEach(e => expRows.push([e.date, e.category, Number(e.amount), e.note||'']))
  const wsExp = XLSX.utils.aoa_to_sheet(expRows)
  XLSX.utils.book_append_sheet(wb, wsExp, 'รายจ่าย')

  const label = mode === 'monthly' ? selectedMonth : selectedYear
  XLSX.writeFile(wb, `HICHAO_Report_${label}.xlsx`)
}

// ── Mini bar chart component ──────────────────────────────────────
function MiniBar({ value, max, color = '#6366f1' }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden w-full">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default function ReportPage() {
  const { rentals, expenses, loading } = useApp()
  const [tab, setTab]               = useState('monthly')  // 'monthly' | 'yearly'
  const [selectedMonth, setSelectedMonth] = useState(THIS_MON)
  const [selectedYear,  setSelectedYear]  = useState(THIS_YEAR)
  const [exporting, setExporting]   = useState(false)

  // ── Available options ─────────────────────────────────────────
  const availableMonths = useMemo(() => {
    const s = new Set([...rentals.map(r=>r.start_date?.slice(0,7)), ...expenses.map(e=>e.date?.slice(0,7))].filter(Boolean))
    if (!s.has(THIS_MON)) s.add(THIS_MON)
    return [...s].sort((a,b)=>b.localeCompare(a))
  }, [rentals, expenses])

  const availableYears = useMemo(() => {
    const s = new Set([...rentals.map(r=>r.start_date?.slice(0,4)), ...expenses.map(e=>e.date?.slice(0,4))].filter(Boolean))
    if (!s.has(String(THIS_YEAR))) s.add(String(THIS_YEAR))
    return [...s].sort((a,b)=>b.localeCompare(a))
  }, [rentals, expenses])

  // ── Monthly data ──────────────────────────────────────────────
  const monthData = useMemo(() => {
    const filtR    = rentals.filter(r => r.start_date?.startsWith(selectedMonth))
    const filtE    = expenses.filter(e => e.date?.startsWith(selectedMonth))
    const retR     = filtR.filter(r=>r.status==='returned')
    const revenue  = retR.reduce((s,r)=>s+Number(r.total_price),0)
    const discount = retR.reduce((s,r)=>s+Number(r.discount||0),0)
    const gross    = revenue + discount
    const expTotal = filtE.reduce((s,e)=>s+Number(e.amount),0)

    const camMap = {}
    filtR.forEach(r => {
      const name = r.camera?.name || '—'
      if (!camMap[name]) camMap[name] = { count: 0, revenue: 0 }
      camMap[name].count++
      if (r.status === 'returned') camMap[name].revenue += Number(r.total_price)
    })
    const topCameras = Object.entries(camMap).sort((a,b)=>b[1].count-a[1].count).slice(0,5)

    const custMap = {}
    filtR.forEach(r => {
      const name = r.customer?.name || '—'
      if (!custMap[name]) custMap[name] = { count: 0, revenue: 0 }
      custMap[name].count++
      if (r.status === 'returned') custMap[name].revenue += Number(r.total_price)
    })
    const topCustomers = Object.entries(custMap).sort((a,b)=>b[1].count-a[1].count).slice(0,5)

    const expCat = {}
    filtE.forEach(e => { expCat[e.category] = (expCat[e.category]||0) + Number(e.amount) })
    const expByCategory = Object.entries(expCat).sort((a,b)=>b[1]-a[1])

    return { filtR, filtE, gross, discount, revenue, expTotal, profit: revenue - expTotal, topCameras, topCustomers, expByCategory }
  }, [rentals, expenses, selectedMonth])

  // ── Yearly data ───────────────────────────────────────────────
  const yearData = useMemo(() => {
    const yr = String(selectedYear)
    const months = Array.from({length:12},(_,i)=>i)
    return months.map(i => {
      const m = `${yr}-${String(i+1).padStart(2,'0')}`
      const filtR = rentals.filter(r=>r.start_date?.startsWith(m))
      const filtE = expenses.filter(e=>e.date?.startsWith(m))
      const retR     = filtR.filter(r=>r.status==='returned')
      const revenue  = retR.reduce((s,r)=>s+Number(r.total_price),0)
      const discount = retR.reduce((s,r)=>s+Number(r.discount||0),0)
      const expTotal = filtE.reduce((s,e)=>s+Number(e.amount),0)
      return { month: m, label: MONTHS_TH[i].slice(0,3), revenue, discount, expTotal, profit: revenue-expTotal, rentalCount: filtR.length }
    })
  }, [rentals, expenses, selectedYear])

  const maxYearVal = Math.max(...yearData.map(d=>Math.max(d.revenue,d.expTotal)),1)
  const yearRevTotal  = yearData.reduce((s,d)=>s+d.revenue,0)
  const yearDiscTotal = yearData.reduce((s,d)=>s+d.discount,0)
  const yearExpTotal  = yearData.reduce((s,d)=>s+d.expTotal,0)
  const yearProfit    = yearRevTotal - yearExpTotal

  const handleExport = async () => {
    setExporting(true)
    try { await exportExcel(rentals, expenses, tab, selectedYear, selectedMonth) }
    catch(e) { alert('Export ไม่สำเร็จ: ' + e.message) }
    finally { setExporting(false) }
  }

  const statCls = (v) => v >= 0 ? 'text-green-600' : 'text-red-600'

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">รายงาน</h2>
          <p className="text-gray-500 text-sm mt-0.5">สรุปรายได้ รายจ่าย และกำไรของร้าน</p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
          {exporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> :
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          }
          Export Excel
        </button>
      </div>

      {/* Tabs + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
          {['monthly','yearly'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm font-medium transition-colors ${tab===t ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t === 'monthly' ? 'รายเดือน' : 'รายปี'}
            </button>
          ))}
        </div>
        {tab === 'monthly' ? (
          <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
            {availableMonths.map(m => (
              <option key={m} value={m}>{MONTHS_TH[parseInt(m.split('-')[1])-1]} {m.split('-')[0]}</option>
            ))}
          </select>
        ) : (
          <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {/* ══ MONTHLY VIEW ══ */}
      {tab === 'monthly' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:'รายได้สุทธิ', sub: monthData.discount>0?`ก่อนลด ${fmtMoney(monthData.gross)}`:null, value: fmtMoney(monthData.revenue), color:'text-gray-900', bg:'bg-purple-50 text-purple-600',
                icon:<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg> },
              { label:'ส่วนลดรวม', sub: null, value: fmtMoney(monthData.discount), color:'text-purple-600', bg:'bg-violet-50 text-violet-500',
                icon:<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg> },
              { label:'รายจ่ายรวม', sub: null, value: fmtMoney(monthData.expTotal), color:'text-red-600', bg:'bg-red-50 text-red-500',
                icon:<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" /></svg> },
              { label:'กำไรสุทธิ', sub: null, value: (monthData.profit<0?'−':'')+fmtMoney(Math.abs(monthData.profit)), color: statCls(monthData.profit), bg: monthData.profit>=0?'bg-green-50 text-green-500':'bg-red-50 text-red-500',
                icon:<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg> },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${c.bg} flex-shrink-0`}>{c.icon}</div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{c.label}</p>
                  <p className={`text-lg font-bold ${c.color} truncate`}>{c.value}</p>
                  {c.sub && <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* Top cameras */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">กล้องที่ถูกเช่าบ่อย</p>
              {monthData.topCameras.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">ไม่มีข้อมูล</p> : (
                <div className="space-y-3">
                  {monthData.topCameras.map(([name, d],i) => (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700 truncate flex-1">{name}</span>
                        <span className="text-gray-500 flex-shrink-0 ml-2">{d.count} ครั้ง</span>
                      </div>
                      <MiniBar value={d.count} max={monthData.topCameras[0]?.[1].count||1} color="#6366f1" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top customers */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">ลูกค้าที่เช่าบ่อย</p>
              {monthData.topCustomers.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">ไม่มีข้อมูล</p> : (
                <div className="space-y-3">
                  {monthData.topCustomers.map(([name, d],i) => (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700 truncate flex-1">{name}</span>
                        <span className="text-gray-500 flex-shrink-0 ml-2">{d.count} ครั้ง</span>
                      </div>
                      <MiniBar value={d.count} max={monthData.topCustomers[0]?.[1].count||1} color="#10b981" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expense breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">รายจ่ายตามหมวด</p>
              {monthData.expByCategory.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">ไม่มีรายจ่าย</p> : (
                <div className="space-y-3">
                  {monthData.expByCategory.map(([cat, val]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700 truncate flex-1">{cat}</span>
                        <span className="text-gray-500 flex-shrink-0 ml-2">฿{val.toLocaleString()}</span>
                      </div>
                      <MiniBar value={val} max={monthData.expByCategory[0]?.[1]||1} color="#f59e0b" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rental list table */}
          {monthData.filtR.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">รายการเช่าทั้งหมด ({monthData.filtR.length} รายการ)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      {['วันรับ','วันคืน','กล้อง','ลูกค้า','สถานะ','ราคา (ก่อนลด)','ส่วนลด','ราคาสุทธิ','จ่ายวันรับ'].map(h => (
                        <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthData.filtR.map(r => {
                      const disc  = Number(r.discount||0)
                      const gross = Number(r.total_price) + disc
                      return (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-xs">{fmtDate(r.start_date)}</td>
                        <td className="px-4 py-2.5 text-xs">{fmtDate(r.end_date)}</td>
                        <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{r.camera?.name||'—'}</td>
                        <td className="px-4 py-2.5 text-xs">{r.customer?.name||'—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            r.status==='returned'?'bg-green-100 text-green-700':
                            r.status==='active'?'bg-orange-100 text-orange-700':
                            r.status==='booked'?'bg-yellow-100 text-yellow-700':
                            'bg-gray-100 text-gray-500'}`}>
                            {r.status==='returned'?'คืนแล้ว':r.status==='active'?'กำลังเช่า':r.status==='booked'?'จองแล้ว':'ยกเลิก'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">฿{gross.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-xs">
                          {disc > 0 ? <span className="text-purple-600 font-medium">−฿{disc.toLocaleString()}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-medium">฿{Number(r.total_price).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-xs font-bold text-brand-600">฿{Number(r.due_on_pickup||0).toLocaleString()}</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ YEARLY VIEW ══ */}
      {tab === 'yearly' && (
        <div className="space-y-4">
          {/* Year summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:'รายได้สุทธิทั้งปี', sub: yearDiscTotal>0?`ก่อนลด ${fmtMoney(yearRevTotal+yearDiscTotal)}`:null, value: fmtMoney(yearRevTotal), color:'text-gray-900' },
              { label:'ส่วนลดรวมทั้งปี', sub: null, value: fmtMoney(yearDiscTotal), color:'text-purple-600' },
              { label:'รายจ่ายรวมทั้งปี', sub: null, value: fmtMoney(yearExpTotal), color:'text-red-600' },
              { label:'กำไรสุทธิทั้งปี', sub: null, value: (yearProfit<0?'−':'')+fmtMoney(Math.abs(yearProfit)), color: statCls(yearProfit) },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                {c.sub && <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>}
              </div>
            ))}
          </div>

          {/* Monthly bar chart (12 months) */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">รายได้ vs รายจ่าย รายเดือน</p>
            <div className="flex items-end gap-1.5 h-40">
              {yearData.map((d, i) => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group cursor-default">
                  <div className="w-full flex gap-0.5 items-end h-32">
                    <div className="flex-1 rounded-t transition-all duration-300 hover:opacity-80"
                      style={{ height: `${maxYearVal>0?(d.revenue/maxYearVal)*100:0}%`, background:'#6366f1', minHeight: d.revenue>0?'4px':0 }}
                      title={`รายได้: ฿${d.revenue.toLocaleString()}`} />
                    <div className="flex-1 rounded-t transition-all duration-300 hover:opacity-80"
                      style={{ height: `${maxYearVal>0?(d.expTotal/maxYearVal)*100:0}%`, background:'#f87171', minHeight: d.expTotal>0?'4px':0 }}
                      title={`รายจ่าย: ฿${d.expTotal.toLocaleString()}`} />
                  </div>
                  <span className="text-[10px] text-gray-400">{d.label}</span>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-sm bg-indigo-500" />รายได้</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-sm bg-red-400" />รายจ่าย</div>
            </div>
          </div>

          {/* Monthly table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    {['เดือน','รายการเช่า','รายได้','รายจ่าย','กำไรสุทธิ'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {yearData.map(d => (
                    <tr key={d.month} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{MONTHS_TH[parseInt(d.month.split('-')[1])-1]}</td>
                      <td className="px-4 py-3 text-gray-600">{d.rentalCount} รายการ</td>
                      <td className="px-4 py-3 font-medium text-purple-700">{fmtMoney(d.revenue)}</td>
                      <td className="px-4 py-3 font-medium text-red-600">{fmtMoney(d.expTotal)}</td>
                      <td className={`px-4 py-3 font-bold ${statCls(d.profit)}`}>
                        {d.profit < 0 ? '−' : ''}{fmtMoney(Math.abs(d.profit))}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-3 text-gray-900">รวมทั้งปี</td>
                    <td className="px-4 py-3 text-gray-700">{yearData.reduce((s,d)=>s+d.rentalCount,0)} รายการ</td>
                    <td className="px-4 py-3 text-purple-700">{fmtMoney(yearRevTotal)}</td>
                    <td className="px-4 py-3 text-red-600">{fmtMoney(yearExpTotal)}</td>
                    <td className={`px-4 py-3 font-bold text-base ${statCls(yearProfit)}`}>
                      {yearProfit<0?'−':''}{fmtMoney(Math.abs(yearProfit))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
