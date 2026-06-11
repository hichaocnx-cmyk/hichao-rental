import { useEffect, useRef, useState, useCallback } from 'react'

// ขันเงิน — หิวตลอดเวลา เรียกนิจให้อาหาร
const MSGS = [
  'นิจจจ หิวแล้ว!! 🍚', 'นิจ! ให้ข้าวด้วยนะ!', 'หิวมากเลยนิจ~ 😿',
  'นิจจ อาหารหมดแล้ว 🥺', 'เมื่อไหร่จะได้กินข้าว...', 'นิจจจจ!!! 🐟',
  'หิวแล้วนะ อย่าลืมฉันนะนิจ', 'ขันเงินหิวมาก~ ให้ข้าวด้วย 🍛',
  'นิจจ ท้องร้องแล้ว 😩', 'ปลาอยู่ไหนนะ 🐟', 'นิจจ หิวววว!!',
  'ให้อาหารขันเงินด้วยนะนิจ~',
]
const REACT_EMOJIS = ['😸','🐟','✨','💕','🍚','😋','🥰','🐾']
const S = { WALK:'walk', RUN:'run', SIT:'sit', SLEEP:'sleep', REACT:'react', TEASE:'tease', MEOW:'meow' }

// ─── Persian Cat SVG with walking legs ──────────────────────────────────────
function PersianCat({ state, flip, blinking, tailAngle, legFrame }) {
  const eyeRy   = blinking || state === S.SLEEP ? 0.8 : 9
  const pupilRy = blinking || state === S.SLEEP ? 0.8 : 7
  const ta      = tailAngle || 0
  const walking = state === S.WALK || state === S.RUN || state === S.TEASE

  // leg positions: alternate frame 0/1
  const lf = legFrame % 2
  const leftLegY  = walking ? (lf === 0 ? 72 : 76) : 75
  const rightLegY = walking ? (lf === 0 ? 76 : 72) : 75
  const leftLegX  = walking ? (lf === 0 ? 28 : 30) : 29
  const rightLegX = walking ? (lf === 0 ? 52 : 50) : 51

  return (
    <svg width="80" height="88" viewBox="0 0 80 88"
      style={{ transform: flip ? 'scaleX(-1)' : 'none', overflow:'visible', display:'block' }}>
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
        <filter id="nc-sh"><feDropShadow dx="1" dy="3" stdDeviation="3" floodOpacity="0.14"/></filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx="40" cy="85" rx="20" ry="4" fill="rgba(0,0,0,0.07)"/>

      {/* tail */}
      <path d={`M56,60 Q${70+Math.sin(ta)*9},${52+Math.cos(ta)*7} ${66+Math.sin(ta)*11},${40+Math.cos(ta)*5}`}
        fill="none" stroke="#e8d8d0" strokeWidth="10" strokeLinecap="round" filter="url(#nc-sh)"/>
      <path d={`M56,60 Q${70+Math.sin(ta)*9},${52+Math.cos(ta)*7} ${66+Math.sin(ta)*11},${40+Math.cos(ta)*5}`}
        fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.5"/>

      {/* ── LEGS ── */}
      {/* back legs (always visible, less detail) */}
      <ellipse cx="32" cy={leftLegY+3}  rx="7" ry="5" fill="#e6d3ca" stroke="#d8c8be" strokeWidth="0.8"/>
      <ellipse cx="50" cy={rightLegY+3} rx="7" ry="5" fill="#e6d3ca" stroke="#d8c8be" strokeWidth="0.8"/>

      {/* front legs — animated */}
      <rect x={leftLegX-5}  y={leftLegY-10}  width="10" height={walking?16:14} rx="5" fill="#ede0d8" stroke="#d8c8be" strokeWidth="0.8"/>
      <rect x={rightLegX-5} y={rightLegY-10} width="10" height={walking?16:14} rx="5" fill="#ede0d8" stroke="#d8c8be" strokeWidth="0.8"/>

      {/* front paws */}
      <ellipse cx={leftLegX}  cy={leftLegY+5}  rx="7" ry="5.5" fill="#ede0d8" stroke="#d8c8be" strokeWidth="0.8"/>
      <ellipse cx={rightLegX} cy={rightLegY+5} rx="7" ry="5.5" fill="#ede0d8" stroke="#d8c8be" strokeWidth="0.8"/>

      {/* toe beans */}
      {[[-2.5,1],[0,2],[2.5,1]].map(([dx,dy],i)=>(
        <g key={i}>
          <circle cx={leftLegX+dx}  cy={leftLegY+4+dy}  r="1.7" fill="#ffb8b8" opacity="0.5"/>
          <circle cx={rightLegX+dx} cy={rightLegY+4+dy} r="1.7" fill="#ffb8b8" opacity="0.5"/>
        </g>
      ))}

      {/* body */}
      <ellipse cx="40" cy="56" rx="22" ry="18" fill="url(#nc-fur)" filter="url(#nc-sh)"/>
      <path d="M24,48 Q28,42 35,46" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <path d="M44,44 Q50,40 55,46" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>

      {/* head */}
      <circle cx="40" cy="28" r="22" fill="url(#nc-fur)" filter="url(#nc-sh)"/>
      <path d="M20,22 Q24,14 31,19" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.38"/>
      <path d="M49,19 Q55,14 60,22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.38"/>
      <path d="M28,13 Q35,8  44,11"  fill="none" stroke="white" strokeWidth="2"   strokeLinecap="round" opacity="0.35"/>

      {/* ears */}
      <path d="M20,14 L13,0  L28,8"  fill="#ede0d8" stroke="#d8c8be" strokeWidth="1"/>
      <path d="M60,14 L67,0  L52,8"  fill="#ede0d8" stroke="#d8c8be" strokeWidth="1"/>
      <path d="M20,12 L14,2  L27,8"  fill="white"   opacity="0.4"/>
      <path d="M60,12 L66,2  L53,8"  fill="white"   opacity="0.4"/>
      <path d="M20,11 L15,3  L26,8"  fill="#ffb8b8"  opacity="0.55"/>
      <path d="M60,11 L65,3  L54,8"  fill="#ffb8b8"  opacity="0.55"/>

      {/* eyes */}
      <ellipse cx="29" cy="30" rx="8.5" ry={eyeRy}  fill="url(#nc-eye)"/>
      <ellipse cx="29" cy="30" rx="5.5" ry={pupilRy} fill="#120900"/>
      {!blinking && state!==S.SLEEP && <>
        <circle cx="26" cy="27" r="2.2" fill="white" opacity="0.9"/>
        <circle cx="31" cy="33" r="1"   fill="white" opacity="0.5"/>
      </>}
      <ellipse cx="51" cy="30" rx="8.5" ry={eyeRy}  fill="url(#nc-eye)"/>
      <ellipse cx="51" cy="30" rx="5.5" ry={pupilRy} fill="#120900"/>
      {!blinking && state!==S.SLEEP && <>
        <circle cx="48" cy="27" r="2.2" fill="white" opacity="0.9"/>
        <circle cx="53" cy="33" r="1"   fill="white" opacity="0.5"/>
      </>}

      {/* nose */}
      <path d="M37,41 L40,37.5 L43,41 Q40,43.5 37,41 Z" fill="#ff8fa3"/>
      <line x1="40" y1="43.5" x2="40" y2="46" stroke="#d46080" strokeWidth="0.8"/>
      <path d="M37,46 Q40,49 43,46" fill="none" stroke="#c06080" strokeWidth="1.2" strokeLinecap="round"/>

      {/* whiskers */}
      {[37,41,45].map((y,i)=>(
        <g key={i}>
          <line x1="5"  y1={y-i*0.5} x2="27" y2={y} stroke="white" strokeWidth="1.1" opacity="0.8"/>
          <line x1="75" y1={y-i*0.5} x2="53" y2={y} stroke="white" strokeWidth="1.1" opacity="0.8"/>
        </g>
      ))}

      {/* chest fluff */}
      <path d="M28,48 Q40,44 52,48 Q48,56 32,56 Z" fill="white" opacity="0.38"/>
    </svg>
  )
}

// ─── Speech bubble ────────────────────────────────────────────────────────────
function Bubble({ text, flip }) {
  return (
    <div style={{
      position:'absolute', bottom:86, left:flip?'auto':-8, right:flip?-8:'auto',
      background:'white', borderRadius:12, padding:'5px 10px',
      fontSize:12, fontWeight:600, color:'#374151', whiteSpace:'nowrap',
      boxShadow:'0 2px 12px rgba(0,0,0,0.13)', border:'1.5px solid #f3e8e0',
      animation:'ncBubble .25s ease-out', zIndex:1,
    }}>
      {text}
      <div style={{
        position:'absolute', bottom:-7, left:flip?'auto':20, right:flip?20:'auto',
        width:0, height:0,
        borderLeft:'6px solid transparent', borderRight:'6px solid transparent',
        borderTop:'7px solid white',
      }}/>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function NekoCat() {
  const [visible,  setVisible]  = useState(true)
  const [pos,      setPos]      = useState({ x: 160, y: 200 })
  const [flip,     setFlip]     = useState(false)
  const [catState, setCatState] = useState(S.WALK)
  const [blink,    setBlink]    = useState(false)
  const [tail,     setTail]     = useState(0)
  const [legFrame, setLegFrame] = useState(0)
  const [msg,      setMsg]      = useState(null)
  const [reactEmoji,setReact]   = useState(null)
  const [dragging, setDragging] = useState(false)

  const posRef     = useRef({ x: 160, y: 200 })
  const stateRef   = useRef(S.WALK)
  const flipRef    = useRef(false)
  const targetRef  = useRef({ x: 400, y: 300 })
  const mouseRef   = useRef({ x: -999, y: -999 })
  const dodgeRef   = useRef(0)
  const timers     = useRef({})
  const rafRef     = useRef(null)
  const isDragging = useRef(false)
  const dragOffset = useRef({ x:0, y:0 })

  const safeX = x => Math.max(10, Math.min((window.innerWidth  || 1200) - 90, x))
  const safeY = y => Math.max(60, Math.min((window.innerHeight || 800)  - 95, y))
  const dist  = (a,b) => Math.hypot(a.x-b.x, a.y-b.y)
  const rndMsg    = () => MSGS[Math.floor(Math.random()*MSGS.length)]
  const rndTarget = useCallback(() => ({
    x: safeX(80  + Math.random() * ((window.innerWidth  || 1200) - 160)),
    y: safeY(100 + Math.random() * ((window.innerHeight || 800)  - 160)),
  }), [])

  const showMsg = useCallback((text, dur=2600) => {
    setMsg(text)
    clearTimeout(timers.current.msg)
    timers.current.msg = setTimeout(()=>setMsg(null), dur)
  }, [])

  const changeState = useCallback(s => {
    stateRef.current = s
    setCatState(s)
  }, [])

  // leg step timer (slower = 450ms per step)
  useEffect(() => {
    const leg = setInterval(() => {
      if (stateRef.current===S.WALK || stateRef.current===S.RUN || stateRef.current===S.TEASE) {
        setLegFrame(f => f+1)
      }
    }, stateRef.current===S.RUN ? 160 : 700)
    return () => clearInterval(leg)
  }, [catState])

  // tail swish
  useEffect(() => {
    let t = 0
    const sw = setInterval(()=>{ t+=0.06; setTail(t) }, 70)
    return () => clearInterval(sw)
  }, [])

  // blink
  useEffect(() => {
    const bl = setInterval(()=>{
      setBlink(true); setTimeout(()=>setBlink(false), 130)
    }, 3500 + Math.random()*2000)
    return () => clearInterval(bl)
  }, [])

  // mouse track
  useEffect(() => {
    const mv = e => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', mv)
    return () => window.removeEventListener('mousemove', mv)
  }, [])

  // drag
  useEffect(() => {
    const onMove = e => {
      if (!isDragging.current) return
      const nx = safeX(e.clientX - dragOffset.current.x)
      const ny = safeY(e.clientY - dragOffset.current.y)
      posRef.current = { x:nx, y:ny }
      setPos({ x:nx, y:ny })
    }
    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        setDragging(false)
        changeState(S.WALK)
        targetRef.current = rndTarget()
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [changeState, rndTarget])

  // behavior scheduler
  const scheduleBehavior = useCallback(() => {
    clearTimeout(timers.current.behav)
    timers.current.behav = setTimeout(() => {
      if (isDragging.current || stateRef.current===S.REACT) return scheduleBehavior()
      const pick = ['walk','walk','run','sit','meow','meow','meow'][Math.floor(Math.random()*7)]
      if (pick==='run') {
        changeState(S.RUN); targetRef.current = rndTarget()
        setTimeout(()=>{ if(stateRef.current===S.RUN) changeState(S.WALK) }, 1800)
      } else if (pick==='sit') {
        changeState(S.SIT); showMsg(rndMsg(), 2600)
        setTimeout(()=>changeState(S.WALK), 3500)
      } else if (pick==='meow') {
        changeState(S.MEOW); showMsg(rndMsg(), 2600)
        setTimeout(()=>changeState(S.WALK), 2800)
      } else {
        targetRef.current = rndTarget(); changeState(S.WALK)
      }
      scheduleBehavior()
    }, 3500 + Math.random()*5000)
  }, [changeState, rndTarget, showMsg])

  // sleep after idle
  useEffect(() => {
    let sl
    const reset = () => {
      clearTimeout(sl)
      if (stateRef.current===S.SLEEP) { changeState(S.WALK); setMsg(null); targetRef.current = rndTarget() }
      sl = setTimeout(()=>{ changeState(S.SLEEP); showMsg('zzz 💤',99999) }, 20000)
    }
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown',   reset)
    reset()
    return () => { window.removeEventListener('mousemove',reset); window.removeEventListener('keydown',reset); clearTimeout(sl) }
  }, [changeState, rndTarget, showMsg])

  // main RAF loop
  useEffect(() => {
    scheduleBehavior(); targetRef.current = rndTarget()
    const loop = () => {
      if (isDragging.current) { rafRef.current = requestAnimationFrame(loop); return }
      const p  = posRef.current
      const t  = targetRef.current
      const m  = mouseRef.current
      const st = stateRef.current
      if (st===S.SLEEP||st===S.SIT||st===S.REACT||st===S.MEOW) { rafRef.current=requestAnimationFrame(loop); return }

      const dMouse = dist(p, m)
      if (dMouse < 100 && st!==S.TEASE && dodgeRef.current < 5) {
        changeState(S.TEASE)
        setTimeout(()=>{ if(stateRef.current===S.TEASE) changeState(S.WALK) }, 2000)
      }

      const spd = st===S.RUN ? 4.5 : st===S.TEASE ? 2.0 : 0.25  // very slow walk
      let tx=t.x, ty=t.y
      if (st===S.TEASE) {
        const ang = Math.atan2(p.y-m.y, p.x-m.x)
        tx = safeX(p.x + Math.cos(ang)*130)
        ty = safeY(p.y + Math.sin(ang)*130)
        dodgeRef.current++
      }

      const d = dist(p, {x:tx, y:ty})
      if (d < 3) { if(st===S.WALK||st===S.RUN) targetRef.current=rndTarget(); rafRef.current=requestAnimationFrame(loop); return }

      const dx = (tx-p.x)/d, dy = (ty-p.y)/d
      const nx = safeX(p.x + dx*Math.min(spd,d))
      const ny = safeY(p.y + dy*Math.min(spd,d))
      if ((dx<0)!==flipRef.current) { flipRef.current=dx<0; setFlip(dx<0) }
      posRef.current = {x:nx,y:ny}; setPos({x:nx,y:ny})
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(rafRef.current); Object.values(timers.current).forEach(clearTimeout) }
  }, [scheduleBehavior, rndTarget, changeState])

  const onMouseDown = useCallback(e => {
    e.preventDefault(); e.stopPropagation()
    isDragging.current = true
    setDragging(true)
    dragOffset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y }
    changeState(S.REACT)
    showMsg('ว้าย!! 😹', 800)
  }, [changeState, showMsg])

  const onClick = useCallback(e => {
    e.stopPropagation()
    if (isDragging.current) return
    if (catState===S.SLEEP) { changeState(S.WALK); setMsg(null); return }
    dodgeRef.current = 0
    changeState(S.REACT)
    setReact(REACT_EMOJIS[Math.floor(Math.random()*REACT_EMOJIS.length)])
    showMsg(rndMsg(), 2200)
    setTimeout(()=>{ setReact(null); changeState(S.WALK); targetRef.current = rndTarget() }, 900)
  }, [catState, changeState, rndTarget, showMsg])

  if (!visible) return null

  const anim = dragging ? 'ncJump .4s ease-out'
             : catState===S.WALK  ? 'ncWalk 1.8s ease-in-out infinite alternate'
             : catState===S.RUN   ? 'ncRun  .35s ease-in-out infinite alternate'
             : catState===S.REACT ? 'ncJump .4s ease-out'
             : 'ncBreath 3s ease-in-out infinite'

  return (
    <div
      style={{ position:'fixed', left:pos.x, top:pos.y, zIndex:9999, userSelect:'none',
               cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown} onClick={onClick} title="ขันเงิน 🐾">

      {msg && <Bubble text={msg} flip={flip}/>}

      {reactEmoji && (
        <div style={{ position:'absolute', top:-44, left:'50%', transform:'translateX(-50%)',
          fontSize:24, animation:'ncFloat .9s ease-out forwards', pointerEvents:'none' }}>
          {reactEmoji}
        </div>
      )}

      <div style={{ animation: anim }}>
        <PersianCat state={catState} flip={flip} blinking={blink} tailAngle={tail} legFrame={legFrame}/>
      </div>

      <div onClick={e=>{e.stopPropagation();setVisible(false)}} className="nc-x"
        style={{ position:'absolute', top:-6, right:-6, width:15, height:15,
          borderRadius:'50%', background:'#e2e8f0', color:'#94a3b8',
          fontSize:9, display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', opacity:0, transition:'opacity .2s' }}>✕</div>

      <style>{`
        @keyframes ncWalk   { from{transform:translateY(0) rotate(-.5deg)} to{transform:translateY(-2px) rotate(.5deg)} }
        @keyframes ncRun    { from{transform:translateY(0) rotate(-2deg)}  to{transform:translateY(-6px) rotate(2deg)} }
        @keyframes ncBreath { 0%,100%{transform:scale(1)} 50%{transform:scale(1.02)} }
        @keyframes ncJump   { 0%{transform:translateY(0)} 35%{transform:translateY(-16px) scale(1.07)} 100%{transform:translateY(0)} }
        @keyframes ncFloat  { 0%{opacity:1;transform:translateX(-50%) translateY(0)} 100%{opacity:0;transform:translateX(-50%) translateY(-28px)} }
        @keyframes ncBubble { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
        div:hover > .nc-x   { opacity:1 !important }
      `}</style>
    </div>
  )
}
