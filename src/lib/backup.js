import { supabase } from './supabaseClient'

// สำรองข้อมูลทุกตารางเป็นไฟล์ JSON ดาวน์โหลดลงเครื่อง
// (admin ที่ login แล้วเท่านั้นถึงดึงได้ ตาม RLS)
export async function exportBackup() {
  const tables = ['cameras', 'customers', 'rentals', 'expenses']
  const out = { app: 'HICHAO.CNX Camera Rental', exported_at: new Date().toISOString(), data: {} }

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*')
    if (error) throw new Error(`${t}: ${error.message}`)
    out.data[t] = data || []
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

  return Object.fromEntries(tables.map(t => [t, out.data[t].length]))
}
