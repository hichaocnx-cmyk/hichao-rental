import { supabase } from './supabaseClient'

const BUCKET = 'camera-images'

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
  // ลบรูปจาก storage ถ้ามี
  if (imageUrl) {
    const path = imageUrl.split(`${BUCKET}/`)[1]
    if (path) await supabase.storage.from(BUCKET).remove([path])
  }
  const { error } = await supabase.from('cameras').delete().eq('id', id)
  if (error) throw error
}

// ย่อ+บีบอัดรูปก่อนอัปโหลด — รูปจากมือถือหลาย MB แต่แสดงเป็น thumbnail เล็ก
// ช่วยลดทั้ง Storage และ Cached Egress (โควตา bandwidth ของ Supabase)
async function compressImage(file, maxSide = 1000, quality = 0.82) {
  try {
    // ไฟล์เล็กอยู่แล้ว (< 300KB) ไม่ต้องยุ่ง
    if (file.size < 300 * 1024) return file
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file // บีบแล้วไม่เล็กลง ใช้ของเดิม
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file // เบราว์เซอร์เก่า/ไฟล์แปลก → อัปโหลดต้นฉบับตามเดิม
  }
}

// Upload รูปกล้อง (ย่อรูปอัตโนมัติ + cache 1 ปี ลด egress)
export async function uploadCameraImage(file, cameraId) {
  const compressed = await compressImage(file)
  const ext = compressed.name.split('.').pop()
  const path = `${cameraId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET)
    .upload(path, compressed, { upsert: true, cacheControl: '31536000' })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ── บีบอัดรูปเก่าทั้งหมดใน Storage (เครื่องมือแอดมิน กดครั้งเดียวจบ) ──
// โหลดรูปต้นฉบับ → ย่อ → อัปโหลดทับ path เดิม (URL ในระบบไม่เปลี่ยน)
export async function recompressAllImages(onProgress) {
  const { data: cams, error } = await supabase.from('cameras').select('id,name,image_url')
  if (error) throw error
  const targets = (cams || []).filter(c => c.image_url && c.image_url.includes(`${BUCKET}/`))
  let done = 0, skipped = 0, failed = 0, savedBytes = 0, processed = 0

  for (const c of targets) {
    try {
      const path = c.image_url.split(`${BUCKET}/`)[1].split('?')[0]
      // ?orig=... ทำให้ URL ไม่ตรงกับ cache ของ service worker → ได้ไฟล์จริงจาก server
      const res = await fetch(`${c.image_url}?orig=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) { failed++; continue }
      const blob = await res.blob()
      if (blob.size < 300 * 1024) { skipped++; continue } // เล็กอยู่แล้ว ข้าม
      const file = new File([blob], path.split('/').pop() || 'img.jpg', { type: blob.type || 'image/jpeg' })
      const small = await compressImage(file)
      if (small === file || small.size >= blob.size) { skipped++; continue }
      const { error: upErr } = await supabase.storage.from(BUCKET)
        .upload(path, small, { upsert: true, contentType: 'image/jpeg', cacheControl: '31536000' })
      if (upErr) { failed++; continue }
      done++; savedBytes += (blob.size - small.size)
    } catch { failed++ }
    finally { processed++; onProgress?.(processed, targets.length) }
  }
  return { done, skipped, failed, total: targets.length, savedMB: +(savedBytes / 1048576).toFixed(1) }
}

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
