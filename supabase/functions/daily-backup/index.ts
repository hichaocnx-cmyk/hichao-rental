import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ══════════════════════════════════════════════════════════════
// daily-backup — สำรองข้อมูลทุกตารางขึ้น Google Drive อัตโนมัติ
// เรียกทุกวันโดย pg_cron (ดู migration_013.sql) ไม่ต้องเปิดแอปเลย
//
// ต้องตั้ง secret ก่อนใช้งาน (Supabase Dashboard > Edge Functions > Secrets):
//   GOOGLE_SA_EMAIL         — client_email จาก Service Account JSON key
//   GOOGLE_SA_PRIVATE_KEY   — private_key จาก Service Account JSON key
//   GOOGLE_DRIVE_FOLDER_ID  — id ของโฟลเดอร์ปลายทางใน Google Drive
//   LINE_CHANNEL_ACCESS_TOKEN / LINE_USER_ID — ใช้ตัวเดียวกับฟังก์ชันอื่นอยู่แล้ว
// วิธีตั้งค่าแบบละเอียด ดู BACKUP-AUTO-SETUP.md
// ══════════════════════════════════════════════════════════════

const TABLES = ['cameras', 'customers', 'rentals', 'expenses']

// ── base64url helper (ใช้ทั้งเข้ารหัส JWT header/payload และ signature) ──
function base64url(input: string | ArrayBuffer): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// ── ขอ access token จาก Google ด้วย Service Account (JWT Bearer flow) ──
// ไม่พึ่ง SDK ใดๆ — เซ็น JWT เองด้วย Web Crypto (มีอยู่แล้วใน Deno runtime)
async function getGoogleAccessToken(saEmail: string, privateKeyPem: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: saEmail,
    // ขอบเขตกว้าง (ไฟล์ทั้งหมด) แต่ตัว service account เองไม่มีไฟล์อะไรอยู่แล้ว
    // เข้าถึงได้แค่โฟลเดอร์ที่เรา "แชร์" ให้มันเห็นเท่านั้น
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )
  const jwt = `${signingInput}.${base64url(signature)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Google OAuth: ${json.error_description || json.error || res.status}`)
  return json.access_token
}

// ── อัปโหลดไฟล์ JSON เข้าโฟลเดอร์ปลายทาง (สร้าง metadata ก่อน แล้วค่อยใส่เนื้อหา) ──
async function uploadToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  jsonContent: string
): Promise<string> {
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fileName, parents: [folderId], mimeType: 'application/json' }),
  })
  const created = await createRes.json()
  if (!createRes.ok) throw new Error(`Drive create: ${created.error?.message || createRes.status}`)

  const uploadRes = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${created.id}?uploadType=media`,
    {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: jsonContent,
    }
  )
  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}))
    throw new Error(`Drive upload: ${err.error?.message || uploadRes.status}`)
  }
  return created.id
}

serve(async (_req) => {
  const CORS = { 'Access-Control-Allow-Origin': '*' }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const LINE_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
  const LINE_USER_ID = Deno.env.get('LINE_USER_ID')

  const notifyLine = async (msg: string) => {
    if (!LINE_TOKEN || !LINE_USER_ID) return
    try {
      await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_TOKEN}` },
        body: JSON.stringify({ to: LINE_USER_ID, messages: [{ type: 'text', text: msg }] }),
      })
    } catch {
      /* แจ้งเตือนพลาดไม่ critical — ตัว backup เองสำเร็จไปแล้วหรือยัง ไม่เกี่ยวกัน */
    }
  }

  try {
    // ── ดึงข้อมูลทุกตารางด้วย service role (ไม่ผ่าน RLS — ได้ครบทุกแถวเสมอ) ──
    const data: Record<string, unknown[]> = {}
    for (const t of TABLES) {
      const { data: rows, error } = await supabase.from(t).select('*')
      if (error) throw new Error(`${t}: ${error.message}`)
      data[t] = rows ?? []
    }

    const counts = Object.fromEntries(TABLES.map((t) => [t, data[t].length]))
    const total = TABLES.reduce((s, t) => s + data[t].length, 0)

    // ⚠️ กันไฟล์เปล่าทับของจริงบน Drive — เหมือน exportBackup() ฝั่งแอป
    if (total === 0) {
      throw new Error('ดึงข้อมูลได้ 0 รายการทุกตาราง — ยกเลิกการสำรอง กันไฟล์เปล่า')
    }

    const payload = {
      app: 'HICHAO.CNX Camera Rental',
      exported_at: new Date().toISOString(),
      data,
    }

    // ชื่อไฟล์ตามเวลาไทย (UTC+7) ให้ตรงกับที่ไฟล์สำรองแบบกดเองใช้อยู่
    const nowTH = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const p = (n: number) => String(n).padStart(2, '0')
    const stamp =
      `${nowTH.getUTCFullYear()}${p(nowTH.getUTCMonth() + 1)}${p(nowTH.getUTCDate())}` +
      `-${p(nowTH.getUTCHours())}${p(nowTH.getUTCMinutes())}`
    const fileName = `hichao-backup-auto-${stamp}.json`

    const SA_EMAIL = Deno.env.get('GOOGLE_SA_EMAIL')
    const RAW_KEY = Deno.env.get('GOOGLE_SA_PRIVATE_KEY')
    const FOLDER_ID = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')
    if (!SA_EMAIL || !RAW_KEY || !FOLDER_ID) {
      throw new Error(
        'ยังไม่ได้ตั้งค่า GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY / GOOGLE_DRIVE_FOLDER_ID — ดู BACKUP-AUTO-SETUP.md'
      )
    }
    // private key ที่ตั้งผ่าน CLI มักถูกเก็บเป็นบรรทัดเดียวมี \n เป็นตัวอักษร ต้องแปลงกลับเป็นขึ้นบรรทัดจริง
    const privateKeyPem = RAW_KEY.includes('\\n') ? RAW_KEY.replace(/\\n/g, '\n') : RAW_KEY

    const accessToken = await getGoogleAccessToken(SA_EMAIL, privateKeyPem)
    const driveFileId = await uploadToDrive(accessToken, FOLDER_ID, fileName, JSON.stringify(payload, null, 2))

    // บันทึกประวัติ — ตารางเดียวกับที่การกดสำรองเองในแอปเขียน (เห็นรวมกันในที่เดียว)
    await supabase.from('backup_log').insert({
      source: 'auto',
      status: 'success',
      counts,
      file_name: fileName,
      drive_file_id: driveFileId,
    })

    await notifyLine(
      `[HICHAO.CNX] 💾 สำรองข้อมูลอัตโนมัติสำเร็จ\n` +
        `กล้อง ${counts.cameras} · ลูกค้า ${counts.customers} · เช่า ${counts.rentals} · รายจ่าย ${counts.expenses}\n` +
        `ไฟล์: ${fileName}`
    )

    return new Response(
      JSON.stringify({ ok: true, counts, fileName, driveFileId }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)

    try {
      await supabase.from('backup_log').insert({ source: 'auto', status: 'error', error_text: message })
    } catch {
      /* ถ้าบันทึก log ไม่ได้ด้วย ก็ปล่อยผ่าน ไม่ให้ error ซ้อน error */
    }

    await notifyLine(
      `[HICHAO.CNX] ⚠️ สำรองข้อมูลอัตโนมัติล้มเหลว\n${message}\n` +
        `ระบบยังปกติดี แค่สำรองไม่สำเร็จรอบนี้ — กดสำรองเองในแอปไปพลางๆ ได้`
    )

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
