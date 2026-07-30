// ============================================================
// images.js — จัดการรูปกล้อง + thumbnail (ลด Cached Egress)
// ============================================================
// ทำไมต้องมีไฟล์นี้:
//   Supabase แผนฟรีไม่มี Image Transformation (/storage/v1/render/image/)
//   → เรียกไปก็ 400/404 เสียคำขอเปล่า แล้ว fallback ไปโหลดรูปต้นฉบับอยู่ดี
//   ผลคือรูป ~1000px หลายร้อย KB ถูกโหลดมาแสดงเป็นไอคอน 36px ทุกหน้า
//   → กิน Cached Egress จนโปรเจกต์ถูกระงับ (HTTP 402 exceed_cached_egress_quota)
//
// วิธีแก้: สร้าง thumbnail "จริง" ตอนอัปโหลด เก็บเป็นไฟล์ที่ 2 ใน bucket เดิม
//   ต้นฉบับ : camera-images/<id>-<ts>.jpg          (~1000px, ใช้ในหน้ารายละเอียด/สัญญา)
//   thumb   : camera-images/thumb/<id>-<ts>.jpg    (~320px,  ใช้ในลิสต์ทุกหน้า)
// thumb เล็กกว่าต้นฉบับ ~15-25 เท่า → egress ลดลงในสัดส่วนเดียวกัน

export const BUCKET = 'camera-images'
export const THUMB_PREFIX = 'thumb/'

// cache 1 ปี (immutable เพราะชื่อไฟล์มี timestamp — ไม่มีการเขียนทับ)
export const CACHE_CONTROL = '31536000'

// ── แปลง public URL ต้นฉบับ → URL ของ thumbnail ────────────────
// คืน null ถ้าไม่ใช่รูปใน bucket ของเรา (เช่น URL ภายนอก / dataURL)
export function getThumbUrl(url) {
  if (!url || typeof url !== 'string') return null
  const marker = `/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  const head = url.slice(0, i + marker.length)
  const tail = url.slice(i + marker.length)
  if (tail.startsWith(THUMB_PREFIX)) return url // เป็น thumb อยู่แล้ว
  return head + THUMB_PREFIX + tail
}

// ── path ภายใน bucket จาก public URL ───────────────────────────
export function getStoragePath(url) {
  if (!url) return null
  const marker = `/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length).split('?')[0]
}

// ── โหลดรูปเป็น dataURL สำหรับสัญญา/ใบเสร็จ ─────────────────────
// ลอง thumbnail ก่อน แล้วค่อย fallback ไปต้นฉบับ
// เหตุผล: สัญญาแสดงรูปกล้อง 70×70 px, ใบเสร็จ 56×56 px (pixelRatio 2 = สูงสุด 140 px)
//         → thumb 320 px คมเกินพอ ไม่มีเหตุให้โหลดต้นฉบับ 200-400 KB
// force-cache: ใช้ HTTP cache ของเบราว์เซอร์ (ไฟล์ตั้ง cacheControl 1 ปีไว้)
export async function imageToDataUrl(url) {
  if (!url) return null
  const read = async (u) => {
    const res = await fetch(u, { cache: 'force-cache' })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result)
      r.onerror = reject
      r.readAsDataURL(blob)
    })
  }
  const thumb = getThumbUrl(url)
  if (thumb && thumb !== url) {
    try { return await read(thumb) } catch { /* ยังไม่มี thumb → ใช้ต้นฉบับ */ }
  }
  try { return await read(url) } catch { return null }
}

// ── ย่อ/บีบอัดรูปด้วย canvas ───────────────────────────────────
// maxSide = ด้านยาวสุดที่ต้องการ, quality = คุณภาพ JPEG (0-1)
export async function resizeImage(file, maxSide, quality) {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    // พื้นขาว: PNG โปร่งใส → JPEG จะได้พื้นขาวไม่ใช่ดำ
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob) throw new Error('toBlob failed')
    return blob
  } finally {
    bitmap.close?.()
  }
}

// รูปหลัก: ด้านยาวสุด 700px
// ที่ใหญ่สุดที่แอปแสดงจริงคือ 140 px (สัญญา 70×70 ที่ pixelRatio 2)
// 700 px = เผื่อไว้ 5 เท่า เผื่ออนาคตมีหน้าดูรูปใหญ่ แต่ไม่เปลืองเกินเหตุ
export async function makeMain(file) {
  try {
    const blob = await resizeImage(file, 700, 0.82)
    if (blob.size >= file.size) return file // บีบแล้วไม่เล็กลง ใช้ของเดิม
    return new File([blob], renameJpg(file.name), { type: 'image/jpeg' })
  } catch {
    return file // เบราว์เซอร์เก่า/ไฟล์แปลก → ใช้ต้นฉบับ
  }
}

// thumbnail: ด้านยาวสุด 320px คุณภาพ 0.7 — ปกติได้ ~10-25 KB
export async function makeThumb(file) {
  try {
    const blob = await resizeImage(file, 320, 0.7)
    return new File([blob], renameJpg(file.name), { type: 'image/jpeg' })
  } catch {
    return null // สร้าง thumb ไม่ได้ ไม่ใช่เรื่องคอขาดบาดตาย — ลิสต์จะ fallback ไปต้นฉบับ
  }
}

function renameJpg(name = 'image') {
  return name.replace(/\.\w+$/, '') + '.jpg'
}
