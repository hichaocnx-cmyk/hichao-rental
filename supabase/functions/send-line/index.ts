import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')

  // ── LINE Webhook (รับข้อความจาก LINE) ──────────────────────────
  // LINE ส่ง POST โดยไม่มี Authorization header
  const authHeader = req.headers.get('authorization') || ''
  const isLineWebhook = !authHeader && req.method === 'POST'

  if (isLineWebhook) {
    try {
      const body = await req.json()
      const events = body.events || []
      for (const event of events) {
        const userId = event.source?.userId
        if (userId) {
          console.log(`LINE User ID: ${userId}`)
          // เก็บ User ID ไว้ใน Supabase table (optional)
        }
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
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      })
      const data = await res.json()
      return new Response(JSON.stringify(data), {
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

    const results = await Promise.allSettled(
      userIds.map(uid =>
        fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`,
          },
          body: JSON.stringify({ to: uid, messages }),
        }).then(async res => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.message || `LINE API error: ${res.status}`)
          }
          return uid
        })
      )
    )

    const failed = results.filter(r => r.status === 'rejected')
    if (failed.length === userIds.length) throw new Error('ส่ง LINE ไม่สำเร็จทุก user')

    return new Response(JSON.stringify({
      ok: true,
      sent: results.filter(r => r.status === 'fulfilled').length,
      total: userIds.length,
    }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
