import { useEffect, useRef, useState, useCallback } from 'react'

const MSGS = [
  'เหมิ้ว~ 🐾', 'เล่นด้วยกันสิ!', 'หิวแล้ว 🐟',
  'อย่าทำงานเลย~', 'มองฉันด้วยสิ! 👀', 'ลูบหัวหน่อยได้ไหม 🥺',
  'เหมิ้วๆ!!', 'โดดเดี่ยวมากเลย แง~', 'จิ้มฉันได้นะ~',
  'ฉันน่ารักไหม? 🥰', 'อย่าลืมฉันนะ!', 'เหมิ้ว! มาเล่นกัน~',
]
const REACT_EMOJIS = ['💕','🐟','✨','😸','🎀','💫','🐾','❤️']
const S = { WALK:'walk', RUN:'run', SIT:'sit', SLEEP:'sleep', REACT:'react', TEASE:'tease', MEOW:'meow' }
const SPEED = { walk: 1.4, run: 6.0, tease: 2.2 }

// ─── White Persian SVG ──────────────────────────────────────────────────────
function PersianCat({ state, flip, blinking, tailAngle }) {
  const eyeRy   = blinking || state === S.SLEEP ? 0.8 : 9
  const pupilRy = blinking || state === S.SLEEP ? 0.8 : 7
  const ta      = tailAngle || 0
  return (
    <svg width="80" height="80" viewBox="0 0 80 80"
      style={{ transform: flip ? 'scaleX(-1)' : 'none', overflow: 'visible', display: 'block' }}>
      <defs>
        <radialGradient id="nc-fur" cx="45%" cy="35%" r="55%">
          <stop offset="0%"   stopColor="#fffaf8"/>
          <stop offset="60%"  stopColor="#f5ebe4"/>
          <stop offset="100%" stopColor="#e6d3ca"/>
        </radialGradient>
        <radialGradient id="nc-eye" cx="35%" cy="28%" r="65%">
          <stop offset="0%"   stopColor="#fde68a"/>
          <stop offset="45%"  stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#92400e"/>
        </radialGradient>
        <filter id="nc-sh"><feDropShadow dx="1" dy="3" stdDeviation="3" floodOpacity="0.15"/></filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx="40" cy="78" rx="20" ry="4" fill="rgba(0,0,0,0.07)"/>

      {/* tail */}
      <path d={`M56,60 Q${70+Math.sin(ta)*9},${52+Math.cos(ta)*7} ${66+Math.sin(ta)*11},${40+Math.cos(ta)*5}`}
        fill="none" stroke="#e8d8d0" strokeWidth="10" strokeLinecap="round" filter="url(#nc-sh)"/>
      <path d={`M56,60 Q${70+Math.sin(ta)*9},${52+Math.cos(ta)*7} ${66+Math.sin(ta)*11},${40+Math.cos(ta)*5}`}
        fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.5"/>

      {/* body */}
      <ellipse cx="40" cy="60" rx="22" ry="18" fill="url(#nc-fur)" filter="url(#nc-sh)"/>
      <path d="M24,52 Q28,46 35,50" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
      <path d="M44,48 Q50,44 55,50" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>

      {/* head */}
      <circle cx="40" cy="30" r="22" fill="url(#nc-fur)" filter="url(#nc-sh)"/>
      <path d="M20,24 Q24,16 31,21" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.4"/>
      <path d="M49,21 Q55,16 60,24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.4"/>
      <path d="M28,15 Q35,10 44,13" fill="none" stroke="white" strokeWidth="2"   strokeLinecap="round" opacity="0.38"/>

      {/* ears */}
      <path d="M20,16 L13,2  L28,10" fill="#ede0d8" stroke="#d8c8be" strokeWidth="1"/>
      <path d="M60,16 L67,2  L52,10" fill="#ede0d8" stroke="#d8c8be" strokeWidth="1"/>
      <path d="M20,14 L14,4  L27,10" fill="white"   opacity="0.45"/>
      <path d="M60,14 L66,4  L53,10" fill="white"   opacity="0.45"/>
      <path d="M20,13 L15,5  L26,10" fill="#ffb8b8"  opacity="0.55"/>
      <path d="M60,13 L65,5  L54,10" fill="#ffb8b8"  opacity="0.55"/>

      {/* eyes */}
      <ellipse cx="29" cy="32" rx="8.5" ry={eyeRy}   fill="url(#nc-eye)"/>
      <ellipse cx="29" cy="32" rx="5.5" ry={pupilRy}  fill="#120900"/>
      {!blinking && state!==S.SLEEP && <><circle cx="26" cy="29" r="2.2" fill="white" opacity="0.9"/><circle cx="31" cy="35" r="1" fill="white" opacity="0.5"/></>}

      <ellipse cx="51" cy="32" rx="8.5" ry={eyeRy}   fill="url(#nc-eye)"/>
      <ellipse cx="51" cy="32" rx="5.5" ry={pupilRy}  fill="#120900"/>
      {!blinking && state!==S.SLEEP && <><circle cx="48" cy="29" r="2.2" fill="white" opacity="0.9"/><circle cx="53" cy="35" r="1" fill="white" opacity="0.5"/></>}

      {/* nose */}
      <path d="M37,43 L40,39.5 L43,43 Q40,45.5 37,43 Z" fill="#ff8fa3"/>
      <line x1="40" y1="45.5" x2="40" y2="48" stroke="#d46080" strokeWidth="0.8"/>
      <path d="M37,48 Q40,51 43,48" fill="none" stroke="#c06080" strokeWidth="1.2" strokeLinecap="round"/>

      {/* whiskers */}
      {[39,43,47].map((y,i) => (
        <g key={i}>
          <line x1="5"  y1={y-i*0.5} x2="27" y2={y} stroke="white" strokeWidth="1.1" opacity="0.8"/>
          <line x1="75" y1={y-i*0.5} x2="53" y2={y} stroke="white" strokeWidth="1.1" opacity="0.8"/>
        </g>
      ))}

      {/* chest fluff */}
      <path d="M28,50 Q40,46 52,50 Q48,58 32,58 Z" fill="white" opacity="0.4"/>

      {/* paws */}
      <ellipse cx="30" cy="75" rx="9"   ry="5.5" fill="#ede0d8" stroke="#d8c8be" strokeWidth="0.8"/>
      <ellipse cx="50" cy="75" rx="9"   ry="5.5" fill="#ede0d8" stroke="#d8c8be" strokeWidth="0.8"/>
      {[[-3,1,0],[0,2,0],[3,1,0]].map(([dx,dy],i) => (
        <g key={i}>
          <circle cx={30+dx} cy={75+dy} r="2" fill="#ffb8b8" opacity="0.45"/>
          <circle cx={50+dx} cy={75+dy} r="2" fill="#ffb8b8" opacity="0.45"/>
        </g>
      ))}
    </svg>
  )
}

// ─── Speech bubble ──────────────────────────────────────────────────────────
function Bubble({ text, flip }) {
  return (
    <div style={{
      position:'absolute', bottom:78, left: flip ? 'auto' : -8, right: flip ? -8 : 'auto',
      background:'white', borderRadius:12, padding:'5px 10px',
      fontSize:12, fontWeight:600, color:'#374151', whiteSpace:'nowrap',
      boxShadow:'0 2px 12px rgba(0,0,0,0.13)',
      border:'1.5px solid #f3e8e0',
      animation:'ncBubble .25s ease-out',
      zIndex:1,
    }}>
      {text}
      <div style={{
        position:'absolute', bottom:-7, left: flip ? 'auto' : 20, right: flip ? 20 : 'auto',
        width:0, height:0,
        borderLeft:'6px solid transparent', borderRight:'6px solid transparent',
        borderTop:'7px solid white',
        filter:'drop-shadow(0 1px 1px rgba(0,0,0,0.08))',
      }}/>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function NekoCat() {
  const [visible, setVisible]   = useState(true)
  const [pos,     setPos]       = useState({ x: 160, y: 200 })
  const [flip,    setFlip]      = useState(false)
  const [catState,setCatState]  = useState(S.WALK)
  const [blink,   setBlink]     = useState(false)
  const [tail,    setTail]      = useState(0)
  const [msg,     setMsg]       = useState(null)
  const [reactEmoji, setReact]  = useState(null)
  const [bodyAnim, setBodyAnim] = useState('nc-walk')

  const posRef    = useRef({ x: 160, y: 200 })
  const stateRef  = useRef(S.WALK)
  const flipRef   = useRef(false)
  const targetRef = useRef({ x: 400, y: 300 })
  const mouseRef  = useRef({ x: -999, y: -999 })
  const dodgeRef  = useRef(0)
  const timers    = useRef({})
  const rafRef    = useRef(null)
  const lastBehav = useRef(0)

  // helpers
  const safeX  = (x) => Math.max(10,  Math.min((window.innerWidth  || 1200) - 90, x))
  const safeY  = (y) => Math.max(80,  Math.min((window.innerHeight || 800)  - 90, y))
  const dist   = (a,b) => Math.hypot(a.x-b.x, a.y-b.y)
  const rndMsg = ()   => MSGS[Math.floor(Math.random()*MSGS.length)]
  const rndTarget = useCallback(() => ({
    x: safeX(80  + Math.random() * ((window.innerWidth  || 1200) - 160)),
    y: safeY(100 + Math.random() * ((window.innerHeight || 800)  - 180)),
  }), [])

  const showMsg = useCallback((text, dur=2200) => {
    setMsg(text)
    clearTimeout(timers.current.msg)
    timers.current.msg = setTimeout(() => setMsg(null), dur)
  }, [])

  const changeState = useCallback((s) => {
    stateRef.current = s
    setCatState(s)
    setBodyAnim(s === S.RUN ? 'nc-run' : s === S.WALK ? 'nc-walk' : 'none')
  }, [])

  // mouse tracking
  useEffect(() => {
    const mv = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', mv)
    return () => window.removeEventListener('mousemove', mv)
  }, [])

  // blink timer
  useEffect(() => {
    const blinker = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 120)
    }, 3200 + Math.random()*2000)
    return () => clearInterval(blinker)
  }, [])

  // tail swish
  useEffect(() => {
    let t = 0
    const swish = setInterval(() => { t += 0.08; setTail(t) }, 60)
    return () => clearInterval(swish)
  }, [])

  // random behavior scheduler
  const scheduleBehavior = useCallback(() => {
    clearTimeout(timers.current.behav)
    const delay = 4000 + Math.random() * 5000
    timers.current.behav = setTimeout(() => {
      if (stateRef.current === S.REACT) return scheduleBehavior()
      const behaviors = ['walk','walk','walk','run','sit','meow','meow']
      const pick = behaviors[Math.floor(Math.random()*behaviors.length)]
      if (pick === 'run') {
        changeState(S.RUN)
        targetRef.current = rndTarget()
        setTimeout(() => { if(stateRef.current===S.RUN) changeState(S.WALK) }, 2200)
      } else if (pick === 'sit') {
        changeState(S.SIT)
        showMsg(rndMsg(), 2500)
        setTimeout(() => changeState(S.WALK), 3500)
      } else if (pick === 'meow') {
        changeState(S.MEOW)
        showMsg(rndMsg(), 2200)
        setTimeout(() => changeState(S.WALK), 2400)
      } else {
        targetRef.current = rndTarget()
        changeState(S.WALK)
      }
      scheduleBehavior()
    }, delay)
  }, [changeState, rndTarget, showMsg])

  // sleep after long idle
  useEffect(() => {
    let sleepT
    const reset = () => {
      clearTimeout(sleepT)
      if (stateRef.current === S.SLEEP) { changeState(S.WALK); targetRef.current = rndTarget() }
      sleepT = setTimeout(() => { changeState(S.SLEEP); showMsg('zzz 💤', 99999) }, 18000)
    }
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown',   reset)
    reset()
    return () => { window.removeEventListener('mousemove', reset); window.removeEventListener('keydown', reset); clearTimeout(sleepT) }
  }, [changeState, rndTarget, showMsg])

  // main movement RAF
  useEffect(() => {
    scheduleBehavior()
    targetRef.current = rndTarget()

    const loop = () => {
      const p    = posRef.current
      const t    = targetRef.current
      const m    = mouseRef.current
      const st   = stateRef.current
      const dMouse = dist(p, m)

      if (st === S.SLEEP || st === S.SIT || st === S.REACT || st === S.MEOW) {
        rafRef.current = requestAnimationFrame(loop); return
      }

      // tease: dodge cursor when close
      if (dMouse < 90 && st !== S.TEASE && dodgeRef.current < 5) {
        changeState(S.TEASE)
        setTimeout(() => { if(stateRef.current===S.TEASE) changeState(S.WALK) }, 1800)
      }

      let spd = SPEED[st] || SPEED.walk
      let tx = t.x, ty = t.y

      if (st === S.TEASE) {
        // run away from cursor
        const angle = Math.atan2(p.y - m.y, p.x - m.x)
        tx = safeX(p.x + Math.cos(angle) * 120)
        ty = safeY(p.y + Math.sin(angle) * 120)
        spd = SPEED.tease
        dodgeRef.current++
      }

      const d = dist(p, { x: tx, y: ty })
      if (d < 4) {
        if (st === S.WALK || st === S.RUN) { targetRef.current = rndTarget() }
        rafRef.current = requestAnimationFrame(loop); return
      }

      const dx = (tx - p.x) / d
      const dy = (ty - p.y) / d
      const nx = safeX(p.x + dx * Math.min(spd, d))
      const ny = safeY(p.y + dy * Math.min(spd, d))

      const newFlip = dx < 0
      if (newFlip !== flipRef.current) { flipRef.current = newFlip; setFlip(newFlip) }

      posRef.current = { x: nx, y: ny }
      setPos({ x: nx, y: ny })

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(rafRef.current); Object.values(timers.current).forEach(clearTimeout) }
  }, [scheduleBehavior, rndTarget, changeState])

  // click: poke
  const poke = useCallback((e) => {
    e.stopPropagation()
    if (catState === S.SLEEP) { changeState(S.WALK); setMsg(null); return }
    dodgeRef.current = 0
    changeState(S.REACT)
    const em = REACT_EMOJIS[Math.floor(Math.random()*REACT_EMOJIS.length)]
    setReact(em)
    showMsg(rndMsg(), 1800)
    setTimeout(() => { setReact(null); changeState(S.WALK); targetRef.current = rndTarget() }, 900)
  }, [catState, changeState, rndTarget, showMsg])

  if (!visible) return null

  return (
    <div style={{ position:'fixed', left: pos.x, top: pos.y, zIndex:9999, userSelect:'none', cursor:'pointer' }}
      onClick={poke} title="จิ้มแมว 🐱">

      {/* speech bubble */}
      {msg && <Bubble text={msg} flip={flip}/>}

      {/* react emoji */}
      {reactEmoji && (
        <div style={{
          position:'absolute', top:-40, left:'50%', transform:'translateX(-50%)',
          fontSize:24, animation:'ncFloat .9s ease-out forwards', pointerEvents:'none',
        }}>{reactEmoji}</div>
      )}

      {/* cat body with animation */}
      <div style={{ animation: bodyAnim === 'nc-walk' ? 'ncWalk .45s ease-in-out infinite alternate'
                              : bodyAnim === 'nc-run'  ? 'ncRun  .22s ease-in-out infinite alternate'
                              : catState === S.SIT || catState === S.SLEEP ? 'ncBreath 3s ease-in-out infinite'
                              : catState === S.REACT ? 'ncJump .4s ease-out'
                              : 'ncBreath 3s ease-in-out infinite' }}>
        <PersianCat state={catState} flip={flip} blinking={blink} tailAngle={tail}/>
      </div>

      {/* hide X */}
      <div onClick={e=>{e.stopPropagation();setVisible(false)}}
        style={{
          position:'absolute', top:-6, right:-6, width:15, height:15,
          borderRadius:'50%', background:'#e2e8f0', color:'#94a3b8',
          fontSize:9, display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', opacity:0, transition:'opacity .2s',
        }} className="nc-x">✕</div>

      <style>{`
        @keyframes ncWalk   { from{transform:translateY(0) rotate(-1deg)} to{transform:translateY(-4px) rotate(1deg)} }
        @keyframes ncRun    { from{transform:translateY(0) rotate(-2deg)} to{transform:translateY(-7px) rotate(2deg)} }
        @keyframes ncBreath { 0%,100%{transform:scale(1)} 50%{transform:scale(1.02)} }
        @keyframes ncJump   { 0%{transform:translateY(0)} 35%{transform:translateY(-18px) scale(1.08)} 100%{transform:translateY(0)} }
        @keyframes ncFloat  { 0%{opacity:1;transform:translateX(-50%) translateY(0)} 100%{opacity:0;transform:translateX(-50%) translateY(-28px)} }
        @keyframes ncBubble { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
        div:hover > .nc-x   { opacity:1 !important }
      `}</style>
    </div>
  )
}
