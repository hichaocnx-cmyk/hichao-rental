import { useState } from 'react'
import { getThumbUrl } from '../lib/images'

// ── รูปย่อสำหรับลิสต์ทุกหน้า ───────────────────────────────────
// โหลด thumbnail (320px ~20KB) ก่อน — ถ้ายังไม่มี thumb (รูปเก่า)
// จะ fallback ไปรูปต้นฉบับอัตโนมัติ ผู้ใช้ไม่เห็นความต่าง
//
// สำคัญ: อย่าใช้ <img src={camera.image_url}> ตรงๆ ในลิสต์
// เพราะเบราว์เซอร์จะโหลดรูปเต็ม ~300KB มาแสดงเป็นไอคอน 36px
// → กิน Cached Egress ของ Supabase จนโปรเจกต์ถูกระงับ (402)
export default function Thumb({ src, alt = '', className = '', fade = false }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (!src) return null

  const thumb = getThumbUrl(src)
  const finalSrc = failed || !thumb ? src : thumb

  return (
    <img
      src={finalSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => { if (!failed) setFailed(true) }}
      className={
        fade
          ? `${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`
          : className
      }
    />
  )
}
