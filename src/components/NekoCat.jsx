import { useEffect, useRef, useState, useCallback } from 'react'

/* ─── Pixel-art cat frames ─────────────────────────────────────────────────
   Each frame is a tiny SVG drawn inline.  States: walk, sit, sleep, react  */

const SPEED      = 1.8   // px per frame when walking
const FOLLOW_R   = 180   // px radius — cat chases cursor inside this range
const FRAME_MS   = 140   // animation frame interval

// SVG cat body builder
function CatSVG({ frame = 0, state = 'walk', flip = false, sleeping = false }) {
  const earL  = state === 'sit' ? 'M3,6 L6,1 L9,6' : 'M3,7 L6,2 L9,7'
  const earR  = state === 'sit' ? 'M15,6 L18,1 L21,6' : 'M15,7 L18,2 L21,7'
  const body  = state === 'sit'
    ? 'M6,22 Q12,26 18,22 L20,14 Q12,10 4,14 Z'
    : 'M4,20 Q12,24 20,20 L22,13 Q12,9 2,13 Z'
  const tailX = state === 'sit' ? [22, 28, 26] : frame % 2 === 0 ? [20, 28, 22] : [20, 26, 24]
  const legY  = state === 'sit' ? 24 : frame % 2 === 0 ? 22 : 20
  const eyeOpen = !sleeping
  const mood  = state === 'react' ? '∪' : state === 'sit' ? '‿' : '-'

  return (
    <svg
      width="36" height="36" viewBox="0 0 36 36"
      style={{ transform: flip ? 'scaleX(-1)' : 'none', display: 'block', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.18))' }}
    >
      {/* tail */}
      <polyline points={`${tailX[0]},${legY} ${tailX[1]},${legY - 8} ${tailX[2]},${legY - 14}`}
        fill="none" stroke="#f4a261" strokeWidth="3" strokeLinecap="round" />
      {/* body */}
      <path d={body} fill="#ffd8a8" stroke="#e07b39" strokeWidth="1.2" />
      {/* head */}
      <circle cx="12" cy="12" r="9" fill="#ffd8a8" stroke="#e07b39" strokeWidth="1.2" />
      {/* ears */}
      <polyline points={earL} fill="#ffd8a8" stroke="#e07b39" strokeWidth="1.4" strokeLinejoin="round" />
      <polyline points={earR} fill="#ffd8a8" stroke="#e07b39" strokeWidth="1.4" strokeLinejoin="round" />
      {/* inner ears */}
      <polyline points="4.5,6.5 6.5,3 8.5,6.5" fill="#ffb3ba" stroke="none" />
      <polyline points="15.5,6.5 17.5,3 19.5,6.5" fill="#ffb3ba" stroke="none" />
      {/* eyes */}
      {eyeOpen ? (
        <>
          <ellipse cx="9" cy="12" rx="1.8" ry={state === 'react' ? 2.2 : 1.4} fill="#333" />
          <ellipse cx="15" cy="12" rx="1.8" ry={state === 'react' ? 2.2 : 1.4} fill="#333" />
          <circle cx="9.7" cy="11.3" r="0.5" fill="white" />
          <circle cx="15.7" cy="11.3" r="0.5" fill="white" />
        </>
      ) : (
        <>
          <path d="M7.5,12 Q9,11 10.5,12" fill="none" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M13.5,12 Q15,11 16.5,12" fill="none" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
        </>
      )}
      {/* nose + mouth */}
      <ellipse cx="12" cy="14.5" rx="1" ry="0.7" fill="#e07b39" />
      <path d={`M12,15.2 Q${mood === '∪' ? '10,17 12,16.5 Q14,17 12,15.2' : mood === '‿' ? '10,16.5 12,15.5 Q14,16.5 12,15.2' : '10,15.8 12,15.2 Q14,15.8 12,15.2'}`}
        fill="none" stroke="#e07b39" strokeWidth="1" strokeLinecap="round" />
      {/* whiskers */}
      <line x1="3" y1="13.5" x2="8" y2="14" stroke="#e07b39" strokeWidth="0.8" opacity=".7" />
      <line x1="3" y1="15"   x2="8" y2="15" stroke="#e07b39" strokeWidth="0.8" opacity=".7" />
      <line x1="16" y1="14" x2="21" y2="13.5" stroke="#e07b39" strokeWidth="0.8" opacity=".7" />
      <line x1="16" y1="15" x2="21" y2="15"   stroke="#e07b39" strokeWidth="0.8" opacity=".7" />
      {/* legs */}
      {state !== 'sit' && (
        <>
          <rect x="6"  y={legY} width="4" height="5" rx="2" fill="#ffd8a8" stroke="#e07b39" strokeWidth="1" />
          <rect x="14" y={frame % 2 === 0 ? legY - 2 : legY} width="4" height="5" rx="2" fill="#ffd8a8" stroke="#e07b39" strokeWidth="1" />
        </>
      )}
      {state === 'sit' && (
        <>
          <ellipse cx="8"  cy="25" rx="3.5" ry="2.5" fill="#ffd8a8" stroke="#e07b39" strokeWidth="1" />
          <ellipse cx="16" cy="25" rx="3.5" ry="2.5" fill="#ffd8a8" stroke="#e07b39" strokeWidth="1" />
        </>
      )}
    </svg>
  )
}

const REACTIONS = ['💕','🐟','✨','😹','🎀','💫']

export default function NekoCat() {
  const [pos,     setPos]     = useState({ x: 80, y: 0 })
  const [flip,    setFlip]    = useState(false)
  const [state,   setState]   = useState('walk')   // walk | sit | sleep | react
  const [frame,   setFrame]   = useState(0)
  const [emoji,   setEmoji]   = useState(null)
  const [show,    setShow]    = useState(true)

  const mouse   = useRef({ x: -999, y: -999 })
  const posRef  = useRef({ x: 80, y: 0 })
  const stateRef = useRef('walk')
  const flipRef  = useRef(false)
  const sitTimer = useRef(null)
  const sleepTimer = useRef(null)
  const emojiTimer = useRef(null)

  // track mouse
  useEffect(() => {
    const mv = (e) => { mouse.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', mv)
    return () => window.removeEventListener('mousemove', mv)
  }, [])

  // reset idle timers
  const resetIdle = useCallback(() => {
    clearTimeout(sitTimer.current)
    clearTimeout(sleepTimer.current)
    sitTimer.current   = setTimeout(() => { stateRef.current = 'sit';   setState('sit')   }, 4000)
    sleepTimer.current = setTimeout(() => { stateRef.current = 'sleep'; setState('sleep') }, 9000)
  }, [])

  // main loop
  useEffect(() => {
    resetIdle()
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 2)

      const winW  = window.innerWidth
      const winH  = window.innerHeight
      const catY  = winH - 68   // fixed near bottom
      const cur   = mouse.current
      const p     = posRef.current
      const st    = stateRef.current

      const dx    = cur.x - p.x
      const dy    = cur.y - catY
      const dist  = Math.sqrt(dx * dx + dy * dy)

      if (st === 'react') return

      if (dist < FOLLOW_R) {
        // chase cursor
        if (st !== 'walk') { stateRef.current = 'walk'; setState('walk'); resetIdle() }
        const speed = Math.min(SPEED * 1.6, dist)
        const nx = p.x + (dx / dist) * speed
        const newFlip = dx < 0
        posRef.current = { x: Math.max(20, Math.min(winW - 50, nx)), y: catY }
        setPos({ ...posRef.current })
        if (newFlip !== flipRef.current) { flipRef.current = newFlip; setFlip(newFlip) }
        resetIdle()
      } else if (st === 'walk') {
        // wander
        const dir  = flipRef.current ? -1 : 1
        const nx   = p.x + dir * SPEED
        if (nx < 20 || nx > winW - 50) {
          flipRef.current = !flipRef.current
          setFlip(flipRef.current)
        }
        posRef.current = { x: Math.max(20, Math.min(winW - 50, nx)), y: catY }
        setPos({ ...posRef.current })
      }
    }, FRAME_MS)

    return () => { clearInterval(interval); clearTimeout(sitTimer.current); clearTimeout(sleepTimer.current) }
  }, [resetIdle])

  // poke / click
  const poke = useCallback((e) => {
    e.stopPropagation()
    clearTimeout(emojiTimer.current)
    stateRef.current = 'react'
    setState('react')
    const r = REACTIONS[Math.floor(Math.random() * REACTIONS.length)]
    setEmoji(r)
    emojiTimer.current = setTimeout(() => {
      stateRef.current = 'walk'
      setState('walk')
      setEmoji(null)
      resetIdle()
    }, 900)
  }, [resetIdle])

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        bottom: 10,
        zIndex: 9999,
        userSelect: 'none',
        cursor: 'pointer',
        transition: stateRef.current === 'react' ? 'none' : 'left 0.14s linear',
      }}
      onClick={poke}
      title="จิ้มแมว 🐱"
    >
      {/* reaction bubble */}
      {emoji && (
        <div style={{
          position: 'absolute', top: -36, left: '50%', transform: 'translateX(-50%)',
          fontSize: 22, animation: 'nekoFloat .9s ease-out forwards',
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          {emoji}
        </div>
      )}

      {/* zzz when sleeping */}
      {state === 'sleep' && (
        <div style={{
          position: 'absolute', top: -28, left: 20,
          fontSize: 13, color: '#94a3b8', fontWeight: 700, letterSpacing: 1,
          animation: 'nekoZzz 1.4s ease-in-out infinite',
          pointerEvents: 'none',
        }}>
          z z z
        </div>
      )}

      {/* body bounce */}
      <div style={{
        animation: state === 'walk' ? 'nekoBounce .28s ease-in-out infinite alternate'
                 : state === 'react' ? 'nekoJump .3s ease-out'
                 : 'none',
      }}>
        <CatSVG
          frame={frame}
          state={state === 'sleep' ? 'sit' : state}
          flip={flip}
          sleeping={state === 'sleep'}
        />
      </div>

      {/* hide button */}
      <div
        onClick={(e) => { e.stopPropagation(); setShow(false) }}
        style={{
          position: 'absolute', top: -8, right: -8,
          width: 14, height: 14, borderRadius: '50%',
          background: '#e2e8f0', color: '#94a3b8',
          fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', lineHeight: 1,
          opacity: 0, transition: 'opacity .2s',
        }}
        className="neko-close"
      >✕</div>

      <style>{`
        @keyframes nekoBounce { from { transform: translateY(0) } to { transform: translateY(-3px) } }
        @keyframes nekoJump   { 0% { transform: translateY(0) } 40% { transform: translateY(-14px) } 100% { transform: translateY(0) } }
        @keyframes nekoFloat  { 0% { opacity:1; transform: translateX(-50%) translateY(0) } 100% { opacity:0; transform: translateX(-50%) translateY(-24px) } }
        @keyframes nekoZzz    { 0%,100% { opacity:.4; transform: translateY(0) } 50% { opacity:1; transform: translateY(-4px) } }
        div:hover > .neko-close { opacity: 1 !important }
      `}</style>
    </div>
  )
}
