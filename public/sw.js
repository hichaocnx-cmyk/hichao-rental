const CACHE_NAME = 'hichao-v7'
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

  // Supabase — แยก 2 กรณี:
  if (url.hostname.includes('supabase.co')) {
    // 1) รูปจาก Storage (public) — cache-first: โหลดครั้งเดียวเก็บในเครื่อง
    //    ลด Cached Egress (โควตา bandwidth ที่เคยใช้เกิน)
    if (url.pathname.startsWith('/storage/v1/object/public/')) {
      e.respondWith(
        caches.match(e.request).then(cached => {
          if (cached) return cached
          return fetch(e.request).then(res => {
            // opaque = รูปที่โหลดผ่าน <img> ข้ามโดเมน — เก็บ cache ได้เช่นกัน
            if (res && (res.status === 200 || res.type === 'opaque')) {
              const clone = res.clone()
              caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
            }
            return res
          })
        })
      )
    }
    // 2) API อื่นทั้งหมด (ข้อมูล rentals/customers/auth) — network เท่านั้น ไม่ cache
    return
  }

  // Navigation requests — network-first, fallback to index.html (SPA)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    )
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
