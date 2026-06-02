import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── เวลาไทย UTC+7 ───────────────────────────────────────────────
const TZ = 7 * 60 * 60 * 1000
const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const DAYS_TH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']

serve(async (_req) => {
  const CORS = { 'Access-Control-Allow-Origin': '*' }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const TOKEN   = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
    const USER_ID = Deno.env.get('LINE_USER_ID')
    if (!TOKEN || !USER_ID) throw new Error('LINE env vars not set')

    // วันนี้ (เวลาไทย)
    const nowTH   = new Date(Date.now() + TZ)
    const today   = nowTH.toISOString().slice(0, 10)
    const d       = nowTH.getUTCDate()
    const m       = nowTH.getUTCMonth()
    const y       = nowTH.getUTCFullYear() + 543
    const dayName = DAYS_TH[nowTH.getUTCDay()]
    const dateLabel = `${dayName}ที่ ${d} ${MONTHS_TH[m]} ${y}`

    // ดึง rentals วันนี้
    const { data: rentals, error } = await supabase
      .from('rentals')
      .select('*, camera:cameras(name), customer:customers(name, phone)')
      .or(`start_date.eq.${today},end_date.eq.${today}`)
      .in('status', ['booked', 'active'])
      .order('pickup_time', { ascending: true })

    if (error) throw new Error(error.message)

    const pickups = (rentals ?? []).filter(r => r.start_date === today)
    const returns = (rentals ?? []).filter(r => r.end_date === today && r.start_date !== today)

    // ── สร้างข้อความสรุป ─────────────────────────────────────────
    let msg = `[HICHAO.CNX] 📋 คิวประจำวัน\n${dateLabel}\n`
    msg += `${'─'.repeat(30)}\n`

    msg += `\n📦 รับกล้องวันนี้  (${pickups.length} รายการ)\n`
    if (pickups.length === 0) {
      msg += `   — ไม่มีรายการ\n`
    } else {
      pickups.forEach((r, i) => {
        const time = r.pickup_time ? ` · ${r.pickup_time.slice(0,5)} น.` : ''
        const loc  = r.pickup_location ? `\n   📍 ${r.pickup_location}` : ''
        const phone = r.customer?.phone ? ` (${r.customer.phone})` : ''
        msg += `\n${i+1}. 📷 ${r.camera?.name ?? '—'}\n`
        msg += `   👤 ${r.customer?.name ?? '—'}${phone}${time}${loc}\n`
      })
    }

    msg += `\n${'─'.repeat(30)}\n`
    msg += `\n🔄 คืนกล้องวันนี้  (${returns.length} รายการ)\n`
    if (returns.length === 0) {
      msg += `   — ไม่มีรายการ\n`
    } else {
      returns.forEach((r, i) => {
        const time = r.return_time ? ` · ${r.return_time.slice(0,5)} น.` : ''
        const loc  = r.return_location ? `\n   📍 ${r.return_location}` : ''
        const phone = r.customer?.phone ? ` (${r.customer.phone})` : ''
        msg += `\n${i+1}. 📷 ${r.camera?.name ?? '—'}\n`
        msg += `   👤 ${r.customer?.name ?? '—'}${phone}${time}${loc}\n`
      })
    }

    msg += `\n${'─'.repeat(30)}\n`
    msg += `รวม ${pickups.length + returns.length} รายการ`

    // ── ส่ง LINE ──────────────────────────────────────────────────
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        to: USER_ID,
        messages: [{ type: 'text', text: msg }],
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `LINE API error: ${res.status}`)
    }

    return new Response(
      JSON.stringify({ ok: true, date: today, pickups: pickups.length, returns: returns.length }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
