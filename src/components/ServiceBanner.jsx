import { useEffect, useState } from 'react'
import { SERVICE_RESTRICTED_EVENT, getRestrictedReason, friendlyError } from '../lib/supabaseClient'

// แถบเตือนบนสุด — โผล่เมื่อ Supabase ตอบ 402 (โปรเจกต์ถูกระงับ)
// เพื่อให้รู้ทันทีว่าที่ระบบใช้งานไม่ได้เป็นเพราะโควตา ไม่ใช่บั๊กในแอป
export default function ServiceBanner() {
  const [reason, setReason] = useState(getRestrictedReason())

  useEffect(() => {
    const onRestricted = (e) => setReason(e.detail || 'โปรเจกต์ถูกระงับ')
    window.addEventListener(SERVICE_RESTRICTED_EVENT, onRestricted)
    return () => window.removeEventListener(SERVICE_RESTRICTED_EVENT, onRestricted)
  }, [])

  if (!reason) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-xs sm:text-sm px-4 py-2.5 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-start gap-2">
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <div className="leading-relaxed">
          <span className="font-semibold">ฐานข้อมูลถูกระงับชั่วคราว · </span>
          {friendlyError({ message: reason })}
          {' '}
          <a
            href="https://supabase.com/dashboard/project/_/settings/billing/usage"
            target="_blank"
            rel="noreferrer"
            className="underline font-semibold whitespace-nowrap"
          >
            เปิด Supabase Billing →
          </a>
        </div>
      </div>
    </div>
  )
}
