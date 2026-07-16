import { useState, useEffect, useMemo } from 'react'
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../lib/expenses'
import { useToast, useConfirm } from '../context/ToastContext'

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

const fmtDate = iso => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${parseInt(d)} ${MONTHS_TH[parseInt(m)-1]} ${y}`
}

// วันที่แบบ local time (เวลาไทย) — ไม่ใช้ toISOString() เพราะเป็น UTC (เพี้ยนช่วง 00:00–07:00 น.)
const TODAY = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()
const EMPTY = { date: TODAY, amount: '', category: '', note: '' }

const BAR_COLORS = [
  '#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#84cc16'
]

export default function ExpensesPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [expenses, setExpenses]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [form, setForm]             = useState(EMPTY)
  const [editId, setEditId]         = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [filterMonth, setFilterMonth] = useState(() => TODAY.slice(0, 7))
  const [search, setSearch]         = useState('')
  const [newCategory, setNewCategory] = useState('')

  const load = async () => {
    setLoading(true)
    try { setExpenses(await getExpenses()) } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // ── Filtered list ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (filterMonth && !e.date.startsWith(filterMonth)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!`${e.category} ${e.note||''}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [expenses, filterMonth, search])

  // ── Summary ────────────────────────────────────────────────────
  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0)

  // category breakdown for current filter
  const byCategory = useMemo(() => {
    const map = {}
    filtered.forEach(e => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filtered])

  // monthly totals (last 6 months)
  const monthlyData = useMemo(() => {
    const map = {}
    expenses.forEach(e => {
      const m = e.date.slice(0, 7)
      map[m] = (map[m] || 0) + Number(e.amount)
    })
    const sorted = Object.entries(map).sort((a,b) => a[0].localeCompare(b[0])).slice(-6)
    return sorted
  }, [expenses])

  const maxMonthly = Math.max(...monthlyData.map(([,v]) => v), 1)

  // available months for selector
  const availableMonths = useMemo(() => {
    const set = new Set(expenses.map(e => e.date.slice(0, 7)))
    if (!set.has(TODAY.slice(0, 7))) set.add(TODAY.slice(0, 7))
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [expenses])

  // existing categories for dropdown
  const categories = useMemo(() =>
    [...new Set(expenses.map(e => e.category))].sort((a, b) => a.localeCompare(b, 'th')),
  [expenses])

  const norm = s => s.replace(/\s+/g, '').toLowerCase()
  const similarCategory = useMemo(() => {
    const v = newCategory.trim()
    if (!v) return null
    return categories.find(c => norm(c).includes(norm(v)) || norm(v).includes(norm(c))) || null
  }, [newCategory, categories])

  // ── Actions ────────────────────────────────────────────────────
  const openNew = () => { setForm(EMPTY); setEditId(null); setError(''); setNewCategory(''); setShowForm(true) }
  const openEdit = exp => {
    setForm({ date: exp.date, amount: String(exp.amount), category: exp.category, note: exp.note || '' })
    setEditId(exp.id); setError(''); setNewCategory(''); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditId(null) }

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const category = form.category === '__new__' ? newCategory.trim() : form.category.trim()
      if (!category) throw new Error('กรุณาเลือกหรือใส่หมวดหมู่')
      if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) throw new Error('กรุณาใส่จำนวนเงินที่ถูกต้อง')
      const payload = { date: form.date, amount: Number(form.amount), category, note: form.note.trim() || null }
      if (editId) await updateExpense(editId, payload)
      else await createExpense(payload)
      await load(); closeForm()
    } catch(err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'ลบรายการรายจ่าย?', confirmLabel: 'ลบเลย', variant: 'danger' })
    if (!ok) return
    try {
      await deleteExpense(id); await load()
      toast.success('ลบรายการแล้ว')
    } catch(e) { toast.error('เกิดข้อผิดพลาด: ' + e.message) }
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"

  const monthLabel = m => {
    const [y, mo] = m.split('-')
    return `${MONTHS_TH[parseInt(mo)-1]} ${y}`
  }

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">รายจ่ายของร้าน</h2>
          <p className="text-gray-500 text-sm mt-0.5">บันทึกและติดตามค่าใช้จ่ายทั้งหมด</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          เพิ่มรายจ่าย
        </button>
      </div>

      {/* ── Summary cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-red-500 mb-1">รายจ่ายเดือนนี้</p>
          <p className="text-2xl font-bold text-red-600">฿{totalFiltered.toLocaleString()}</p>
          <p className="text-xs text-red-400 mt-0.5">{filtered.length} รายการ</p>
        </div>
        <div className="bg-orange-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-orange-500 mb-1">หมวดสูงสุด</p>
          <p className="text-base font-bold text-orange-700 truncate">{byCategory[0]?.[0] || '—'}</p>
          <p className="text-xs text-orange-400 mt-0.5">{byCategory[0] ? `฿${byCategory[0][1].toLocaleString()}` : '—'}</p>
        </div>
        <div className="bg-sky-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-sky-500 mb-1">เฉลี่ย/รายการ</p>
          <p className="text-2xl font-bold text-sky-700">฿{filtered.length ? Math.round(totalFiltered / filtered.length).toLocaleString() : 0}</p>
        </div>
        <div className="bg-brand-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-brand-500 mb-1">จำนวนหมวดหมู่</p>
          <p className="text-2xl font-bold text-brand-700">{byCategory.length}</p>
          <p className="text-xs text-brand-400 mt-0.5">หมวดหมู่</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">

        {/* ── Left: Chart + Category breakdown ───────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Monthly bar chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">รายจ่ายรายเดือน</h3>
            {monthlyData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-3">
                {monthlyData.map(([m, val], i) => (
                  <div key={m}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className={m === filterMonth ? 'font-semibold text-brand-600' : ''}>{monthLabel(m)}</span>
                      <span className="font-medium text-gray-700">฿{val.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(val / maxMonthly) * 100}%`, background: m === filterMonth ? '#6366f1' : '#d1d5db' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">แบ่งตามหมวดหมู่</h3>
            {byCategory.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">ไม่มีรายการ</p>
            ) : (
              <div className="space-y-2.5">
                {byCategory.map(([cat, val], i) => (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                        {cat}
                      </span>
                      <span className="text-gray-500">฿{val.toLocaleString()} <span className="text-gray-400">({totalFiltered > 0 ? Math.round(val/totalFiltered*100) : 0}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${totalFiltered > 0 ? (val/totalFiltered)*100 : 0}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: List ─────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-3">

          {/* Filter bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาหมวดหมู่, หมายเหตุ..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
            </div>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white flex-shrink-0">
              <option value="">ทุกเดือน</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>

          {/* List */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75" />
                </svg>
                <p className="text-gray-400 text-sm">ไม่พบรายการ</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((exp, i) => (
                  <div key={exp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                    {/* Color dot */}
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: BAR_COLORS[byCategory.findIndex(([c]) => c === exp.category) % BAR_COLORS.length] }} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{exp.category}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{fmtDate(exp.date)}</span>
                        {exp.note && <span className="text-xs text-gray-500 truncate">· {exp.note}</span>}
                      </div>
                    </div>

                    <span className="text-sm font-bold text-red-600 flex-shrink-0">−฿{Number(exp.amount).toLocaleString()}</span>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(exp)}
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                      </button>
                      <button onClick={() => handleDelete(exp.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer total */}
            {filtered.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500">{filtered.length} รายการ</span>
                <span className="text-sm font-bold text-red-600">รวม −฿{totalFiltered.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Form ─────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{editId ? 'แก้ไขรายจ่าย' : 'เพิ่มรายจ่าย'}</h3>
              <button onClick={closeForm} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">วันที่ <span className="text-red-500">*</span></label>
                <input type="date" name="date" value={form.date} onChange={set} required className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">หมวดหมู่ <span className="text-red-500">*</span></label>
                <select name="category" value={form.category} onChange={set} required className={inputCls}>
                  <option value="" disabled>— เลือกหมวดหมู่ —</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__new__">+ เพิ่มหมวดใหม่...</option>
                </select>
                {form.category === '__new__' && (
                  <div className="mt-2">
                    <input value={newCategory} onChange={e => setNewCategory(e.target.value)}
                      placeholder="ชื่อหมวดใหม่ เช่น ค่าซ่อมกล้อง, ค่าการตลาด..."
                      autoFocus required className={inputCls} />
                    {similarCategory && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ คล้ายหมวดเดิม "{similarCategory}" —{' '}
                        <button type="button" className="underline font-medium"
                          onClick={() => { setForm(f => ({ ...f, category: similarCategory })); setNewCategory('') }}>
                          ใช้หมวดเดิมแทน
                        </button>
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">เลือกจากหมวดที่เคยใช้ เพื่อให้รายงานสรุปไม่แตกหมวดซ้ำ</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">จำนวนเงิน (฿) <span className="text-red-500">*</span></label>
                <input type="number" name="amount" value={form.amount} onChange={set} min="1" step="0.01"
                  placeholder="0.00" required className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">หมายเหตุ</label>
                <textarea name="note" value={form.note} onChange={set} rows={2}
                  placeholder="รายละเอียดเพิ่มเติม..." className={`${inputCls} resize-none`} />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeForm}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                  ยกเลิก
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2">
                  {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />บันทึก...</> : editId ? 'บันทึกการแก้ไข' : 'เพิ่มรายจ่าย'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
