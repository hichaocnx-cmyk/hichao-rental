import { useState, useEffect } from 'react'
import { deleteCamera } from '../lib/cameras'
import { useApp } from '../context/AppContext'
import CameraModal from '../components/CameraModal'
import { CamerasSkeleton } from '../components/Skeleton'
import { useToast, useConfirm } from '../context/ToastContext'

// แปลง Supabase storage URL → image transform URL (thumbnail)
function getThumbUrl(url, width = 400) {
  if (!url) return null
  return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    + `?width=${width}&quality=75&resize=cover`
}

// รูปโหลด lazy + fade-in เมื่อโหลดเสร็จ
function LazyImg({ src, alt, className }) {
  const [loaded, setLoaded] = useState(false)
  const thumb = getThumbUrl(src)
  return (
    <img
      src={thumb || src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}

const STATUS_CFG = {
  available:   { label: 'ว่าง',        cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', card: 'border-emerald-100' },
  rented:      { label: 'กำลังถูกเช่า', cls: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-400',  card: 'border-orange-100' },
  returned:    { label: 'คืนแล้ว',      cls: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-400',    card: 'border-blue-100'   },
  maintenance: { label: 'ซ่อมบำรุง',   cls: 'bg-red-100 text-red-600',         dot: 'bg-red-400',     card: 'border-red-100'    },
}

const FILTER_TABS = [
  { value: 'all',         label: 'ทั้งหมด' },
  { value: 'available',   label: 'ว่าง' },
  { value: 'rented',      label: 'ถูกเช่า' },
  { value: 'maintenance', label: 'ซ่อม' },
]

function CamPlaceholder() {
  return (
    <svg className="w-10 h-10 text-brand-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
  )
}

export default function CamerasPage() {
  const { cameras, loading, reloadCameras } = useApp()
  const toast = useToast()
  const confirm = useConfirm()
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [modal, setModal]             = useState({ open: false, camera: null })
  const [deleting, setDeleting]       = useState(null)
  const [selected, setSelected]       = useState(null) // camera detail sheet

  // เมื่อ cameras อัปเดตจาก reload → sync selected ให้ใช้ข้อมูลใหม่
  useEffect(() => {
    if (!selected) return
    const fresh = cameras.find(c => c.id === selected.id)
    if (fresh) setSelected(fresh)
  }, [cameras])

  const filtered = cameras.filter(c => {
    const matchSearch = `${c.name} ${c.brand} ${c.model}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const handleDelete = async (camera) => {
    const ok = await confirm({
      title: `ลบกล้อง "${camera.name}"?`,
      message: 'ไม่สามารถกู้คืนได้หลังจากลบแล้ว',
      confirmLabel: 'ลบเลย',
      variant: 'danger',
      icon: (
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      ),
    })
    if (!ok) return
    setDeleting(camera.id)
    try {
      await deleteCamera(camera.id, camera.image_url)
      await reloadCameras()
      if (selected?.id === camera.id) setSelected(null)
      toast.success(`ลบ ${camera.name} แล้ว`)
    } catch (e) {
      toast.error('ลบไม่สำเร็จ: ' + e.message)
    } finally {
      setDeleting(null)
    }
  }

  // summary counts
  const counts = cameras.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">กล้องทั้งหมด</h2>
          <p className="text-xs text-gray-400 mt-0.5">{cameras.length} อุปกรณ์ในระบบ</p>
        </div>
        <button onClick={() => setModal({ open: true, camera: null })}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-brand-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          เพิ่มกล้อง
        </button>
      </div>

      {/* ── Summary strip ─────────────────────────────────────── */}
      <div className="flex gap-2">
        {[
          { label: 'ทั้งหมด', value: cameras.length,          color: 'text-gray-600',    bg: 'bg-white',        dot: 'bg-gray-400',
            icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg> },
          { label: 'ว่าง',     value: counts.available || 0,   color: 'text-emerald-600', bg: 'bg-emerald-50',   dot: 'bg-emerald-500',
            icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
          { label: 'ถูกเช่า',  value: counts.rented || 0,      color: 'text-orange-500',  bg: 'bg-orange-50',    dot: 'bg-orange-400',
            icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg> },
          { label: 'ซ่อม',     value: counts.maintenance || 0, color: 'text-red-500',     bg: 'bg-red-50',       dot: 'bg-red-400',
            icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" /></svg> },
        ].map(s => (
          <div key={s.label} title={s.label}
            className={`${s.bg} rounded-xl border border-gray-100 px-2.5 py-1.5 flex items-center gap-1.5`}>
            <span className={s.color}>{s.icon}</span>
            <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Search + Filter tabs ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, Brand, รุ่น..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent" />
        </div>
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 flex-shrink-0">
          {FILTER_TABS.map(tab => (
            <button key={tab.value} onClick={() => setFilterStatus(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap
                ${filterStatus === tab.value ? 'bg-brand-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
              {tab.value !== 'all' && counts[tab.value] > 0 && (
                <span className={`ml-1 ${filterStatus === tab.value ? 'text-white/70' : 'text-gray-400'}`}>
                  {counts[tab.value]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Card Grid ─────────────────────────────────────────── */}
      {loading ? (
        <CamerasSkeleton />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </div>
          <p className="text-gray-800 font-semibold text-base">
            {filterStatus === 'all' ? 'ยังไม่มีกล้องในระบบ' : `ไม่มีกล้อง${STATUS_CFG[filterStatus]?.label}`}
          </p>
          <p className="text-gray-400 text-sm mt-1 max-w-xs">
            {filterStatus === 'all'
              ? 'เพิ่มกล้องตัวแรกเพื่อเริ่มจัดการการเช่า'
              : 'ลองเปลี่ยนตัวกรองเพื่อดูกล้องทั้งหมด'}
          </p>
          {filterStatus === 'all' && (
            <button onClick={() => setModal({ open: true, camera: null })}
              className="mt-5 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-brand-100">
              + เพิ่มกล้องใหม่
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(camera => {
            const cfg = STATUS_CFG[camera.status] || STATUS_CFG.available
            const isSelected = selected?.id === camera.id
            return (
              <div key={camera.id}
                onClick={() => setSelected(isSelected ? null : camera)}
                className={`bg-white rounded-2xl border-2 overflow-hidden cursor-pointer transition-all
                  ${isSelected ? 'border-brand-400 shadow-md shadow-brand-100' : `${cfg.card} hover:border-gray-200 hover:shadow-sm`}`}>

                {/* Camera image */}
                <div className="relative h-24 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {camera.image_url
                    ? <LazyImg src={camera.image_url} alt={camera.name} className="w-full h-full object-cover" />
                    : <div className="flex flex-col items-center gap-1">
                        <CamPlaceholder />
                      </div>
                  }
                  {/* Status badge overlay */}
                  <div className="absolute top-2 left-2">
                    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{camera.name}</p>
                  {camera.brand && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{camera.brand}{camera.model ? ` · ${camera.model}` : ''}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">ราคา/วัน</p>
                      <p className="text-sm font-bold text-brand-500">฿{Number(camera.price_per_day).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); setModal({ open: true, camera }) }}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-brand-50 text-gray-400 hover:text-brand-500 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                        </svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(camera) }}
                        disabled={deleting === camera.id}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">
                        {deleting === camera.id
                          ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Detail bottom sheet (mobile) / side panel ─────────── */}
      {selected && (
        <>
          {/* Overlay mobile */}
          <div className="lg:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setSelected(null)} />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl p-5 pb-8">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-start gap-4 mb-4">
              {selected.image_url
                ? <LazyImg src={selected.image_url} alt={selected.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
                : <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center flex-shrink-0"><CamPlaceholder /></div>
              }
              <div className="flex-1 min-w-0">
                <p cla