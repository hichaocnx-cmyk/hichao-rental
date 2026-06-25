import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')

  // ── LINE Webhook (รับข้อความจาก LINE / เก็บ userId) ────────────
  const authHeader = req.headers.get('authorization') || ''
  const isLineWebhook = !authHeader && req.method === 'POST'

  if (isLineWebhook) {
    try {
      const body = await req.json()
      const events = body.events || []
      for (const event of events) {
        const userId = event.source?.userId
        if (userId) console.log(`LINE User ID: ${userId}`)
      }
    } catch (_) {}
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── ส่งข้อความ / get_followers ──────────────────────────────────
  try {
    const body = await req.json()
    const { message, imageUrl, action } = body

    if (!TOKEN) throw new Error('LINE_CHANNEL_ACCESS_TOKEN not set')

    if (action === 'get_followers') {
      const res = await fetch('https://api.line.me/v2/bot/followers/ids', {
        headers: { 'Authorization': `Bearer ${TOKEN}` },
      })
      const data = await res.json()
      return new Response(JSON.stringify({ status: res.status, data }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const userIds: string[] = []
    for (let i = 1; i <= 5; i++) {
      const key = i === 1 ? 'LINE_USER_ID' : `LINE_USER_ID_${i}`
      const uid = Deno.env.get(key)
      if (uid) userIds.push(uid)
    }
    if (userIds.length === 0) throw new Error('No LINE_USER_ID set')

    const messages: object[] = []
    if (message) messages.push({ type: 'text', text: message })
    if (imageUrl) messages.push({
      type: 'image',
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl,
    })
    if (messages.length === 0) throw new Error('message or imageUrl is required')

    // ── push ทีละ user + เก็บผลลัพธ์จริงจาก LINE (status + error) ──
    const results = await Promise.all(
      userIds.map(async (uid) => {
        let status = 0
        let detail: unknown = null
        try {
          const res = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${TOKEN}`,
            },
            body: JSON.stringify({ to: uid, messages }),
          })
          status = res.status
          try { detail = await res.json() } catch (_) { detail = null }
          if (!res.ok) {
            console.error(`LINE push fail uid=${uid} status=${status}`, detail)
          }
        } catch (e) {
          console.error(`LINE push error uid=${uid}`, e)
          detail = { fetchError: String(e) }
        }
        return {
          user: uid.length > 10 ? uid.slice(0, 6) + '…' + uid.slice(-4) : uid,
          status,
          ok: status >= 200 && status < 300,
          line: detail,
        }
      })
    )

    const sent = results.filter((r) => r.ok).length
    const ok = sent > 0
    return new Response(JSON.stringify({ ok, sent, total: userIds.length, results }), {
      status: ok ? 200 : 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
