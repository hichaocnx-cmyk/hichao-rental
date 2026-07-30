import { supabase } from './supabaseClient'
import {
  BUCKET, THUMB_PREFIX, CACHE_CONTROL,
  getThumbUrl, getStoragePath, makeMain, makeThumb,
} from './images'

export { BUCKET }

// ดึงกล้องทั้งหมด
export async function getCameras() {
  const { data, error } = await supabase
    .from('cameras')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// เพิ่มกล้อง
export async function createCamera(camera) {
  const { data, error } = await supabase
    .from('cameras')
    .insert([camera])
    .select()
    .single()
  if (error) throw error
  return data
}

// แก้ไขกล้อง
export async function updateCamera(id, updates) {
  const { data, error } = await supabase
    .from('cameras')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ลบกล้อง
export async function deleteCamera(id, imageUrl) {
  // ลบรูปจาก storage ถ้ามี (ทั้งต้นฉบับและ thumbnail)
  if (imageUrl) {
    const path = getStoragePath(imageUrl)
    if (path) await supabase.storage.from(BUCKET).remove([path, THUMB_PREFIX + path])
  }
  const { error } = await supabase.from('cameras').delete().eq('id', id)
  if (error) throw error
}

// ── Upload รูปกล้อง ───────────────────────────────────────────
// อัปโหลด 2 ไฟล์: ต้นฉบับย่อ 1000px + thumbnail 320px
// ลิสต์ทุกหน้าใช้ thumb (~15-25 KB) แทนต้นฉบับ (~200-400 KB)
// → Cached Egress ลดลงประมาณ 90-95%
export async function uploadCameraImage(file, cameraId) {
  const main = await makeMain(file)
  const path = `${cameraId}-${Date.now()}.jpg`

  const { error } = await supabase.storage.from(BUCKET)
    .upload(path, main, { upsert: true, contentType: 'image/jpeg', cacheControl: CACHE_CONTROL })
  if (error) throw error

  // thumbnail — ถ้าพลาดก็ไม่เป็นไร ลิสต์จะ fallback ไปต้นฉบับเอง
  try {
    const thumb = await makeThumb(file)
    if (thumb) {
      await supabase.storage.from(BUCKET)
        .upload(THUMB_PREFIX + path, thumb, { upsert: true, contentType: 'image/jpeg', cacheControl: CACHE_CONTROL })
    }
  } catch { /* ไม่ critical */ }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ── เครื่องมือแอดมิน: จัดระเบียบรูปเก่าทั้งหมด (รอบเดียวจบ) ────
// ต่อ 1 รูป: ดาวน์โหลดต้นฉบับ 1 ครั้ง แล้วเขียนกลับ 2 ไฟล์
//   1. main  ย่อ 1000px + cacheControl 1 ปี
//   2. thumb ย่อ  320px + cacheControl 1 ปี
//
// ทำไมต้องเขียน main ทับด้วย: รูปที่อัปโหลดก่อนหน้านี้ได้ cacheControl ค่าเริ่มต้น
// ของ Supabase = 3600 (1 ชั่วโมง) → เบราว์เซอร์ทิ้ง cache ทุกชั่วโมง
// แล้วดาวน์โหลดรูปเต็มใหม่ทุกครั้งที่เปิดแอป = ต้นเหตุใหญ่ของ Cached Egress
//
// ⚠️ กดครั้งเดียวพอ — รูปที่จัดระเบียบแล้ว (มี thumb) จะถูกข้าม ไม่โหลดซ้ำ
export async function backfillThumbnails(onProgress) {
  const { data: cams, error } = await supabase.from('cameras').select('id,name,image_url')
  if (error) throw error

  const targets = (cams || [])
    .map(c => ({ ...c, path: getStoragePath(c.image_url) }))
    .filter(c => c.path && !c.path.startsWith(THUMB_PREFIX))

  // ดูว่ามี thumb ไฟล์ไหนอยู่แล้ว (1 request เบาๆ ไม่กิน egress รูป)
  const existing = new Set()
  try {
    const { data: files } = await supabase.storage.from(BUCKET)
      .list(THUMB_PREFIX.replace(/\/$/, ''), { limit: 1000 })
    ;(files || []).forEach(f => existing.add(f.name))
  } catch { /* list ไม่ได้ → ถือว่ายังไม่มี */ }

  let done = 0, skipped = 0, failed = 0, processed = 0, savedBytes = 0

  for (const c of targets) {
    try {
      if (existing.has(c.path)) { skipped++; continue } // จัดระเบียบแล้ว

      const res = await fetch(c.image_url, { cache: 'force-cache' })
      if (!res.ok) { failed++; continue }
      const blob = await res.blob()
      const file = new File([blob], c.path.split('/').pop() || 'img.jpg',
        { type: blob.type || 'image/jpeg' })

      const thumb = await makeThumb(file)
      if (!thumb) { failed++; continue }

      // thumb ต้องสำเร็จก่อน — ถ้าพลาดตรงนี้ก็ไม่ต้องแตะ main
      const { error: thumbErr } = await supabase.storage.from(BUCKET)
        .upload(THUMB_PREFIX + c.path, thumb,
          { upsert: true, contentType: 'image/jpeg', cacheControl: CACHE_CONTROL })
      if (thumbErr) { failed++; continue }

      // เขียน main ทับเพื่อแก้ cacheControl (และย่อถ้ายังใหญ่)
      // path เดิม → URL ในฐานข้อมูลไม่เปลี่ยน ไม่ต้อง migrate อะไรเพิ่ม
      try {
        const main = await makeMain(file)
        await supabase.storage.from(BUCKET)
          .upload(c.path, main, { upsert: true, contentType: 'image/jpeg', cacheControl: CACHE_CONTROL })
        if (main.size < blob.size) savedBytes += blob.size - main.size
      } catch { /* main ไม่สำเร็จก็ไม่เป็นไร — thumb คือส่วนที่สำคัญ */ }

      done++
    } catch { failed++ }
    finally { processed++; onProgress?.(processed, targets.length) }
  }

  return {
    done, skipped, failed,
    total: targets.length,
    savedMB: +(savedBytes / 1048576).toFixed(1),
  }
}

export { getThumbUrl }

// สถิติสำหรับ Dashboard
export async function getCameraStats() {
  const { data, error } = await supabase.from('cameras').select('status')
  if (error) throw error
  const total = data.length
  const available = data.filter(c => c.status === 'available' || c.status === 'returned').length
  const rented = data.filter(c => c.status === 'rented').length
  const maintenance = data.filter(c => c.status === 'maintenance').length
  return { total, available, rented, maintenance }
}
