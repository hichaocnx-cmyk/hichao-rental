import { useState } from 'react'
import { useApp } from '../context/AppContext'

// ══════════════════════════════════════════════════════════════
// DataErrorBanner — เตือนเมื่อโหลดข้อมูลบางตารางไม่สำเร็จ
//
// ที่มา: loadAll ใช้ Promise.allSettled เพื่อไม่ให้ตารางเดียวพังแล้วลากทั้งแอปลง
// แต่ผลข้างเคียงคือ "พังเงียบ" — หน้าจอโชว์ข้อมูลไม่ครบโดยผู้ใช้ไม่รู้ตัว
// (บั๊ก cameras.serial_number ทำให้ทุกหน้าว่างอยู่หลายวันเพราะไม่มีอะไรฟ้อง)
//
// แถบนี้ทำให้ความผิดพลาดมองเห็นได้ทันที และกดลองใหม่ได้เลยโดยไม่ต้อง refresh
// ══════════════════════════════════════════════════════════════
export default function DataErrorBanner() {
  const { loadErrors, reload } = useApp()
  const [retrying, setRetrying] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (!loadErrors?.length || dismissed) return null

  const handleRetry = async () => {
    setRetrying(true)
    try { await reload() } finally { setRetrying(false) }
  }

  const names = loadErrors.map(e => e.label).join(' · ')

  return (
    <div className="mx-4 mt-4 lg:mx-6 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">
            โหลดข้อมูลไม่ครบ — ตัวเลขที่เห็นอาจไม่ตรงความจริง
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            ดึงข้อมูล <span className="font-semibold">{names}</span> ไม่สำเร็จ
          </p>
          {/* ข้อความ error จริง ไว้ส่งต่อให้คนแก้ */}
          <p className="text-[11px] font-mono text-amber-600/70 mt-1.5 break-words">
            {loadErrors.map(e => e.detail).join(' | ').slice(0, 180)}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={handleRetry} disabled={retrying}
            className="h-8 px-3 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-1.5">
            {retrying && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {retrying ? 'กำลังลอง...' : 'ลองใหม่'}
          </button>
          <button onClick={() => setDismissed(true)} aria-label="ปิดแถบเตือน"
            className="h-8 w-8 flex items-center justify-center text-amber-500 hover:bg-amber-100 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
