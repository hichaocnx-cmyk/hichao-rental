import { useEffect, useRef, useState } from 'react'

/**
 * ตัวเลขนับขึ้นแบบนุ่มๆ (easeOutCubic) — เคารพ prefers-reduced-motion
 * <CountUp value={1234} format={(v)=>`฿${v.toLocaleString()}`} />
 */
export default function CountUp({ value, format, duration = 850, className }) {
  const [display, setDisplay] = useState(Number(value) || 0)
  const fromRef = useRef(0)
  const rafRef  = useRef(null)

  useEffect(() => {
    const to = Number(value) || 0
    const reduce = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { fromRef.current = to; setDisplay(to); return }

    const from  = fromRef.current
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  const n = Math.round(display)
  return <span className={className}>{format ? format(n) : n.toLocaleString()}</span>
}
