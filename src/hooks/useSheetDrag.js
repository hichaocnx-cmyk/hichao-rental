import { useRef, useState } from 'react'

/* ══════════════════════════════════════════════════════════════
   useSheetDrag — ลากเพื่อปิด บนมือถือ
   ──────────────────────────────────────────────────────────────
   ใช้ได้ 2 แบบ:
     axis: 'y' (ค่าเริ่มต้น) — แผ่นเลื่อนขึ้นจากด้านล่าง ลากลงเพื่อปิด
     axis: 'x'               — เมนูข้างที่เลื่อนมาจากซ้าย ลากไปทางซ้ายเพื่อปิด

   วิธีใช้:
     const sheet = useSheetDrag({ onClose })
     <div style={sheet.style}>
       <div {...sheet.handleProps}> ...ขีดจับ + หัวข้อ... </div>
       <div {...sheet.bodyProps} className="overflow-y-auto"> ...เนื้อหา... </div>
     </div>

   · handleProps — ลากได้เสมอ (ใช้กับขีดจับและแถบหัวข้อ)
   · bodyProps   — ลากได้เฉพาะตอนเลื่อนเนื้อหาอยู่บนสุดแล้ว
                   ไม่งั้นจะแย่งกับการสกรอลล์อ่านเนื้อหา
   · reset()     — ล้างระยะที่ลางค้างไว้ จำเป็นกับตัวที่ไม่ถูก unmount
                   เวลาปิด (เช่น เมนูข้าง) ไม่งั้นเปิดใหม่แล้วจะยังอยู่นอกจอ
   · จอกว้างเกิน maxWidth ไม่ทำงาน (ที่นั่นไม่ใช่แผ่นเลื่อน/เมนูลอย)
   ══════════════════════════════════════════════════════════════ */

const CLOSE_AT       = 110  // ลากเกินกี่ px ถึงจะปิด
const CLOSE_VELOCITY = 0.6  // ปัดเร็วๆ (px ต่อ ms) ก็ปิดเลย ไม่ต้องลากไกล
const FLICK_MIN      = 56   // แต่ต้องลากอย่างน้อยเท่านี้ กันนิ้วปัดโดนนิดเดียวแล้วปิดเอง

export default function useSheetDrag({
  onClose,
  closeAt  = CLOSE_AT,
  axis     = 'y',    // 'y' = ลากลงปิด · 'x' = ลากไปซ้ายปิด
  maxWidth = 640,    // จอแคบกว่านี้ถึงจะลากได้ (เมนูข้างใช้ 1024 เพราะซ่อนที่ lg)
} = {}) {
  const [drag, setDrag] = useState(0)   // ระยะที่ลางมาแล้ว (บวกเสมอ)
  const start = useRef(null)            // { pos, t } — null = ไม่ได้กำลังลาก

  const vertical = axis !== 'x'
  const canDrag = () => typeof window !== 'undefined' && window.innerWidth < maxWidth
  const posOf = (touch) => (vertical ? touch.clientY : touch.clientX)

  const begin = (e) => {
    if (!canDrag() || e.touches.length !== 1) return
    start.current = { pos: posOf(e.touches[0]), t: Date.now() }
  }

  const move = (e) => {
    if (!start.current) return
    const delta = posOf(e.touches[0]) - start.current.pos
    // แนวตั้งนับเฉพาะลากลง · แนวนอนนับเฉพาะลากไปซ้าย
    const d = vertical ? delta : -delta
    setDrag(d > 0 ? d : 0)
  }

  const end = () => {
    if (!start.current) return
    const elapsed = Math.max(1, Date.now() - start.current.t)
    // ปัดเร็ว = ปิดได้โดยไม่ต้องลากจนสุด แต่ต้องลากพอสมควรก่อน
    // ไม่งั้นแค่สะบัดนิ้วตอนเลื่อนดูเนื้อหา ก็ปิดเองโดยไม่ได้ตั้งใจ
    const fast = drag >= FLICK_MIN && drag / elapsed >= CLOSE_VELOCITY
    const far  = drag >= closeAt
    start.current = null
    if (far || fast) {
      // เลื่อนออกให้สุดก่อนค่อยปิด จะได้ไม่หายวับ
      setDrag(vertical ? window.innerHeight : window.innerWidth)
      setTimeout(() => onClose?.(), 180)
    } else {
      setDrag(0)
    }
  }

  // เลื่อนเนื้อหาอยู่บนสุดแล้วเท่านั้นถึงเริ่มลากจากตัวเนื้อหาได้
  const beginFromBody = (e) => {
    if (vertical && e.currentTarget.scrollTop > 0) return
    begin(e)
  }
  const moveFromBody = (e) => {
    if (!start.current) return
    if (vertical && e.currentTarget.scrollTop > 0) { start.current = null; setDrag(0); return }
    move(e)
  }

  const dragging = start.current !== null

  return {
    dragging,
    reset: () => { start.current = null; setDrag(0) },
    style: {
      transform: drag ? (vertical ? `translateY(${drag}px)` : `translateX(-${drag}px)`) : undefined,
      transition: dragging ? 'none' : 'transform .22s cubic-bezier(.22,1,.36,1)',
    },
    handleProps: {
      onTouchStart: (e) => { e.stopPropagation(); begin(e) },
      onTouchMove:  (e) => { e.stopPropagation(); move(e) },
      onTouchEnd:   (e) => { e.stopPropagation(); end(e) },
      onTouchCancel:(e) => { e.stopPropagation(); end(e) },
      style: { touchAction: vertical ? 'none' : 'pan-y' },  // แนวนอน: ยังให้เลื่อนขึ้นลงได้ตามปกติ
    },
    bodyProps: {
      onTouchStart: beginFromBody,
      onTouchMove: moveFromBody,
      onTouchEnd: end,
      onTouchCancel: end,
    },
  }
}
