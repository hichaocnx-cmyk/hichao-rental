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

// Upload รูปกล้อง
export async function uploadCameraImage(file, cameraId) {
  const ext = file.name.split('.').pop()
  const path = `${cameraId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
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
