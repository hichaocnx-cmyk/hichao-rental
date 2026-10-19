import { supabase } from './supabaseClient'

/* ══════════════════════════════════════════════════════════════
   แจ้งเตือนเด้งบนหน้าล็อค iPhone (Web Push) — ฝั่งแอป
   ฝั่งเซิร์ฟเวอร์อยู่ที่ supabase/functions/push-notify · ขั้นตอนตั้งค่า PUSH-SETUP.md

   เงื่อนไขของ iPhone: iOS 16.4 ขึ้นไป + เปิดแอปจาก "ไอคอนบนหน้าจอโฮม" เท่านั้น
   (เปิดผ่าน Safari ธรรมดา iPhone ไม่ให้ขอสิทธิ์แจ้งเตือน)
   ══════════════════════════════════════════════════════════════ */

// คีย์สาธารณะ VAPID — ไม่ใช่ความลับ (คู่กับ VAPID_PRIVATE_KEY ที่อยู่ใน Supabase Secrets เท่านั้น)
export const VAPID_PUBLIC_KEY = 'BHYbAd4K27DOBShtWkPOO4swhbChFhGYrdwQuD6K2jKjIYynYVd1CfTbc6Ebv2qllw8ruXeJlGkiqV2NeaPjeDU'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const b64uToBytes = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

/** สถานะปัจจุบันของเครื่องนี้
 *  'unsupported'   — เบราว์เซอร์นี้ไม่รองรับเลย
 *  'needs-install' — iPhone ที่ยังไม่ได้เปิดจากไอคอนหน้าจอโฮม
 *  'denied'        — เคยกด "ไม่อนุญาต" ต้องไปเปิดในตั้งค่า
 *  'off'           — ยังไม่ได้เปิด (กดปุ่มเปิดได้เลย)
 *  'on'            — เปิดแล้ว */
export async function pushStatus() {
  const hasApi = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!hasApi) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported'
  if (isIOS() && !isStandalone()) return 'needs-install'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

const deviceName = () => {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua) || isIOS()) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Mac/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  return 'อุปกรณ์อื่น'
}

/** เปิดแจ้งเตือน — ต้องเรียกจากการกดปุ่มโดยตรง (iPhone บังคับ) */
export async function enablePush() {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error(perm === 'denied'
    ? 'ถูกปิดการแจ้งเตือนไว้ — เปิดได้ที่ ตั้งค่า → การแจ้งเตือน → HICHAO.CNX'
    : 'ยังไม่ได้อนุญาตการแจ้งเตือน')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64uToBytes(VAPID_PUBLIC_KEY),
    })
  }
  const j = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, device: deviceName(),
  }, { onConflict: 'endpoint' })
  if (error) {
    if (/push_subscriptions/.test(error.message) && /exist|find|schema/i.test(error.message))
      throw new Error('ยังไม่ได้รัน migration_016.sql ใน Supabase (ดู PUSH-SETUP.md)')
    throw new Error(error.message)
  }
  return true
}

/** ปิดแจ้งเตือนเฉพาะเครื่องนี้ */
export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

/** ส่งแจ้งเตือนทดสอบไปทุกเครื่องที่เปิดรับไว้ */
export async function sendTestPush() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('ต้องล็อกอินก่อน')
  const res = await fetch(`${SUPABASE_URL}/functions/v1/push-notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mode: 'test' }),
  })
  const out = await res.json().catch(() => ({}))
  if (res.status === 404) throw new Error('ยังไม่ได้ deploy ฟังก์ชัน push-notify ใน Supabase (ดู PUSH-SETUP.md)')
  if (!res.ok || out.error) throw new Error(out.error || `Error ${res.status}`)
  const sent = out.sent || []
  if (!sent.length) throw new Error('ยังไม่มีเครื่องไหนเปิดรับแจ้งเตือน')
  const failed = sent.filter(s => !(s.status >= 200 && s.status < 300))
  if (failed.length === sent.length) throw new Error(`ส่งไม่สำเร็จ (${failed[0].status || failed[0].error})`)
  return sent.length - failed.length
}

/** ล้างตัวเลขแดงบนไอคอนแอปเมื่อเปิดแอปขึ้นมาดูแล้ว */
export function clearBadgeOnOpen() {
  const clear = () => { try { navigator.clearAppBadge?.() } catch { /* ไม่รองรับ */ } }
  clear()
  document.addEventListener('visibilitychange', () => { if (!document.hidden) clear() })
}
