import { useState, useMemo } from 'react'
import { deleteCustomer } from '../lib/customers'
import { useApp } from '../context/AppContext'
import CustomerModal from '../components/CustomerModal'
import { CustomersSkeleton } from '../components/Skeleton'
import { useToast, useConfirm } from '../context/ToastContext'

const AVATAR_COLORS = [
  'bg-brand-100 text-brand-600',
  'bg-sky-100 text-sky-600',
  'bg-emerald-100 text-emerald-600',
  'bg-violet-100 text-violet-600',
  'bg-amber-100 text-amber-600',
  'bg-rose-100 text-rose-600',
]

function getAvatarColor(name = '') {
  let sum = 0
  for (const ch of name) sum += ch.charCodeAt(0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

export default function CustomersPage() {
  const { customers, rentals, loading, reloadCustomers } = useApp()
  const toast = useToast()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState({ open: false, customer: null })
  const [selected, setSelected] = useState(null)

  // Compute per-customer stats from rentals
  const customerStats = useMemo(() => {
    const map = {}
    rentals.forEach(r => {
      if (!r.customer_id) return
      if (!map[r.customer_id]) map[r.customer_id] = { count: 0, total: 0, last: null }
      map[r.customer_id].count += 1
      map[r.customer_id].total += Number(r.total_price || 0)
      if (!map[r.customer_id].last || r.start_date > map[r.customer_id].last) {
        map[r.customer_id].last = r.start_date
      }
    })
    return map
  }, [rentals])

  const filtered = customers
    .filter(c => `${c.name} ${c.phone || ''} ${c.line_id || ''}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // เรียงตามจำนวนครั้งเช่า (มากสุดก่อน)
      const ca = customerStats[a.id]?.count || 0
      const cb = customerStats[b.id]?.count || 0
      return cb - ca
    })

  const handleDelete = async (c) => {
    const ok = await confirm({
      title: `ลบลูกค้า "${c.name}"?`,
      message: 'ประวัติการเช่าของลูกค้ายังคงอยู่ในระบบ',
      confirmLabel: 'ลบเลย',
      variant: 'danger',
      icon: (
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
        </svg>
      ),
    })
    if (!ok) return
    try {
      await deleteCustomer(c.id)
      await reloadCustomers()
      if (selected?.id === c.id) setSelected(null)
      toast.success(`ลบ ${c.name} แล้ว`)
    } catch (e) { toast.error('ลบไม่สำเร็จ: ' + e.message) }
  }

  const totalCustomers = customers.length
  const repeatCustomers = customers.filter(c => (customerStats[c.id]?.count || 0) > 1).length

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">ลูกค้า</h2>
          <p className="text-xs text-gray-400 mt-0.5">{totalCustomers} คน · กลับมาเช่าซ้ำ {repeatCustomers} คน</p>
        </div>
        <button onClick={() => setModal({ open: true, customer: null })}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-brand-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          เพิ่มลูกค้า
        </button>
      </div>

      {/* ── Search ────────────────────────────────────────────── */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ, เบอร์, LINE..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent" />
      </div>

      {/* ── Cards ─────────────────────────────────────────────── */}
      {loading ? (
        <CustomersSkeleton />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          </div>
          <p className="text-gray-800 font-semibold text-base">
            {search ? 'ไม่พบลูกค้าที่ค้นหา' : 'ยังไม่มีลูกค้าในระบบ'}
          </p>
          <p className="text-gray-400 text-sm mt-1 max-w-xs">
            {search
              ? 'ลองค้นหาด้วยชื่อ เบอร์โทร หรือ LINE ID อื่น'
              : 'เพิ่มลูกค้าคนแรกเพื่อเริ่มบันทึกการเช่า'}
          </p>
          {!search && (
            <button onClick={() => setModal({ open: true, customer: null })}
              className="mt-5 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-brand-100">
              + เพิ่มลูกค้าใหม่
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map(c => {
              const stats = customerStats[c.id] || { count: 0, total: 0, last: null }
              const avatarColor = getAvatarColor(c.name)
              const isSelected = selected?.id === c.id
              return (
                <div key={c.id}
                  onClick={() => setSelected(isSelected ? null : c)}
                  className={`flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors
                    ${isSelected ? 'bg-brand-50/40' : 'hover:bg-gray-50/60'}`}>

                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${avatarColor} font-bold text-sm`}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                      {c.line_id && <span className="text-xs text-gray-400">LINE: {c.line_id}</span>}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {stats.count > 0 ? (
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{stats.count} ครั้ง</p>
                        <p className="text-[11px] text-brand-500 font-medium">฿{stats.total.toLocaleString()}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300">ยังไม่เคยเช่า</p>
                    )}
                    <svg className={`w-4 h-4 text-gray-300 transition-transform ${isSelected ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>
              )
            })}

            {/* Expanded detail */}
            {selected && (() => {
              const c = selected
              const stats = customerStats[c.id] || { count: 0, total: 0, last: null }
              const customerRentals = rentals
                .filter(r => r.customer_id === c.id)
                .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))
              return (
                <div className="bg-gray-50/60 px-4 pt-4 pb-5 border-t border-brand-100">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-brand-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-brand-700">{stats.count}</p>
                      <p className="text-[10px] font-medium text-brand-500">ครั้งที่เช่า</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <p className="text-base font-bold text-emerald-600">฿{stats.total.toLocaleString()}</p>
                      <p className="text-[10px] font-medium text-emerald-500">ยอดรวม</p>
                    </div>
                    <div className="bg-sky-50 rounded-xl p-3 text-center">
                      <p className="text-sm font-bold text-sky-700">{stats.last ? stats.last.slice(5).replace('-', '/') : '—'}</p>
                      <p className="text-[10px] font-medium text-sky-500">ล่าสุด</p>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    {c.phone && (
                      <div className="bg-white rounded-xl px-3 py-2 border border-gray-100">
                        <p className="text-[10px] text-gray-400 mb-0.5">เบอร์โทร</p>
                        <p className="font-medium text-gray-800">{c.phone}</p>
                      </div>
                    )}
                    {c.line_id && (
                      <div className="bg-white rounded-xl px-3 py-2 border border-gray-100">
                        <p className="text-[10px] text-gray-400 mb-0.5">LINE ID</p>
                        <p className="font-medium text-gray-800">{c.line_id}</p>
                      </div>
                    )}
                    {c.id_card && (
                      <div className="bg-white rounded-xl px-3 py-2 border border-gray-100">
                        <p className="text-[10px] text-gray-400 mb-0.5">เลขบัตร</p>
                        <p className="font-medium text-gray-800">{c.id_card.slice(0,3)}•••{c.id_card.slice(-2)}</p>
                      </div>
                    )}
                    {c.address && (
                      <div className="bg-white rounded-xl px-3 py-2 border border-gray-100 col-span-2">
                        <p className="text-[10px] text-gray-400 mb-0.5">ที่อยู่</p>
                        <p className="font-medium text-gray-800 text-xs">{c.address}</p>
                      </div>
                    )}
                  </div>

                  {/* Recent rentals */}
                  {customerRentals.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">ประวัติการเช่า</p>
                      <div className="space-y-1.5">
                        {customerRentals.slice(0, 3).map(r => (
                          <div key={r.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-gray-100">
                            <div>
                              <p className="text-xs font-medium text-gray-800">{r.camera?.name || '—'}</p>
                              <p className="text-[10px] text-gray-400">{r.start_date} → {r.end_date}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-brand-500">฿{Number(r.total_price).toLocaleString()}</p>
                              <p className={`text-[10px] font-medium ${
                                r.status === 'returned' ? 'text-emerald-500' :
                                r.status === 'active' ? 'text-orange-500' : 'text-yellow-500'
                              }`}>
                                {r.status === 'returned' ? 'คืนแล้ว' : r.status === 'active' ? 'กำลังเช่า' : 'จองแล้ว'}
                              </p>
                            </div>
                          </div>
                        ))}
                        {customerRentals.length > 3 && (
                          <p className="text-[10px] text-gray-400 text-center">+ อีก {customerRentals.length - 3} รายการ</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={e => { e.stopPropagation(); setModal({ open: true, customer: c }) }}
                      className="flex-1 py-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl border border-brand-100 transition-colors">
                      แก้ไขข้อมูล
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(c) }}
                      className="flex-1 py-2 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl border border-red-100 transition-colors">
                      ลบลูกค้า
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-50 text-xs text-gray-300">
            {filtered.length} จาก {customers.length} รายการ
          </div>
        </div>
      )}

      {modal.open && (
        <CustomerModal customer={modal.customer}
          onClose={() => setModal({ open: false, customer: null })}
          onSaved={() => { setModal({ open: false, customer: null }); reloadCustomers() }} />
      )}
    </div>
  )
}
