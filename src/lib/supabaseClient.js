import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

// ── ตรวจจับสถานะ "โปรเจกต์ถูกระงับ" (HTTP 402) ───────────────────
// Supabase จะตอบ 402 ทุก endpoint (auth/rest/storage/functions) เมื่อใช้เกินโควตา
// เช่น exceed_cached_egress_quota — ทำให้ login ไม่ได้ทั้งระบบ
// เดิมผู้ใช้เห็นแต่ข้อความมั่วๆ ไม่รู้สาเหตุ จึงดักไว้ที่จุดเดียวตรงนี้
export const SERVICE_RESTRICTED_EVENT = 'supabase:service-restricted'

let restrictedReason = null
export const getRestrictedReason = () => restrictedReason

const fetchWithRestrictionCheck = async (input, init) => {
  const res = await fetch(input, init)
  if (res.status === 402) {
    let reason = ''
    try {
      const body = await res.clone().json()
      reason = body?.message || body?.error || ''
    } catch { /* body ไม่ใช่ JSON */ }
    restrictedReason = reason || 'โปรเจกต์ถูกระงับเนื่องจากใช้งานเกินโควตา'
    window.dispatchEvent(new CustomEvent(SERVICE_RESTRICTED_EVENT, { detail: restrictedReason }))
  }
  return res
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithRestrictionCheck },
})

// ── แปลง error ของ Supabase เป็นข้อความไทยที่เข้าใจได้ ────────────
export function friendlyError(err) {
  const msg = String(err?.message || err || '')

  if (/restricted due to the following violations/i.test(msg) || /exceed_\w*_quota/i.test(msg)) {
    const quota = /cached_egress/i.test(msg) ? 'bandwidth (Cached Egress)'
      : /egress/i.test(msg)                  ? 'bandwidth (Egress)'
      : /db_size|database/i.test(msg)        ? 'ขนาดฐานข้อมูล'
      : /storage/i.test(msg)                 ? 'พื้นที่ Storage'
      :                                        'โควตา'
    return `ระบบฐานข้อมูล (Supabase) ถูกระงับชั่วคราว เพราะใช้ ${quota} เกินโควตาแผนฟรี — `
         + 'ไม่ใช่ปัญหาที่รหัสผ่านหรือบัญชีของคุณ ต้องแก้ที่ Supabase Dashboard '
         + '(อัปเกรดแผน หรือรอรอบบิลใหม่)'
  }
  if (/Invalid login credentials/i.test(msg))    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  if (/Email not confirmed/i.test(msg))          return 'อีเมลนี้ยังไม่ได้ยืนยัน กรุณาเช็คกล่องจดหมาย'
  if (/Too many requests|rate limit/i.test(msg)) return 'ลองเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'
  if (/Failed to fetch|NetworkError|network/i.test(msg))
    return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'
  if (/JWT|invalid api key/i.test(msg))
    return 'คีย์เชื่อมต่อ Supabase ไม่ถูกต้อง (ตรวจ VITE_SUPABASE_ANON_KEY ใน Vercel)'

  return msg || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
}
