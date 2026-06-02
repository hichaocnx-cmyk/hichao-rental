/**
 * ส่ง LINE notification ผ่าน Supabase Edge Function (แก้ปัญหา CORS)
 * Edge Function: supabase/functions/send-line/index.ts
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function sendLineNotify(message) {
  if (!SUPABASE_URL) throw new Error('Missing VITE_SUPABASE_URL')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-line`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ message }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) throw new Error(data.error || `Error: ${res.status}`)
  return true
}
