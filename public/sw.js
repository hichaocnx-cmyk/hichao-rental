// v8 — แก้บั๊ก: เดิม cache ทับ response แบบ opaque (status = 0) ไปด้วย
//      ถ้าตอนนั้น Supabase ตอบ 402 (โปรเจกต์ถูกระงับ) เราจะ cache หน้า error
//      ค้างไว้ถาวร → รูปพังต่อแม้บริการกลับมาแล้ว
//      v8 จะยิงแบบ CORS เพื่ออ่าน status ได้จริง และ cache เฉพาะ 200
const CACHE_NAME = 'hichao-v8'
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

  if (url.hostname.includes('supabase.co')) {
    // 1) รูปจาก Storage (public) — cache-first: โหลดครั้งเดียวเก็บในเครื่อง
    //    ลด Cached Egress (โควตา bandwidth ของ Supabase)
    if (url.pathname.startsWith('/storage/v1/object/public/')) {
      e.respondWith(handleStorageImage(e.request))
      return
    }
    // 2) API อื่นทั้งหมด (rentals/customers/auth) — network เท่านั้น ไม่ cache
    return
  }

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

// รูปจาก Supabase Storage — cache-first + ยิงแบบ CORS เพื่อเช็ค status ได้
async function handleStorageImage(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  // <img> ข้ามโดเมนเป็น no-cors → response เป็น opaque อ่าน status ไม่ได้
  // ยิงซ้ำแบบ cors เพื่อรู้ว่าสำเร็จจริงไหม (bucket เป็น public จึงยิงได้)
  try {
    const res = await fetch(new Request(request.url, { mode: 'cors', credentials: 'omit' }))
    if (res.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, res.clone())   // cache เฉพาะที่สำเร็จจริง
    }
    return res
  } catch {
    // CORS พัง (bucket ไม่ public / เน็ตหลุด) → ยิงตามเดิม แต่ไม่ cache
    return fetch(request)
  }
}
