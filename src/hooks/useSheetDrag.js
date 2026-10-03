import { useRef, useState } from 'react'

/* ══════════════════════════════════════════════════════════════
   useSheetDrag — ลากแผ่น (bottom sheet) ลงเพื่อปิด บนมือถือ
   ──────────────────────────────────────────────────────────────
   เดิมปิดหน้าต่างได้ทางเดียวคือเล็งกดกากบาทมุมขวาบน ซึ่งอยู่สูง
   และเล็กเกินไปเวลาถือมือถือมือเดียว
   ตอนนี้ลากแผ่นลงแล้วปล่อย = ปิด เหมือนแอปทั่วไป

   วิธีใช้:
     const sheet = useSheetDrag({ onClose })
     <div style={sheet.style} ...>
       <div {...sheet.handleProps}> ...ขีดจับ + หัวข้อ... </div>
       <div {...sheet.bodyProps} className="overflow-y-auto"> ...เนื้อหา... </div>
     </div>

   · handleProps — ลากได้เสมอ (ใช้กับขีดจับและแถบหัวข้อ)
   · bodyProps   — ลากได้เฉพาะตอนเลื่อนเนื้อหาอยู่บนสุดแล้ว
                   ไม่งั้นจะแย่งกับการสกรอลล์อ่านฟอร์ม
   · จอใหญ่ (>= 640px) ไม่ทำงาน เพราะที่นั่นเป็นกล่องกลางจอ ไม่ใช่แผ่นเลื่อน
   ══════════════════════════════════════════════════════════════ */

const BREAKPOINT    = 640   // ต่ำกว่านี้ถือว่าเป็นมือถือ (ตรงกับ sm: ของ Tailwind)
const CLOSE_AT      = 110   // ลากลงเกินกี่ px ถึงจะปิด
const CLOSE_VELOCITY = 0.6  // ปัดเร็วๆ (px ต่อ ms) ก็ปิดเลย ไม่ต้องลากไกล
const FLICK_MIN     = 56    // แต่ต้องลากลงอย่างน้อยเท่านี้ กันนิ้วปัดโดนนิดเดียวแล้วหน้าปิดเอง

export default function useSheetDrag({ onClose, closeAt = CLOSE_AT } = {}) {
  const [dragY, setDragY] = useState(0)
  const start = useRef(null)   // { y, t } — null = ไม่ได้กำลังลาก

  const isPhone = () => typeof window !== 'undefined' && window.innerWidth < BREAKPOINT

  const begin = (e) => {
    if (!isPhone() || e.touches.length !== 1) return
    start.current = { y: e.touches[0].clientY, t: Date.now() }
  }

  const move = (e) => {
    if (!start.current) return
    const dy = e.touches[0].clientY - start.current.y
    // ลากขึ้นไม่ทำอะไร — แผ่นติดขอบบนอยู่แล้ว
    setDragY(dy > 0 ? dy : 0)
  }

  const end = () => {
    if (!start.current) return
    const elapsed = Math.max(1, Date.now() - start.current.t)
    // ปัดเร็ว = ปิดได้โดยไม่ต้องลากจนสุด แต่ต้องลากลงพอสมควรก่อน
    // ไม่งั้นแค่สะบัดนิ้วตอนเลื่อนดูฟอร์ม หน้าก็ปิดเองโดยไม่ได้ตั้งใจ
    const fast = dragY >= FLICK_MIN && dragY / elapsed >= CLOSE_VELOCITY
    const far  = dragY >= closeAt
    start.current = null
    if (far || fast) {
      // เลื่อนลงให้สุดก่อนค่อยปิด จะได้ไม่หายวับ
      setDragY(window.innerHeight)
      setTimeout(() => onClose?.(), 180)
    } else {
      setDragY(0)
    }
  }

  // เลื่อนเนื้อหาอยู่บนสุดแล้วเท่านั้นถึงเริ่มลากจากตัวเนื้อหาได้
  const beginFromBody = (e) => {
    if (e.currentTarget.scrollTop > 0) return
    begin(e)
  }
  const moveFromBody = (e) => {
    if (!start.current) return
    if (e.currentTarget.scrollTop > 0) { start.current = null; setDragY(0); return }
    move(e)
  }

  const dragging = start.current !== null

  return {
    dragging,
    style: {
      transform: dragY ? `translateY(${dragY}px)` : undefined,
      transition: dragging ? 'none' : 'transform .22s cubic-bezier(.22,1,.36,1)',
    },
    handleProps: {
      onTouchStart: begin,
      onTouchMove: move,
      onTouchEnd: end,
      onTouchCancel: end,
      style: { touchAction: 'none' },   // บอกเบราว์เซอร์ว่าเราจัดการนิ้วเอง
    },
    bodyProps: {
      onTouchStart: beginFromBody,
      onTouchMove: moveFromBody,
      onTouchEnd: end,
      onTouchCancel: end,
    },
  }
}
