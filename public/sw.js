// v11 — ไอคอนแอปใหม่ (พื้นแดงเลือดนก) → เปลี่ยนชื่อ cache ให้โหลดรูปใหม่
// v10 — เพิ่มรับแจ้งเตือนเด้งบนหน้าล็อค (Web Push) ดูท้ายไฟล์
// v9  — ระบบเลิกใช้รูปถ่ายกล้องแล้ว (เปลี่ยนเป็น emoji 📷)
//      จึงตัด logic cache รูปจาก Supabase Storage ออกทั้งหมด
//      ตอนนี้ไม่มีคำขอไป storage อีกเลย → Cached Egress = 0
const CACHE_NAME = 'hichao-v11'
const STATIC_ASSETS = [
  '/manifest.json',
  '/logo.png',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]

// ── Install: cache only true static assets (images, manifest) ─
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: remove all old caches ───────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Supabase API (rentals/customers/auth) — network เท่านั้น ห้าม cache
  // ไม่มีคำขอไป /storage/ อีกแล้ว เพราะระบบใช้ emoji แทนรูปถ่าย
  if (url.hostname.includes('supabase.co')) return

  // Navigation requests — network-first, fallback to index.html (SPA)
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')))
    return
  }

  // JS/CSS bundles — always network (content-hashed, never cache)
  if (url.pathname.startsWith('/assets/')) return

  // Images & manifest — cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res
        const clone = res.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        return res
      })
    })
  )
})

// ── Push: แจ้งเตือนจากเซิร์ฟเวอร์ (supabase/functions/push-notify) ──
// iPhone บังคับว่าทุก push ต้องแสดงแจ้งเตือนจริงเสมอ ห้ามเงียบ
// ไม่งั้นจะถูกตัดสิทธิ์ส่งแจ้งเตือน — เลยมี fallback ข้อความเสมอ
self.addEventListener('push', e => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data ? e.data.text() : '' } }
  const title = d.title || 'HICHAO.CNX'
  const tasks = [
    self.registration.showNotification(title, {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag || undefined,
      data: { url: d.url || '/dashboard' },
    }),
  ]
  // ตัวเลขแดงบนไอคอนแอป = จำนวนคิววันนี้
  if (typeof d.badge === 'number' && self.navigator.setAppBadge) {
    tasks.push((d.badge > 0 ? self.navigator.setAppBadge(d.badge) : self.navigator.clearAppBadge()).catch(() => {}))
  }
  e.waitUntil(Promise.all(tasks))
})

// แตะแจ้งเตือน → เปิดแอปที่หน้าที่เกี่ยวข้อง (ใช้หน้าต่างเดิมถ้าเปิดอยู่แล้ว)
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = new URL((e.notification.data && e.notification.data.url) || '/dashboard', self.location.origin).href
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of wins) {
      if (w.url.startsWith(self.location.origin)) {
        await w.focus()
        if ('navigate' in w) await w.navigate(url).catch(() => {})
        return
      }
    }
    await self.clients.openWindow(url)
  })())
})
