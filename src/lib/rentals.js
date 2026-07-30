import { supabase } from './supabaseClient'

// ── ช่วงข้อมูลที่โหลด ──────────────────────────────────────────
// เดิมดึง rentals ทั้งหมดพร้อม join ทุกครั้งที่เปิดแอป — โตขึ้นเรื่อยๆ ไม่มีเพดาน
// ตอนนี้ดึงเท่าที่หน้าจอใช้จริง:
//   · ย้อนหลัง 18 เดือน  (หน้ารายงานย้อนได้สูงสุด 6 เดือน จึงเหลือเผื่ออีกเท่าตัว)
//   · บวก active/booked ทั้งหมดไม่จำกัดวัน (คิวที่ยังไม่จบต้องเห็นครบเสมอ)
// หมายเหตุ: ปฏิทินย้อนไปเกิน 18 เดือนจะไม่เห็นรายการที่จบแล้ว — ปรับเลขนี้ได้
const MONTHS_BACK = 18

function cutoffDate() {
  const d = new Date()
  d.setMonth(d.getMonth() - MONTHS_BACK)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export async function getRentals() {
  const { data, error } = await supabase
    .from('rentals')
    .select(`*, camera:cameras(id,name,brand,image_url), customer:customers(id,name,phone)`)
    .or(`start_date.gte.${cutoffDate()},status.in.(active,booked)`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createRental(rental) {
  const { data, error } = await supabase
    .from('rentals')
    .insert([rental])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRental(id, updates) {
  const { data, error } = await supabase
    .from('rentals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRental(id) {
  const { error } = await supabase.from('rentals').delete().eq('id', id)
  if (error) throw error
}
