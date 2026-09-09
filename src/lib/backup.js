import { supabase } from './supabaseClient'

// ══════════════════════════════════════════════════════════════
// สำรองข้อมูลทุกตาราง — 2 ทาง ทำงานคู่กัน:
//
// 1) อัตโนมัติทุกวัน — Edge Function `daily-backup` (เรียกโดย pg_cron
//    ฝั่ง server) ดึงข้อมูลแล้วอัปขึ้น Google Drive เอง ไม่ต้องเปิดแอปเลย
//    ตั้งค่าครั้งเดียว ดู BACKUP-AUTO-SETUP.md
// 2) กดเองในแอป (ปุ่ม "สำรองข้อมูล") — ยังใช้ได้เหมือนเดิม ดาวน์โหลด
//    ไฟล์ JSON ลงเครื่องทันที เผื่ออยากได้สำเนาด่วนๆ นอกรอบ cron
//
// ทั้งสองทางบันทึกประวัติลงตาราง `backup_log` ตัวเดียวกัน (migration_013.sql)
// ป้าย "สำรองล่าสุด" ในแอปจึงอ่านจากตารางนี้ เห็นทั้งอัตโนมัติและกดเองรวมกัน
//
// ขนาดไฟล์ ~73 KB ต่อครั้ง (วัดจริง ส.ค. 2569)
// = 0.0014% ของโควตา bandwidth Supabase ต่อเดือน — กดบ่อยแค่ไหนก็ได้
// ══════════════════════════════════════════════════════════════

// ── อ่านประวัติสำรองข้อมูลล่าสุดจาก DB (ทั้งอัตโนมัติ + กดเอง) ──────
// คืนค่า null ถ้ายังไม่เคยมีเลย หรืออ่านไม่ได้ (เช่น session หลุด)
// ── ตาข่ายกันตก (ชั่วคราว) ────────────────────────────────────
// ก่อนหน้านี้ประวัติสำรองล่าสุดเก็บใน localStorage คีย์ 'hichao_last_backup'
// ถ้าตาราง backup_log ยังไม่มีในฐานข้อมูล (ยังไม่ได้รัน migration_013) ให้ย้อนไป
// อ่านค่าเดิมจากเครื่องแทน จะได้ไม่ขึ้นป้ายแดง "ยังไม่เคยสำรอง" ทั้งที่เคยสำรองไว้แล้ว
// ลบฟังก์ชันนี้ทิ้งได้เมื่อรัน migration_013 บน production แล้ว
const LEGACY_LAST_BACKUP_KEY = 'hichao_last_backup'
function readLegacyLocal() {
  try {
    const raw = localStorage.getItem(LEGACY_LAST_BACKUP_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    if (!saved?.at) return null
    const days = Math.floor((Date.now() - new Date(saved.at).getTime()) / 86400000)
    return { at: saved.at, counts: saved.counts, source: 'manual', status: 'success', days }
  } catch {
    return null
  }
}

export async function fetchLastBackup() {
  try {
    const { data, error } = await supabase
      .from('backup_log')
      .select('created_at, source, status, counts')
      .order('created_at', { ascending: false })
      .limit(1)
    if (error || !data || !data.length) return readLegacyLocal()
    const row = data[0]
    const days = Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000)
    return { at: row.created_at, counts: row.counts, source: row.source, status: row.status, days }
  } catch {
    return null
  }
}

// ── ระดับความเร่งด่วน ใช้กำหนดสีป้ายเตือน ──────────────────────
// อิงจากรอบงานจริงของร้าน: มีรายการเข้าราว 25 ครั้ง/เดือน
// ทิ้งไว้ 2 สัปดาห์ = เสี่ยงเสียข้อมูลราว 12 รายการถ้าเกิดอะไรขึ้น
// รอบล่าสุดเป็น error (auto backup ล้มเหลว) ให้ถือว่าเร่งด่วนทันทีไม่ว่าจะกี่วันก็ตาม
export function backupUrgency(last) {
  if (!last) return 'never'
  if (last.status === 'error') return 'danger'
  if (last.days >= 14) return 'danger'
  if (last.days >= 7) return 'warn'
  return 'ok'
}

export function backupLabel(last) {
  if (!last) return 'ยังไม่เคยสำรองข้อมูล'
  if (last.status === 'error') return 'สำรองอัตโนมัติล้มเหลวล่าสุด — กดสำรองเองก่อน'
  const tag = last.source === 'auto' ? ' (อัตโนมัติ)' : ''
  if (last.days === 0) return `สำรองล่าสุด${tag}: วันนี้`
  if (last.days === 1) return `สำรองล่าสุด${tag}: เมื่อวาน`
  return `สำรองล่าสุด${tag}: ${last.days} วันก่อน`
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

  // บันทึกลง backup_log ด้วย — ให้ป้าย "สำรองล่าสุด" เห็นรอบที่กดเองนี้ทันที
  // ไม่ critical: ไฟล์ดาวน์โหลดสำเร็จไปแล้วก่อนหน้านี้ ถ้า insert พังไม่ต้อง throw ต่อ
  try {
    await supabase.from('backup_log').insert({ source: 'manual', status: 'success', counts })
  } catch { /* ไม่ critical */ }

  // เขียนคีย์เดิมใน localStorage ต่อไปด้วย เผื่อ backup_log ยังไม่มีในฐานข้อมูล
  // (ลบทิ้งได้พร้อมกับ readLegacyLocal เมื่อรัน migration_013 แล้ว)
  try {
    localStorage.setItem(LEGACY_LAST_BACKUP_KEY,
      JSON.stringify({ at: new Date().toISOString(), counts }))
  } catch { /* ไม่ critical */ }

  return counts
}
