import { useRef, useState, useEffect } from 'react'

/* ══════════════════════════════════════════════════════════════
   useSheetDrag — ลากเพื่อปิด บนมือถือ (ให้ "ติดมือ" ลื่น 60fps)
   ──────────────────────────────────────────────────────────────
   ⚠️ เรื่องสำคัญที่สุดของไฟล์นี้: ห้ามให้ React วาดหน้าใหม่ระหว่างลาก
   เวอร์ชันแรกสั่ง setState ทุกครั้งที่นิ้วขยับ → ฟอร์มใหญ่ๆ อย่างหน้า
   สร้างรายการเช่าต้องวาดใหม่ทั้งหน้าวินาทีละหลายสิบรอบ บนมือถือเลยกระตุก
   รู้สึกเหมือนแผ่นไม่ขยับตามนิ้ว
   ตอนนี้ระหว่างลากเราเขียน transform ลง DOM ตรงๆ ผ่าน ref + rAF
   (เฟรมละครั้งพอดี) React ไม่ต้องรู้เรื่องเลย จะลื่นเท่ากันทุกหน้า
   setState มีแค่ 2 ครั้งต่อการลาก 1 ครั้ง (ตอนเริ่มกับตอนปล่อย)
   เอาไว้เปลี่ยนหน้าตาขีดจับเฉยๆ

   ใช้ได้ 2 แบบ:
     axis: 'y' (ค่าเริ่มต้น) — แผ่นเลื่อนขึ้นจากด้านล่าง ลากลงเพื่อปิด
     axis: 'x'               — เมนูข้างที่เลื่อนมาจากซ้าย ลากไปซ้ายเพื่อปิด

   วิธีใช้:
     const sheet = useSheetDrag({ onClose })
     <div className="overlay">
       <div ref={sheet.backdropRef} className="พื้นมืด" />      ← ใส่หรือไม่ใส่ก็ได้
       <div ref={sheet.sheetRef}>
         <div {...sheet.handleProps}> ...ขีดจับ + หัวข้อ... </div>
         <div {...sheet.bodyProps} className="overflow-y-auto"> ...เนื้อหา... </div>
       </div>
     </div>

   · handleProps — ลากได้เสมอ (ขีดจับและแถบหัวข้อ)
   · bodyProps   — ลากได้เฉพาะตอนเลื่อนเนื้อหาอยู่บนสุดแล้ว
                   ไม่งั้นจะแย่งกับการสกรอลล์อ่านเนื้อหา
   · backdropRef — พื้นมืดจะจางลงตามระยะที่ลาก ทำให้รู้สึกว่ากำลังดึงจริงๆ
   · reset()     — ล้างระยะที่ลากค้างไว้ จำเป็นกับตัวที่ไม่ถูกถอดออกจากหน้า
                   เวลาปิด (เช่น เมนูข้าง) ไม่งั้นเปิดใหม่จะค้างอยู่นอกจอ
   · จอกว้างเกิน maxWidth ไม่ทำงาน (ที่นั่นไม่ใช่แผ่นเลื่อน/เมนูลอย)
   ══════════════════════════════════════════════════════════════ */

const CLOSE_AT       = 110  // ลากเกินกี่ px ถึงจะปิด
const CLOSE_VELOCITY = 0.6  // ปัดเร็วๆ (px ต่อ ms) ก็ปิดเลย ไม่ต้องลากไกล
const FLICK_MIN      = 56   // แต่ต้องลากอย่างน้อยเท่านี้ กันนิ้วปัดโดนนิดเดียวแล้วปิดเอง
const SPRING         = 'transform .28s cubic-bezier(.22,1,.36,1)'
const FADE           = 'opacity .28s ease'
const RUBBER         = 0.22 // ลากผิดทาง ให้ขยับตามนิดเดียวแบบมีแรงต้าน (รู้สึกว่าจับติด)
const RUBBER_MAX     = 14   // แต่ไม่เกินเท่านี้ ไม่งั้นจะเห็นช่องว่างที่ขอบจอ ดูเหมือนจอเพี้ยน

export default function useSheetDrag({
  onClose,
  closeAt  = CLOSE_AT,
  axis     = 'y',    // 'y' = ลากลงปิด · 'x' = ลากไปซ้ายปิด
  maxWidth = 640,    // จอแคบกว่านี้ถึงจะลากได้ (เมนูข้างใช้ 1024 เพราะซ่อนที่ lg)
} = {}) {
  const sheetRef    = useRef(null)
  const backdropRef = useRef(null)
  const start   = useRef(null)   // { pos, t } — null = ไม่ได้กำลังลาก
  const offset  = useRef(0)      // ระยะล่าสุด (px, บวกเสมอ = ทิศที่จะปิด)
  const pending = useRef(null)   // ค่าที่รอเขียนลงจอในเฟรมถัดไป
  const frame   = useRef(0)
  const [dragging, setDragging] = useState(false)

  const vertical = axis !== 'x'
  const canDrag = () => typeof window !== 'undefined' && window.innerWidth < maxWidth
  const posOf = (t) => (vertical ? t.clientY : t.clientX)

  // ── เขียนลงจอตรงๆ ไม่ผ่าน React ────────────────────────────
  const paint = (d, animate) => {
    const n = sheetRef.current
    if (n) {
      n.style.transition = animate ? SPRING : 'none'
      n.style.transform = d ? (vertical ? `translateY(${d}px)` : `translateX(${-d}px)`) : ''
    }
    const b = backdropRef.current
    if (b) {
      // พื้นมืดจางลงตามระยะ — ดึงมากยิ่งเห็นข้างหลังมาก
      const span = vertical ? 340 : 260
      b.style.transition = animate ? FADE : 'none'
      b.style.opacity = d > 0 ? String(Math.max(0, 1 - d / span)) : ''
    }
  }

  const schedule = (d) => {
    pending.current = d
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      if (pending.current != null) paint(pending.current, false)
    })
  }

  const stopFrame = () => {
    if (frame.current) { cancelAnimationFrame(frame.current); frame.current = 0 }
    pending.current = null
  }

  useEffect(() => stopFrame, [])

  const begin = (e) => {
    if (!canDrag() || e.touches.length !== 1) return
    start.current = { pos: posOf(e.touches[0]), t: Date.now() }
    offset.current = 0
    const n = sheetRef.current
    if (n) n.style.willChange = 'transform'
    setDragging(true)
  }

  const move = (e) => {
    if (!start.current) return
    const delta = posOf(e.touches[0]) - start.current.pos
    const d = vertical ? delta : -delta
    // ลากผิดทางให้ขยับตามแบบมีแรงต้าน จะได้รู้สึกว่านิ้วจับติดอยู่จริง
    offset.current = d > 0 ? d : Math.max(-RUBBER_MAX, d * RUBBER)
    schedule(offset.current)
  }

  const finish = (close) => {
    stopFrame()
    const n = sheetRef.current
    if (n) n.style.willChange = ''
    if (close) {
      paint(vertical ? window.innerHeight : window.innerWidth, true)
      setTimeout(() => onClose?.(), 190)
    } else {
      paint(0, true)
    }
    setDragging(false)
  }

  const end = () => {
    if (!start.current) return
    const moved = offset.current
    const elapsed = Math.max(1, Date.now() - start.current.t)
    start.current = null
    // ปัดเร็ว = ปิดได้โดยไม่ต้องลากจนสุด แต่ต้องลากพอสมควรก่อน
    // ไม่งั้นแค่สะบัดนิ้วตอนเลื่อนดูเนื้อหา ก็ปิดเองโดยไม่ได้ตั้งใจ
    const fast = moved >= FLICK_MIN && moved / elapsed >= CLOSE_VELOCITY
    finish(moved >= closeAt || fast)
  }

  // เลื่อนเนื้อหาอยู่บนสุดแล้วเท่านั้นถึงเริ่มลากจากตัวเนื้อหาได้
  const beginFromBody = (e) => {
    if (vertical && e.currentTarget.scrollTop > 0) return
    begin(e)
  }
  const moveFromBody = (e) => {
    if (!start.current) return
    if (vertical && e.currentTarget.scrollTop > 0) { start.current = null; stopFrame(); paint(0, false); setDragging(false); return }
    move(e)
  }

  return {
    dragging,
    sheetRef,
    backdropRef,
    reset: () => { start.current = null; offset.current = 0; stopFrame(); paint(0, false); setDragging(false) },
    handleProps: {
      onTouchStart: (e) => { e.stopPropagation(); begin(e) },
      onTouchMove:  (e) => { e.stopPropagation(); move(e) },
      onTouchEnd:   (e) => { e.stopPropagation(); end(e) },
      onTouchCancel:(e) => { e.stopPropagation(); end(e) },
      style: { touchAction: vertical ? 'none' : 'pan-y' },  // แนวนอน: ยังเลื่อนขึ้นลงได้ตามปกติ
    },
    bodyProps: {
      onTouchStart: beginFromBody,
      onTouchMove: moveFromBody,
      onTouchEnd: end,
      onTouchCancel: end,
    },
  }
}
