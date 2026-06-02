import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // เวลาไทย UTC+7
  const TZ_OFFSET_MS = 7 * 60 * 60 * 1000
  const nowMs   = Date.now()
  const nowTH   = new Date(nowMs + TZ_OFFSET_MS)
  const todayStr = nowTH.toISOString().slice(0, 10)   // YYYY-MM-DD (เวลาไทย)

  const MIN_MS = 50 * 60 * 1000   // 50 นาที
  const MAX_MS = 70 * 60 * 1000   // 70 นาที

  const { data: rentals, error } = await supabase
    .from('rentals')
    .select('*, camera:cameras(name), customer:customers(name)')
    .or(`start_date.eq.${todayStr},end_date.eq.${todayStr}`)
    .in('status', ['booked', 'active'])

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const TOKEN   = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
  const USER_ID = Deno.env.get('LINE_USER_ID')
  if (!TOKEN || !USER_ID) return new Response('LINE env not set', { status: 500 })

  let sent = 0

  for (const r of rentals ?? []) {

    // ── คิวรับกล้อง ───────────────────────────────────────────
    if (r.start_date === todayStr && r.pickup_time &&
        (r.status === 'booked' || r.status === 'active')) {
      const [h, m] = r.pickup_time.split(':').map(Number)
      // แปลงเวลาไทยของคิว → UTC milliseconds
      const queueUTC = new Date(todayStr + 'T00:00:00Z').getTime()
        + h * 3600000 + m * 60000 - TZ_OFFSET_MS
      const diffMs = queueUTC - nowMs

      if (diffMs >= MIN_MS && diffMs <= MAX_MS) {
        const diffMin = Math.round(diffMs / 60000)
        const loc = r.pickup_location ? `\n📍 ${r.pickup_location}` : ''
        await sendLine(TOKEN, USER_ID,
          `[HICHAO.CNX] ⏰ อีก ${diffMin} นาที — รับกล้อง\n📷 ${r.camera?.name ?? '-'}\n👤 ${r.customer?.name ?? '-'}\n🕐 ${r.pickup_time.slice(0,5)}${loc}`)
        sent++
      }
    }

    // ── คิวคืนกล้อง ───────────────────────────────────────────
    if (r.end_date === todayStr && r.return_time && r.status === 'active') {
      const [h, m] = r.return_time.split(':').map(Number)
      const queueUTC = new Date(todayStr + 'T00:00:00Z').getTime()
        + h * 3600000 + m * 60000 - TZ_OFFSET_MS
      const diffMs = queueUTC - nowMs

      if (diffMs >= MIN_MS && diffMs <= MAX_MS) {
        const diffMin = Math.round(diffMs / 60000)
        const loc = r.return_location ? `\n📍 ${r.return_location}` : ''
        await sendLine(TOKEN, USER_ID,
          `[HICHAO.CNX] ⏰ อีก ${diffMin} นาที — คืนกล้อง\n📷 ${r.camera?.name ?? '-'}\n👤 ${r.customer?.name ?? '-'}\n🕐 ${r.return_time.slice(0,5)}${loc}`)
        sent++
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, checked: rentals?.length ?? 0, time_th: nowTH.toISOString() }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

async function sendLine(token: string, userId: string, text: string) {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
  })
}
