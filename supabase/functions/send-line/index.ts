import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const body = await req.json()
    const { message, imageUrl } = body

    const TOKEN   = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
    const USER_ID = Deno.env.get('LINE_USER_ID')
    if (!TOKEN || !USER_ID) throw new Error('LINE env vars not set')

    const messages: object[] = []
    if (message) messages.push({ type: 'text', text: message })
    if (imageUrl) messages.push({
      type: 'image',
      originalContentUrl: imageUrl,
      previewImageUrl:    imageUrl,
    })
    if (messages.length === 0) throw new Error('message or imageUrl is required')

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ to: USER_ID, messages }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `LINE API error: ${res.status}`)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
