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

// Upload รูปกล้อง (ย่อรูปอัตโนมัติก่อนอัปโหลด)
export async function uploadCameraImage(file, cameraId) {
  const compressed = await compressImage(file)
  const ext = compressed.name.split('.').pop()
  const path = `${cameraId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
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
