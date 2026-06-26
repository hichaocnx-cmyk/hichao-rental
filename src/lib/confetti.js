// เอฟเฟกต์กระดาษสีฉลอง (ไม่มี dependency) — เคารพ prefers-reduced-motion
const COLORS = ['#FF6B9D', '#FFC371', '#7FD1AE', '#7EC8F0', '#C9A7FF', '#FF8FB9']

export function celebrate({ count = 38 } = {}) {
  if (typeof window === 'undefined' || !document.body) return
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const root = document.createElement('div')
  root.className = 'hc-confetti-root'
  document.body.appendChild(root)

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span')
    p.className = 'hc-confetti'
    p.style.background = COLORS[i % COLORS.length]
    p.style.left = (50 + (Math.random() * 46 - 23)) + 'vw'
    p.style.setProperty('--dx', (Math.random() * 260 - 130) + 'px')
    p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg')
    p.style.animationDelay = (Math.random() * 0.18) + 's'
    p.style.animationDuration = (1.6 + Math.random() * 0.9) + 's'
    if (Math.random() < 0.5) p.style.borderRadius = '50%'
    root.appendChild(p)
  }
  setTimeout(() => root.remove(), 2900)
}
