// ══════════════════════════════════════════════════════════════
// ชุดการเช่า (rental group) — ลูกค้าเช่าหลายตัวพร้อมกันในครั้งเดียว
//
// ฐานข้อมูลยังเก็บ "1 แถว = 1 กล้อง" เหมือนเดิม (ดู migration_015.sql)
// แถวที่เช่าพร้อมกันจะมี group_id ตรงกัน — ไฟล์นี้คือตัวรวมแถวพวกนั้น
// ให้หน้าจอกับหนังสือสัญญามองเห็นเป็นชุดเดียว
//
// เงินของทั้งชุด:
//   · ค่าเช่า/ค่าประกัน  — เก็บแยกตามกล้องของแต่ละแถว
//   · ส่วนลด             — ตัดไล่จากแถวแรกไปแถวหลัง (ผลรวมตรงเป๊ะ ไม่มีเศษ)
//   · มัดจำ / ค่าส่ง      — ลงที่แถวแรกแถวเดียว
// ทุกหน้าที่คิดเงินรวมแถวอยู่แล้ว (ดู src/lib/revenue.js) ยอดจึงถูกต้องเสมอ
// ══════════════════════════════════════════════════════════════

import { rentalRevenue, cashReceived, pendingAmount, isCountable } from './revenue'

const num = (v) => Number(v || 0)

/** คีย์ที่ใช้จัดกลุ่ม — ไม่มี group_id ก็ถือว่าเป็นชุดของตัวเอง */
export const groupKeyOf = (r) => r?.group_id || `single:${r?.id}`

/** แถวนี้อยู่ในชุดที่มีหลายตัวหรือเปล่า (ต้องส่ง list ทั้งหมดมาเทียบ) */
export const isInMultiGroup = (r, list = []) =>
  !!r?.group_id && list.filter(x => x.group_id === r.group_id).length > 1

/** แถวทั้งหมดของชุดเดียวกัน เรียงตามเวลาที่สร้าง */
export function membersOf(rental, list = []) {
  if (!rental) return []
  if (!rental.group_id) return [rental]
  const members = list.filter(r => r.group_id === rental.group_id)
  if (members.length === 0) return [rental]
  return sortMembers(members)
}

const sortMembers = (rows) =>
  [...rows].sort((a, b) =>
    String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
    String(a.id).localeCompare(String(b.id))
  )

/**
 * รวมรายการเช่าเป็นชุด
 * คืนค่าเป็นลิสต์ของ { key, rentals, lead, cameraNames, count, totals }
 * โดย lead = แถวแรกของชุด (ใช้เป็นตัวแทนเวลาแสดงลูกค้า/วันที่/สถานะ)
 * ลำดับของชุดยึดตามลำดับที่แถวแรกของชุดโผล่ในลิสต์ที่ส่งเข้ามา
 */
export function groupRentals(list = []) {
  const byKey = new Map()
  for (const r of list) {
    const key = groupKeyOf(r)
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(r)
  }
  return [...byKey.entries()].map(([key, rows]) => {
    const rentals = sortMembers(rows)
    return {
      key,
      rentals,
      lead: rentals[0],
      count: rentals.length,
      cameraNames: rentals.map(r => r.camera?.name || 'กล้อง'),
      totals: groupTotals(rentals),
    }
  })
}

/** ยอดรวมของทั้งชุด — บวกจากทุกแถว ไม่ใช่เดาจากแถวแรก */
export function groupTotals(rentals = []) {
  const rows = rentals.filter(isCountable)
  const sum = (fn) => rows.reduce((s, r) => s + fn(r), 0)
  return {
    rentalPrice:  sum(r => num(r.total_price) + num(r.discount)), // ก่อนหักส่วนลด
    discount:     sum(r => num(r.discount)),
    totalPrice:   sum(r => num(r.total_price)),                   // หลังหักส่วนลด
    insurance:    sum(r => num(r.insurance)),
    deposit:      sum(r => num(r.deposit)),
    deliveryFee:  sum(r => num(r.delivery_fee)),
    dueOnPickup:  sum(r => num(r.due_on_pickup)),
    revenue:      sum(rentalRevenue),
    cash:         sum(cashReceived),
    pending:      sum(pendingAmount),
  }
}

/**
 * แบ่งเงินของทั้งชุดลงแต่ละแถวตอนบันทึก
 *
 * @param items  [{ camera, rentalPrice, insurance }] เรียงตามลำดับที่เลือก
 * @param money  { discount, deposit, deliveryFee }  ใส่ครั้งเดียวสำหรับทั้งชุด
 * @returns      [{ total_price, discount, deposit, delivery_fee, insurance, due_on_pickup }]
 *
 * ส่วนลดตัดไล่จากแถวแรกไปแถวหลัง จึงไม่มีเศษทศนิยมและผลรวมตรงเป๊ะเสมอ
 * เช่น ราคา [600, 500, 400] ลด 1000 → [0, 100, 400] รวม 500 = 1500 − 1000
 */
export function splitGroupMoney(items = [], money = {}) {
  let discountLeft = Math.max(0, num(money.discount))
  const deposit     = Math.max(0, num(money.deposit))
  const deliveryFee = Math.max(0, num(money.deliveryFee))

  return items.map((it, i) => {
    const price   = Math.max(0, num(it.rentalPrice))
    const used    = Math.min(discountLeft, price)
    discountLeft -= used
    const total   = price - used
    const ins     = Math.max(0, num(it.insurance))
    // มัดจำกับค่าส่งเป็นของทั้งชุด — ลงที่แถวแรกแถวเดียว ผลรวมจะได้ไม่บวกซ้ำ
    const dep = i === 0 ? deposit : 0
    const del = i === 0 ? deliveryFee : 0
    return {
      total_price:   total,
      discount:      used,
      deposit:       dep,
      delivery_fee:  del,
      insurance:     ins,
      due_on_pickup: Math.max(0, total - dep + ins + del),
    }
  })
}
