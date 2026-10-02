// ══════════════════════════════════════════════════════════════
// นิยามกลางของ "จำนวนวันเช่า" — ใช้ที่เดียวกันทั้งแอป
//
// ── กฎใหม่ (24 ชั่วโมง) ───────────────────────────────────────
//   จำนวนวัน = วันคืน − วันรับ
//   รับ 16 เวลา 13:00 → คืน 17 เวลา 13:00 = 1 วัน
//   รับ 16 → คืน 20 = 4 วัน
//   เวลาคืนจะถูกเติมให้เท่าเวลารับอัตโนมัติ (แก้เองได้)
//
// ── กฎเดิม (ก่อน DAY_RULE_CUTOVER) ────────────────────────────
//   จำนวนวัน = วันคืน − วันรับ + 1   (นับรวมวันแรก)
//   รับ 16 → คืน 19 = 4 วัน
//
// รายการที่บันทึกไว้ก่อนวันเปลี่ยนกฎยังนับแบบเดิมต่อไป
// เพื่อให้ประวัติ ใบสัญญา และรายงานย้อนหลังแสดงเท่าที่ตกลงกับลูกค้าจริง
// ไม่มีการแก้ข้อมูลในฐานข้อมูลแม้แต่แถวเดียว — ดูจาก created_at เอา
//
// ⚠️ หมายเหตุเรื่องช่วงที่กล้องไม่ว่าง: ไม่เกี่ยวกับไฟล์นี้
//    ระบบถือว่ากล้องถูกครอบครอง [วันรับ, วันคืน) คือว่างตั้งแต่วันคืน
//    (ตรงกับ constraint rentals_no_camera_overlap ใน migration_010.sql)
//    กฎใหม่ทำให้ "จำนวนวันที่คิดเงิน" ตรงกับ "จำนวนวันที่กล้องหายไปจริง" พอดี
// ══════════════════════════════════════════════════════════════

// วันที่เริ่มใช้กฎ 24 ชั่วโมง (เวลาไทย) — รายการที่สร้างตั้งแต่วันนี้ใช้กฎใหม่
export const DAY_RULE_CUTOVER = '2026-10-02'

const MS_PER_DAY = 86400000

const toDate = (ds) => {
  if (!ds) return null
  const [y, m, d] = String(ds).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return Date.UTC(y, m - 1, d)
}

// ส่วนต่างวันแบบดิบ (วันคืน − วันรับ) ไม่ต่ำกว่า 0
export function dateDiffDays(start, end) {
  const s = toDate(start), e = toDate(end)
  if (s == null || e == null) return 0
  return Math.max(0, Math.round((e - s) / MS_PER_DAY))
}

// ── จำนวนวันเช่าแบบ 24 ชั่วโมง (สำหรับรายการใหม่) ──────────────
export function daysBetween(start, end) {
  return Math.max(1, dateDiffDays(start, end))
}

// ── วันคืน เมื่อเลือกจำนวนวัน N วัน ────────────────────────────
// 1 วัน → คืนวันถัดไป · 4 วัน → คืนอีก 4 วันข้างหน้า
export function endDateFromDays(start, n) {
  if (!start) return ''
  const days = Math.max(1, parseInt(n, 10) || 1)
  const d = new Date(String(start).slice(0, 10) + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y  = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

// รายการนี้ถูกบันทึกด้วยกฎเดิมหรือไม่
// created_at หาย/อ่านไม่ได้ → ถือว่าเป็นรายการใหม่ (กฎใหม่)
export function isLegacyRental(rental) {
  const created = rental?.created_at
  if (!created) return false
  return String(created).slice(0, 10) < DAY_RULE_CUTOVER
}

// ── จำนวนวันของรายการเช่า 1 รายการ (ใช้ตัวนี้เป็นหลักทุกที่) ────
export function rentalDays(rental) {
  if (!rental) return 1
  const diff = dateDiffDays(rental.start_date, rental.end_date)
  return Math.max(1, isLegacyRental(rental) ? diff + 1 : diff)
}
