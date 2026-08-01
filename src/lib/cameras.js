import { supabase } from './supabaseClient'

// ── หมายเหตุ: ระบบไม่ใช้รูปถ่ายกล้องแล้ว ──────────────────────
// เดิมเก็บรูปใน Supabase Storage (bucket 'camera-images')
// วัดจริงเมื่อ 1 ส.ค. 2026: มีแค่ 8 รูป แต่รวม 63 MB (PNG ดิบ เฉลี่ย 7.9 MB/ใบ)
// และตั้ง cache-control แค่ 1 ชั่วโมง → เปิดหน้าทีนึงโหลด 63 MB
// เข้าใหม่หลังผ่านไป 1 ชม. ก็โหลดใหม่หมด → กินโควตา 5 GB/เดือนในไม่กี่วัน
// จนโปรเจกต์ถูกระงับ (402 exceed_cached_egress_quota) เข้าระบบไม่ได้ทั้งร้าน
//
// ระบบนี้เป็นหลังบ้านใช้กันเอง ไม่ต้องโชว์รูปสินค้า → เปลี่ยนเป็น emoji 📷
// ผลคือ egress = 0 และตัดโค้ด upload/thumbnail/compress ออกได้ทั้งชุด
//
// คอลัมน์ cameras.image_url ยังอยู่ในฐานข้อมูล (ไม่ได้ลบ) แต่ไม่มีใครอ่านแล้ว
// ไฟล์เดิมใน Storage ก็ยังอยู่ — ไม่มีใครเรียก จึงไม่กิน egress
// ถ้าจะลบทิ้งให้ export เก็บก่อนด้วย migration/04_export_storage.html

// ดึงกล้องทั้งหมด
// ⚠️ ใช้ select('*') โดยตั้งใจ — อย่าเปลี่ยนเป็นรายชื่อคอลัมน์
// เคยเปลี่ยนเป็น list คอลัมน์ (ลอกมาจาก supabase/schema.sql) แล้วพบว่า
// schema.sql ไม่ตรงกับฐานข้อมูลจริง: 'serial_number' มีในไฟล์แต่ไม่มีในตาราง
// PostgREST ตอบ 400 "column cameras.serial_number does not exist"
// → getCameras() พัง → Promise.all ใน AppContext reject → ทั้งแอปว่างเปล่า
// ประหยัดได้แค่ไม่กี่ไบต์ แต่แลกกับความเสี่ยง schema drift ไม่คุ้มเลย
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
export async function deleteCamera(id) {
  const { error } = await supabase.from('cameras').delete().eq('id', id)
  if (error) throw error
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
