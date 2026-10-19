/* ══════════════════════════════════════════════════════════════
   สร้างข้อความ QR พร้อมเพย์ (มาตรฐาน EMVCo / Thai QR Payment)
   - เบอร์มือถือ 10 หลัก, เลขบัตรประชาชน/เลขผู้เสียภาษี 13 หลัก, e-Wallet 15 หลัก
   - ใส่ยอดเงิน → ลูกค้าสแกนแล้วยอดขึ้นเอง · ไม่ใส่ → ลูกค้ากรอกยอดเอง
   ══════════════════════════════════════════════════════════════ */

const tlv = (id, value) => id + String(value.length).padStart(2, '0') + value

// CRC-16/CCITT-FALSE (poly 0x1021, เริ่ม 0xFFFF) — ตัวเช็คท้าย QR
export function crc16(str) {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** แยกชนิดเลขพร้อมเพย์ — คืน null ถ้าเลขไม่ถูกต้อง */
export function parsePromptPayId(raw) {
  const d = String(raw || '').replace(/\D/g, '')
  if (d.length === 10 && d[0] === '0') return { tag: '01', value: '0066' + d.slice(1), kind: 'phone', digits: d }
  if (d.length === 13) return { tag: '02', value: d, kind: 'id', digits: d }
  if (d.length === 15) return { tag: '03', value: d, kind: 'ewallet', digits: d }
  return null
}

/** แสดงเลขให้อ่านง่าย เช่น 081-234-5678 / 1-2345-67890-12-3 */
export function formatPromptPayId(raw) {
  const p = parsePromptPayId(raw)
  if (!p) return String(raw || '')
  const d = p.digits
  if (p.kind === 'phone') return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  if (p.kind === 'id') return `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}`
  return d
}

/** ข้อความที่จะเอาไปทำ QR */
export function promptPayPayload(id, amount) {
  const p = parsePromptPayId(id)
  if (!p) throw new Error('เลขพร้อมเพย์ไม่ถูกต้อง')
  const amt = Number(amount)
  const hasAmt = Number.isFinite(amt) && amt > 0
  let s = tlv('00', '01')
    + tlv('01', hasAmt ? '12' : '11')                         // 12 = ใช้ครั้งเดียวมียอด · 11 = ใช้ซ้ำได้
    + tlv('29', tlv('00', 'A000000677010111') + tlv(p.tag, p.value))
    + tlv('58', 'TH')
    + tlv('53', '764')                                        // สกุลเงินบาท
    + (hasAmt ? tlv('54', amt.toFixed(2)) : '')
    + '6304'
  return s + crc16(s)
}

/* ── QR ร้านค้า (เช่น K SHOP ของกสิกร) + ใส่ยอดเงิน ─────────────────
   เอาข้อความ QR เดิมของร้านมาทั้งก้อน (ข้อมูลร้าน/บัญชีไม่แตะเลย)
   แค่ (1) เปลี่ยนแท็ก 01 เป็น 12 = มียอด  (2) ใส่/แทนแท็ก 54 = ยอดเงิน
   (3) คำนวณตัวเช็ค CRC ท้ายใหม่ — ไม่ใส่ยอด = ได้ QR เดิมเป๊ะทุกตัวอักษร */
function parseTLV(s) {
  const out = []
  let i = 0
  while (i + 4 <= s.length) {
    const tag = s.slice(i, i + 2), len = parseInt(s.slice(i + 2, i + 4), 10)
    if (!Number.isFinite(len)) throw new Error('QR ร้านไม่ถูกต้อง')
    out.push([tag, s.slice(i + 4, i + 4 + len)])
    i += 4 + len
  }
  if (i !== s.length) throw new Error('QR ร้านไม่ถูกต้อง')
  return out
}

export function merchantPayload(base, amount) {
  const amt = Number(amount)
  const hasAmt = Number.isFinite(amt) && amt > 0
  const fields = parseTLV(String(base).trim()).filter(([t]) => t !== '63' && t !== '54')
  if (!hasAmt) {
    // ไม่มียอด → คืน QR เดิม (static)
    const s = fields.map(([t, v]) => tlv(t, t === '01' ? '11' : v)).join('') + '6304'
    return s + crc16(s)
  }
  fields.push(['54', amt.toFixed(2)])
  fields.sort((a, b) => a[0].localeCompare(b[0]))        // เรียงแท็กจากน้อยไปมากตามมาตรฐาน
  const s = fields.map(([t, v]) => tlv(t, t === '01' ? '12' : v)).join('') + '6304'
  return s + crc16(s)
}
