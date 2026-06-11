import { useEffect } from 'react'

let ctx = null
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

export function playClick(type = 'default') {
  try {
    const ac = getCtx()
    if (ac.state === 'suspended') ac.resume()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    const now = ac.currentTime
    if (type === 'soft') {
      osc.frequency.setValueAtTime(800, now)
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04)
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
      osc.start(now); osc.stop(now + 0.04)
    } else {
      osc.frequency.setValueAtTime(1200, now)
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.03)
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)
      osc.start(now); osc.stop(now + 0.03)
    }
  } catch (e) {}
}

export default function useClickSound() {
  useEffect(() => {
    const handler = (e) => {
      const target = e.target.closest('button, a, [role="button"], input[type="checkbox"], select, .cursor-pointer')
      if (!target) return
      const isDestructive = target.classList.contains('text-red-400') || target.classList.contains('text-red-500')
      playClick(isDestructive ? 'soft' : 'default')
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
}
