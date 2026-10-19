// ══════════════════════════════════════════════════════════════
// Edge Function: push-notify — แจ้งเตือนเด้งบนหน้าล็อค iPhone (Web Push)
//
// cron เรียกทุก 5 นาที (migration_016.sql) ฟังก์ชันจะดูคิววันนี้แล้วส่ง:
//   1) สรุปคิวตอนเช้า (หลัง 08:00 น. เวลาไทย) — วันละ 1 ครั้ง
//   2) เตือนก่อนลูกค้ามารับ/คืนกล้อง ≤ 60 นาที — คิวละ 1 ครั้ง
//      (เฉพาะคิวที่ใส่เวลาไว้ · เช่าหลายตัวพร้อมกัน = รวมเป็นแจ้งเตือนเดียว)
// กันส่งซ้ำด้วยตาราง push_log (key ไม่ซ้ำ) — แยกจาก flag ของระบบเตือน LINE เดิม
//
// เรียกจากแอป (ผู้ใช้ล็อกอินแล้ว) ด้วย {"mode":"test"} = ส่งแจ้งเตือนทดสอบทันที
//
// ไม่ใช้ไลบรารีภายนอกเลย — เข้ารหัสตามมาตรฐาน Web Push ด้วย WebCrypto ล้วน
//   RFC 8291 (เข้ารหัสข้อความ aes128gcm) + RFC 8292 (VAPID ยืนยันตัวผู้ส่ง)
//   ทดสอบกับชุดตัวเลขตัวอย่างของ RFC 8291 แล้ว ได้ผลตรงทุกไบต์
//
// Secrets ที่ต้องตั้ง (Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY   — คีย์สาธารณะ (ตัวเดียวกับใน src/lib/push.js)
//   VAPID_PRIVATE_KEY  — คีย์ลับ (ห้ามใส่ในโค้ด/GitHub เด็ดขาด)
//   VAPID_SUBJECT      — mailto:hichao.cnx@gmail.com
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY มีให้อัตโนมัติ
// ══════════════════════════════════════════════════════════════

// ── ตั้งค่า ─────────────────────────────────────────────────────
export const CONFIG = {
  summaryHour: 8,        // สรุปคิวตอนเช้า: ส่งรอบแรกหลังเวลานี้ (เวลาไทย)
  remindBeforeMin: 60,   // เตือนก่อนรับ/คืนกล้องกี่นาที
  appUrl: '/dashboard',
}

// ══════════════════════════════════════════════════════════════
// ส่วนที่ 1: Web Push (RFC 8291 + RFC 8292) ด้วย WebCrypto
// ══════════════════════════════════════════════════════════════
const te = new TextEncoder()

export function b64uEncode(input: ArrayBuffer | Uint8Array): string {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input)
  let s = ''
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function b64uDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8)
  return new Uint8Array(bits)
}

/** เข้ารหัสข้อความสำหรับเครื่องปลายทาง (RFC 8291) — opts ใช้ตอนทดสอบเท่านั้น */
export async function encryptPayload(
  uaPublicB64: string, authB64: string, plaintext: Uint8Array,
  opts: { salt?: Uint8Array, senderPrivate?: CryptoKey, senderPublicRaw?: Uint8Array } = {},
): Promise<Uint8Array> {
  const uaPublic = b64uDecode(uaPublicB64)
  const authSecret = b64uDecode(authB64)
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16))

  let asPrivate = opts.senderPrivate, asPublic = opts.senderPublicRaw
  if (!asPrivate || !asPublic) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair
    asPrivate = kp.privateKey
    asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))
  }
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asPrivate, 256))

  const keyInfo = concat(te.encode('WebPush: info'), new Uint8Array([0]), uaPublic, asPublic)
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32)
  const cek = await hkdf(salt, ikm, concat(te.encode('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16)
  const nonce = await hkdf(salt, ikm, concat(te.encode('Content-Encoding: nonce'), new Uint8Array([0])), 12)

  const padded = concat(plaintext, new Uint8Array([2]))          // 0x02 = record สุดท้าย
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded))

  const rs = new Uint8Array([0, 0, 0x10, 0])                      // record size 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher)
}

let vapidKeyCache: CryptoKey | null = null
async function vapidKey(publicB64: string, privateB64: string) {
  if (vapidKeyCache) return vapidKeyCache
  const pub = b64uDecode(publicB64)
  vapidKeyCache = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', d: privateB64,
    x: b64uEncode(pub.slice(1, 33)), y: b64uEncode(pub.slice(33, 65)), ext: true,
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  return vapidKeyCache
}

/** JWT สำหรับ VAPID (RFC 8292) — ลายเซ็น ES256 */
export async function vapidJwt(audience: string, subject: string, publicB64: string, privateB64: string) {
  const header = b64uEncode(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64uEncode(te.encode(JSON.stringify({
    aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject,
  })))
  const unsigned = `${header}.${claims}`
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' },
    await vapidKey(publicB64, privateB64), te.encode(unsigned))
  return `${unsigned}.${b64uEncode(sig)}`
}

type Sub = { endpoint: string, p256dh: string, auth: string }
type Note = { title: string, body: string, url?: string, tag?: string, badge?: number }

async function sendOne(sub: Sub, note: Note, ttl: number) {
  const pub = Deno.env.get('VAPID_PUBLIC_KEY')!, priv = Deno.env.get('VAPID_PRIVATE_KEY')!
  const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:hichao.cnx@gmail.com'
  const jwt = await vapidJwt(new URL(sub.endpoint).origin, subject, pub, priv)
  const body = await encryptPayload(sub.p256dh, sub.auth, te.encode(JSON.stringify(note)))
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: String(ttl),
      Urgency: 'high',
      Authorization: `vapid t=${jwt}, k=${pub}`,
    },
    body,
  })
  const text = res.ok ? '' : (await res.text().catch(() => '')).slice(0, 200)
  return { status: res.status, ok: res.ok, text }
}

// ══════════════════════════════════════════════════════════════
// ส่วนที่ 2: อ่าน/เขียนฐานข้อมูล (REST ของ Supabase ด้วย service role)
// ══════════════════════════════════════════════════════════════
function db(path: string, init: RequestInit = {}) {
  const url = Deno.env.get('SUPABASE_URL')!, key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
}
async function dbJson(path: string, init: RequestInit = {}) {
  const r = await db(path, init)
  if (!r.ok) throw new Error(`DB ${path.split('?')[0]}: ${r.status} ${(await r.text()).slice(0, 200)}`)
  return r.status === 204 ? null : r.json()
}

/** จองสิทธิ์ส่ง key นี้ — true = ยังไม่เคยส่ง (เพิ่งจองได้) · false = เคยส่งแล้ว */
async function claim(key: string): Promise<boolean> {
  const rows = await dbJson('push_log?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify([{ key }]),
  })
  return Array.isArray(rows) && rows.length > 0
}

async function broadcast(note: Note, ttl = 3600) {
  const subs: Sub[] = await dbJson('push_subscriptions?select=endpoint,p256dh,auth')
  const results = []
  for (const s of subs) {
    try {
      const r = await sendOne(s, note, ttl)
      results.push({ endpoint: s.endpoint.slice(0, 40), status: r.status })
      const ep = encodeURIComponent(s.endpoint)
      if (r.status === 404 || r.status === 410) {
        // เครื่องนี้ยกเลิก/ลบแอปไปแล้ว → ลบทิ้ง
        await db(`push_subscriptions?endpoint=eq.${ep}`, { method: 'DELETE' })
      } else {
        await db(`push_subscriptions?endpoint=eq.${ep}`, {
          method: 'PATCH',
          body: JSON.stringify(r.ok
            ? { last_success_at: new Date().toISOString(), last_error: null }
            : { last_error: `${r.status} ${r.text}`.slice(0, 300) }),
        })
      }
    } catch (e) {
      results.push({ endpoint: s.endpoint.slice(0, 40), error: String(e).slice(0, 200) })
    }
  }
  return results
}

// ══════════════════════════════════════════════════════════════
// ส่วนที่ 3: ข้อความแจ้งเตือน (เวลาไทย)
// ══════════════════════════════════════════════════════════════
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const money = (n: number) => '฿' + Math.round(n).toLocaleString('en-US')
const hm = (t?: string | null) => (t ? String(t).slice(0, 5) : '')
const num = (x: unknown) => Number(x || 0)

export type Rental = {
  id: string, group_id?: string | null, status: string, start_date: string, end_date: string,
  pickup_time?: string | null, return_time?: string | null,
  pickup_location?: string | null, return_location?: string | null,
  due_on_pickup?: number | null, insurance?: number | null, insurance_returned?: boolean | null,
  customer?: { name?: string } | null, camera?: { name?: string } | null,
}
type Group = { key: string, rows: Rental[], who: string, cams: string, time: string, loc: string }

/** เวลาไทยตอนนี้ → { date: 'YYYY-MM-DD', min: นาทีนับจากเที่ยงคืน } */
export function bangkokNow(now = new Date()) {
  const t = new Date(now.getTime() + 7 * 3600 * 1000)
  const date = t.toISOString().slice(0, 10)
  return { date, min: t.getUTCHours() * 60 + t.getUTCMinutes(), hour: t.getUTCHours() }
}
const toMin = (t?: string | null) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''))
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

function groups(rows: Rental[], kind: 'pickup' | 'return'): Group[] {
  const map = new Map<string, Rental[]>()
  for (const r of rows) {
    const k = r.group_id || r.id
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(r)
  }
  return [...map.entries()].map(([key, rs]) => {
    const lead = rs[0]
    return {
      key, rows: rs,
      who: lead.customer?.name || 'ลูกค้า',
      cams: rs.map(r => r.camera?.name || 'กล้อง').join(', '),
      time: hm(kind === 'pickup' ? lead.pickup_time : lead.return_time),
      loc: (kind === 'pickup' ? lead.pickup_location : lead.return_location) || '',
    }
  }).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'))
}

/** คิววันนี้: รับ = จองไว้/กำลังเช่า เริ่มวันนี้ · คืน = กำลังเช่า สิ้นสุดวันนี้ (ไม่นับเช่า-คืนวันเดียว) */
export function todayQueues(rentals: Rental[], today: string) {
  const pick = rentals.filter(r => r.start_date === today && (r.status === 'booked' || r.status === 'active'))
  const ret = rentals.filter(r => r.end_date === today && r.status === 'active' && r.start_date !== today)
  return { pickups: groups(pick, 'pickup'), returns: groups(ret, 'return') }
}

export function summaryNote(rentals: Rental[], today: string): Note {
  const { pickups, returns } = todayQueues(rentals, today)
  const [, m, d] = today.split('-').map(Number)
  const line = (g: Group) => `${g.time ? g.time + ' ' : ''}${g.who} (${g.cams})`
  const parts: string[] = []
  if (pickups.length) parts.push(`📦 รับ ${pickups.length}: ` + pickups.map(line).join(' · '))
  if (returns.length) parts.push(`🔄 คืน ${returns.length}: ` + returns.map(line).join(' · '))
  const total = pickups.length + returns.length
  return {
    title: total ? `☀️ คิววันนี้ ${d} ${MONTHS[m - 1]} · ${total} รายการ` : `☀️ วันนี้ ${d} ${MONTHS[m - 1]} ไม่มีคิว`,
    body: total ? parts.join('\n') : 'ชิลล์ๆ ได้เลย ✨',
    url: CONFIG.appUrl, tag: `summary-${today}`, badge: total,
  }
}

/** คิวที่ถึงเวลาเตือน (เหลือ 1–60 นาที) */
export function dueReminders(rentals: Rental[], nowMin: number, today: string) {
  const { pickups, returns } = todayQueues(rentals, today)
  const out: { key: string, note: Note }[] = []
  const left = (g: Group) => { const t = toMin(g.time); return t == null ? null : t - nowMin }
  const badge = pickups.length + returns.length
  for (const g of pickups) {
    const m = left(g)
    if (m == null || m <= 0 || m > CONFIG.remindBeforeMin) continue
    if (!g.rows.some(r => r.status === 'booked')) continue        // รับไปแล้ว ไม่ต้องเตือน
    const due = g.rows.reduce((s, r) => s + num(r.due_on_pickup), 0)
    out.push({
      key: `pickup:${g.key}:${today}`,
      note: {
        title: `⏰ อีก ${m} นาที · ${g.who} มารับกล้อง`,
        body: [`📷 ${g.cams}`, `🕐 ${g.time}${g.loc ? ' · 📍 ' + g.loc : ''}`, due > 0 ? `💰 เก็บวันรับ ${money(due)}` : '']
          .filter(Boolean).join('\n'),
        url: '/rentals', tag: `pickup-${g.key}`, badge,
      },
    })
  }
  for (const g of returns) {
    const m = left(g)
    if (m == null || m <= 0 || m > CONFIG.remindBeforeMin) continue
    const ins = g.rows.filter(r => !r.insurance_returned).reduce((s, r) => s + num(r.insurance), 0)
    out.push({
      key: `return:${g.key}:${today}`,
      note: {
        title: `⏰ อีก ${m} นาที · ${g.who} มาคืนกล้อง`,
        body: [`📷 ${g.cams}`, `🕐 ${g.time}${g.loc ? ' · 📍 ' + g.loc : ''}`, ins > 0 ? `🔒 คืนประกัน ${money(ins)}` : '']
          .filter(Boolean).join('\n'),
        url: '/rentals', tag: `return-${g.key}`, badge,
      },
    })
  }
  return out
}

// ══════════════════════════════════════════════════════════════
// ส่วนที่ 4: ตัวรับคำขอ
// ══════════════════════════════════════════════════════════════
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/** ผู้เรียกเป็นผู้ใช้ที่ล็อกอินจริงไหม (กันคนนอกยิงแจ้งเตือนทดสอบใส่มือถือร้าน) */
async function isLoggedIn(req: Request) {
  const auth = req.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ')) return false
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: Deno.env.get('SUPABASE_ANON_KEY')! },
  })
  if (!r.ok) return false
  const u = await r.json().catch(() => null)
  return !!u?.id
}

const RENTAL_SELECT = 'id,group_id,status,start_date,end_date,pickup_time,return_time,pickup_location,return_location,' +
  'due_on_pickup,insurance,insurance_returned,customer:customers(name),camera:cameras(name)'

async function handle(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (!Deno.env.get('VAPID_PUBLIC_KEY') || !Deno.env.get('VAPID_PRIVATE_KEY')) {
    return reply({ error: 'ยังไม่ได้ตั้งค่า VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ใน Secrets' }, 500)
  }
  const body = await req.json().catch(() => ({}))

  if (body?.mode === 'test') {
    if (!(await isLoggedIn(req))) return reply({ error: 'ต้องล็อกอินก่อน' }, 401)
    const results = await broadcast({
      title: '🔔 ทดสอบแจ้งเตือน HICHAO.CNX',
      body: 'ถ้าเห็นข้อความนี้ = ตั้งค่าเรียบร้อย ใช้งานได้แล้ว ✅',
      url: '/notifications', tag: 'test',
    }, 600)
    return reply({ ok: true, sent: results })
  }

  // ── โหมด cron ───────────────────────────────────────────
  const { date: today, min: nowMin, hour } = bangkokNow()
  const subs = await dbJson('push_subscriptions?select=endpoint&limit=1')
  if (!subs?.length) return reply({ ok: true, skipped: 'ยังไม่มีเครื่องเปิดรับแจ้งเตือน' })

  const rentals: Rental[] = await dbJson(
    `rentals?select=${RENTAL_SELECT}&status=in.(booked,active)` +
    `&or=(start_date.eq.${today},end_date.eq.${today})`)
  const sent: unknown[] = []

  if (hour >= CONFIG.summaryHour && await claim(`summary:${today}`)) {
    sent.push({ summary: await broadcast(summaryNote(rentals, today), 6 * 3600) })
    // ล้าง log เก่ากว่า 60 วัน (ทำวันละครั้งพร้อมสรุปเช้า)
    const cutoff = new Date(Date.now() - 60 * 86400000).toISOString()
    await db(`push_log?sent_at=lt.${cutoff}`, { method: 'DELETE' })
  }
  for (const r of dueReminders(rentals, nowMin, today)) {
    if (await claim(r.key)) sent.push({ [r.key]: await broadcast(r.note, 3600) })
  }
  return reply({ ok: true, today, nowMin, sent })
}

// รันบน Supabase (Deno) เท่านั้น — ตอนทดสอบใน Node จะ import ฟังก์ชันไปใช้เฉยๆ
// deno-lint-ignore no-explicit-any
const D = (globalThis as any).Deno
if (D?.serve) {
  D.serve(async (req: Request) => {
    try { return await handle(req) } catch (e) {
      console.error(e)
      return reply({ error: String((e as Error)?.message || e) }, 500)
    }
  })
}
