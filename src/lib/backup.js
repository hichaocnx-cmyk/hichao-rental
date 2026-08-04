import { supabase } from './supabaseClient'

// ══════════════════════════════════════════════════════════════
// สำรองข้อมูลทุกตารางเป็นไฟล์ JSON ดาวน์โหลดลงเครื่อง
// (admin ที่ login แล้วเท่านั้นถึงดึงได้ ตาม RLS)
//
// วิธีให้ไฟล์ขึ้น Google Drive อัตโนมัติ (ไม่ต้องแก้โค้ด):
//   ติดตั้ง Google Drive for Desktop แล้วตั้งโฟลเดอร์ดาวน์โหลดของ Chrome
//   ให้ชี้ไปโฟลเดอร์ใน Drive → กดปุ่มนี้ทีไร ไฟล์ซิงก์ขึ้นคลาวด์เอง
//   ขั้นตอนละเอียดอยู่ใน BACKUP.md
//
// ขนาดไฟล์ ~73 KB ต่อครั้ง (วัดจริง ส.ค. 2569)
// = 0.0014% ของโควตา bandwidth Supabase ต่อเดือน — กดบ่อยแค่ไหนก็ได้
// ══════════════════════════════════════════════════════════════

const LAST_BACKUP_KEY = 'hichao_last_backup'

// ── อ่านเวลาสำรองล่าสุด ────────────────────────────────────────
export function getLastBackup() {
  try {
    const raw = localStorage.getItem(LAST_BACKUP_KEY)
    if (!raw) return null
    const info = JSON.parse(raw)
    if (!info?.at) return null
    const days = Math.floor((Date.now() - new Date(info.at).getTime()) / 86400000)
    return { ...info, days }
  } catch { return null }
}

function setLastBackup(counts) {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, JSON.stringify({ at: new Date().toISOString(), counts }))
  } catch { /* โหมดส่วนตัว/พื้นที่เต็ม — ไม่ critical */ }
}

// ── ระดับความเร่งด่วน ใช้กำหนดสีป้ายเตือน ──────────────────────
// อิงจากรอบงานจริงของร้าน: มีรายการเข้าราว 25 ครั้ง/เดือน
// ทิ้งไว้ 2 สัปดาห์ = เสี่ยงเสียข้อมูลราว 12 รายการถ้าเกิดอะไรขึ้น
export function backupUrgency(last) {
  if (!last) return 'never'
  if (last.days >= 14) return 'danger'
  if (last.days >= 7) return 'warn'
  return 'ok'
}

export function backupLabel(last) {
  if (!last) return 'ยังไม่เคยสำรองข้อมูล'
  if (last.days === 0) return 'สำรองล่าสุด: วันนี้'
  if (last.days === 1) return 'สำรองล่าสุด: เมื่อวาน'
  return `สำรองล่าสุด: ${last.days} วันก่อน`
}

// ── ตัวสำรองข้อมูล ─────────────────────────────────────────────
export async function exportBackup() {
  const tables = ['cameras', 'customers', 'rentals', 'expenses']
  const out = { app: 'HICHAO.CNX Camera Rental', exported_at: new Date().toISOString(), data: {} }

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*')
    if (error) throw new Error(`${t}: ${error.message}`)
    out.data[t] = data || []
  }

  // ⚠️ กันไฟล์เปล่า — สำคัญมาก
  // ถ้า session หมดอายุ RLS จะคืน [] เงียบๆ ไม่ error (เจอมาแล้วตอนบั๊กหน้าว่าง)
  // ถ้าปล่อยผ่าน จะได้ไฟล์ backup ที่ว่างเปล่า แล้วเข้าใจผิดว่าสำรองแล้ว
  const total = tables.reduce((s, t) => s + out.data[t].length, 0)
  if (total === 0) {
    throw new Error('ดึงข้อมูลได้ 0 รายการทุกตาราง — ยังไม่บันทึกไฟล์ ลองออกจากระบบแล้วเข้าใหม่')
  }

  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
  const a = document.createElement('a')
  a.href = url
  a.download = `hichao-backup-${stamp}.json`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 8000)

  const counts = Object.fromEntries(tables.map(t => [t, out.data[t].length]))
  setLastBackup(counts)
  return counts
}
