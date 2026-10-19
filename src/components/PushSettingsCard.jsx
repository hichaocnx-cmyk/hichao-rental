import { useEffect, useState } from 'react'
import { pushStatus, enablePush, disablePush, sendTestPush } from '../lib/push'
import { useToast } from '../context/ToastContext'

/* การ์ด "แจ้งเตือนบน iPhone" — อยู่บนสุดของหน้าการแจ้งเตือน
   เปิด/ปิดรับแจ้งเตือนของเครื่องนี้ + ปุ่มส่งทดสอบ */

const Bell = (p) => (
  <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
  </svg>
)

export default function PushSettingsCard() {
  const toast = useToast()
  const [status, setStatus] = useState('loading')
  const [busy, setBusy] = useState('')

  const refresh = () => pushStatus().then(setStatus).catch(() => setStatus('unsupported'))
  useEffect(() => { refresh() }, [])

  const run = async (kind, fn, okMsg) => {
    setBusy(kind)
    try { const r = await fn(); toast.success(typeof okMsg === 'function' ? okMsg(r) : okMsg) }
    catch (e) { toast.error(e.message || String(e)) }
    finally { setBusy(''); refresh() }
  }

  const on = status === 'on'

  return (
    <div className={`rounded-2xl border p-4 mb-5 ${on ? 'bg-emerald-50/60 border-emerald-100' : 'bg-white border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${on ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-50 text-brand-500'}`}>
          <Bell className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">แจ้งเตือนบนหน้าล็อค iPhone</h3>
            {on && <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">เปิดอยู่ ✓</span>}
          </div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            สรุปคิวทุกเช้า 08:00 · เตือนก่อนลูกค้ามารับ/คืนกล้อง 1 ชม. · ตัวเลขคิววันนี้บนไอคอนแอป
          </p>

          {status === 'needs-install' && (
            <div className="mt-3 text-xs text-gray-700 bg-amber-50 border border-amber-100 rounded-xl p-3 leading-relaxed">
              <p className="font-semibold text-amber-800 mb-1">ต้องเปิดแอปจากไอคอนบนหน้าจอโฮมก่อน</p>
              1. เปิดเว็บนี้ใน <b>Safari</b> → กดปุ่ม <b>แชร์</b> (สี่เหลี่ยมมีลูกศรขึ้น)<br />
              2. เลือก <b>"เพิ่มไปยังหน้าจอโฮม"</b><br />
              3. เปิดแอปจาก <b>ไอคอน HICHAO.CNX</b> บนหน้าจอ แล้วกลับมาหน้านี้<br />
              <span className="text-gray-500">(ต้องเป็น iOS 16.4 ขึ้นไป)</span>
            </div>
          )}
          {status === 'denied' && (
            <div className="mt-3 text-xs text-gray-700 bg-red-50 border border-red-100 rounded-xl p-3 leading-relaxed">
              เครื่องนี้เคยกด <b>"ไม่อนุญาต"</b> ไว้ — เปิดใหม่ได้ที่<br />
              <b>ตั้งค่า → การแจ้งเตือน → HICHAO.CNX → อนุญาตการแจ้งเตือน</b> แล้วกลับมากดเปิดอีกครั้ง
            </div>
          )}
          {status === 'unsupported' && (
            <p className="mt-3 text-xs text-gray-500">เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน — ใช้ iPhone (เปิดจากไอคอนหน้าจอโฮม) หรือ Chrome</p>
          )}

          <div className="flex gap-2 mt-3 flex-wrap">
            {(status === 'off' || status === 'denied') && (
              <button type="button" onClick={() => run('on', enablePush, 'เปิดแจ้งเตือนแล้ว — ลองกด "ส่งทดสอบ" ได้เลย')}
                disabled={!!busy}
                className="h-10 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50">
                {busy === 'on' ? 'กำลังเปิด…' : '🔔 เปิดการแจ้งเตือน'}
              </button>
            )}
            {on && (
              <>
                <button type="button" onClick={() => run('test', sendTestPush, n => `ส่งทดสอบแล้ว (${n} เครื่อง) — ดูที่หน้าจอได้เลย`)}
                  disabled={!!busy}
                  className="h-10 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50">
                  {busy === 'test' ? 'กำลังส่ง…' : 'ส่งทดสอบ'}
                </button>
                <button type="button" onClick={() => run('off', disablePush, 'ปิดแจ้งเตือนของเครื่องนี้แล้ว')}
                  disabled={!!busy}
                  className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium disabled:opacity-50">
                  {busy === 'off' ? 'กำลังปิด…' : 'ปิดในเครื่องนี้'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
