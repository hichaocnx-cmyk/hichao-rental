import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

// ขันเงิน — หิวตลอดเวลา เรียกนิจให้อาหาร
const MSGS = [
  'นิจจจ หิวแล้ว!! 🍚', 'นิจ! ให้ข้าวด้วยนะ!', 'หิวมากเลยนิจ~ 😿',
  'นิจจ อาหารหมดแล้ว 🥺', 'เมื่อไหร่จะได้กินข้าว...', 'นิจจจจ!!! 🐟',
  'หิวแล้วนะ อย่าลืมฉันนะนิจ', 'ขันเงินหิวมาก~ ให้ข้าวด้วย 🍛',
  'นิจจ ท้องร้องแล้ว 😩', 'ปลาอยู่ไหนนะ 🐟', 'นิจจ หิวววว!!',
  'ให้อาหารขันเงินด้วยนะนิจ~',
]
const REACT_EMOJIS = ['😸','🐟','✨','💕','🍚','😋','🥰','🐾']
const S = { WALK:'walk', RUN:'run', SIT:'sit', SLEEP:'sleep', REACT:'react', TEASE:'tease', MEOW:'meow', STRETCH:'stretch' }

const todayStr = () => new Date().toLocaleDateString('en-CA')

// โหลด lottie-web จาก CDN ตอนใช้งาน (ไม่ต้องลง dependency)
function loadLottie() {
  if (window.lottie) return Promise.resolve(window.lottie)
  return new Promise((resolve, reject) => {
    const sc = document.createElement('script')
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js'
    sc.onload = () => resolve(window.lottie)
    sc.onerror = () => reject(new Error('load lottie failed'))
    document.head.appendChild(sc)
  })
}

// ─── Persian Cat SVG with walking legs ──────────────────────────────────────
function PersianCat({ state, flip, blinking, tailAngle, legFrame }) {
  const eyeRy   = blinking || state === S.SLEEP ? 0.8 : 9
  const pupilRy = blinking || state === S.SLEEP ? 0.8 : 7
  const ta      = tailAngle || 0
  const amp     = state === S.RUN ? 1.5 : state === S.SLEEP ? 0.25
                : (state === S.MEOW || state === S.REACT) ? 1.2 : 1
  const walking = state === S.WALK || state === S.RUN || state === S.TEASE

  // leg positions: 4-frame gait (smooth phase -1..1)
  const lf = legFrame % 4
  const ph = [1, 0, -1, 0][lf]
  const leftLegY  = walking ? 74 + ph * 2.2 : 75
  const rightLegY = walking ? 74 - ph * 2.2 : 75
  const leftLegX  = walking ? 29 + ph * 1.2 : 29
  const rightLegX = walking ? 51 - ph * 1.2 : 51

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
      <path d={`M56,60 Q${70+Math.sin(ta)*9*amp},${52+Math.cos(ta)*7*amp} ${66+Math.sin(ta)*11*amp},${40+Math.cos(ta)*5*amp}`}
        fill="none" stroke="#e8d8d0" strokeWidth="10" strokeLinecap="round" filter="url(#nc-sh)"/>
      <path d={`M56,60 Q${70+Math.sin(ta)*9*amp},${52+Math.cos(ta)*7*amp} ${66+Math.sin(ta)*11*amp},${40+Math.cos(ta)*5*amp}`}
        fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.5"/>

      {/* ── LEGS ── */}
      {/* back legs (always visible, less detail) */}
      <ellipse cx={32 - ph*1} cy={rightLegY+3} rx="7" ry="5" fill="#e6d3ca" stroke="#d8c8be" strokeWidth="0.8"/>
      <ellipse cx={50 + ph*1} cy={leftLegY+3}  rx="7" ry="5" fill="#e6d3ca" stroke="#d8c8be" strokeWidth="0.8"/>

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
function Bubble({ text, flip, onClick }) {
  return (
    <div onClick={onClick} style={{
      position:'absolute', bottom:86, left:flip?'auto':-8, right:flip?-8:'auto',
      background:'white', borderRadius:12, padding:'5px 10px',
      fontSize:12, fontWeight:600, color:'#374151', whiteSpace:'normal',
      width:'max-content', maxWidth:230, lineHeight:1.45, cursor: onClick?'pointer':'default',
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

// ─── Task panel ───────────────────────────────────────────────────────────────
function TaskPanel({ rows, onGo, side }) {
  return (
    <div style={{
      position:'absolute', bottom:96, [side]:0,
      background:'white', borderRadius:16, padding:'12px', width:248,
      boxShadow:'0 8px 30px rgba(0,0,0,0.18)', border:'1.5px solid #f3e8e0',
      animation:'ncBubble .2s ease-out', zIndex:2,
    }}>
      <div style={{ fontSize:13, fontWeight:800, color:'#374151', marginBottom:8,
        display:'flex', alignItems:'center', gap:6 }}>
        🐾 ขันเงินสรุปให้
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize:12, color:'#9ca3af', padding:'10px 4px', textAlign:'center' }}>
          ไม่มีงานค้างเลยนิจ ชิลล์ๆ ได้ ✨
        </div>
      ) : rows.map(r => (
        <button key={r.k} onClick={()=>onGo(r.to)} style={{
          display:'flex', alignItems:'center', gap:10, width:'100%',
          padding:'8px 8px', marginBottom:4, border:'none', borderRadius:10,
          background:'#faf8f6', cursor:'pointer', textAlign:'left',
          transition:'background .15s',
        }}
          onMouseEnter={e=>e.currentTarget.style.background='#f3e8e0'}
          onMouseLeave={e=>e.currentTarget.style.background='#faf8f6'}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:r.color, flexShrink:0 }}/>
          <span style={{ fontSize:15 }}>{r.icon}</span>
          <span style={{ flex:1, fontSize:12.5, fontWeight:600, color:'#4b5563' }}>{r.label}</span>
          <span style={{ fontSize:12.5, fontWeight:800, color:r.color }}>{r.val}</span>
          <span style={{ color:'#cbd5e1', fontSize:13 }}>›</span>
        </button>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function NekoCat() {
  const { rentals, cameras, loading, unreadCount } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window))
  const docked = isMobile || reduceMotion

  const [hidden,   setHidden]   = useState(() => {
    try { return localStorage.getItem('nc_hidden') === '1' } catch { return false }
  })
  const [panelOpen, setPanelOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const [pos,      setPos]      = useState({ x: 160, y: 200 })
  const [flip,     setFlip]     = useState(false)
  const [catState, setCatState] = useState(docked ? S.SIT : S.WALK)
  const [blink,    setBlink]    = useState(false)
  const [tail,     setTail]     = useState(0)
  const [legFrame, setLegFrame] = useState(0)
  const [msg,      setMsg]      = useState(null)
  const [reactEmoji,setReact]   = useState(null)
  const [dragging, setDragging] = useState(false)
  const [spinning, setSpinning] = useState(false)

  const posRef     = useRef({ x: 160, y: 200 })
  const stateRef   = useRef(docked ? S.SIT : S.WALK)
  const flipRef    = useRef(false)
  const targetRef  = useRef({ x: 400, y: 300 })
  const mouseRef   = useRef({ x: -999, y: -999 })
  const dodgeRef   = useRef(0)
  const timers     = useRef({})
  const rafRef     = useRef(null)
  const isDragging = useRef(false)
  const dragOffset = useRef({ x:0, y:0 })
  const rentalsRef   = useRef([])
  const knownIdsRef  = useRef(null)
  const announcedRef = useRef(new Set())
  const containerRef = useRef(null)
  const autoShownRef = useRef(false)
  const prevStatusRef = useRef(null)
  const moodRef = useRef('happy')
  // Lottie แมวสมจริง (มี fallback เป็น SVG เดิมถ้าไม่มีไฟล์ /cat.json)
  const lottieBoxRef = useRef(null)
  const animInstRef  = useRef(null)
  const [lottieState, setLottieState] = useState('loading') // loading | ready | failed

  const safeX = x => Math.max(10, Math.min((window.innerWidth  || 1200) - 90, x))
  const safeY = y => Math.max(60, Math.min((window.innerHeight || 800)  - 95, y))
  const dist  = (a,b) => Math.hypot(a.x-b.x, a.y-b.y)
  const rndMsg    = () => MSGS[Math.floor(Math.random()*MSGS.length)]
  const rndTarget = useCallback(() => ({
    x: safeX(80  + Math.random() * ((window.innerWidth  || 1200) - 160)),
    y: safeY(100 + Math.random() * ((window.innerHeight || 800)  - 160)),
  }), [])

  // ── คำนวณงาน/เงินเดิมพัน ────────────────────────────────────────
  const tasks = useMemo(() => {
    const today = todayStr()
    const rs = rentals || []
    const toDeliver       = rs.filter(r => r.status==='booked' && r.start_date <= today)
    const toReturnToday   = rs.filter(r => r.status==='active' && r.end_date === today)
    const overdue         = rs.filter(r => r.status==='active' && r.end_date < today)
    const insurancePending= rs.filter(r => r.status==='returned' && Number(r.insurance)>0 && !r.insurance_returned)
    const collectList     = rs.filter(r => (r.status==='booked'||r.status==='active') && r.start_date===today && Number(r.due_on_pickup)>0)
    const collectAmt      = collectList.reduce((s,r)=>s+Number(r.due_on_pickup||0),0)
    const busyIds         = new Set(rs.filter(r=>['booked','active'].includes(r.status)).map(r=>r.camera_id))
    const idleCameras     = (cameras||[]).filter(c => c.status==='available' && !busyIds.has(c.id))
    return { today, toDeliver, toReturnToday, overdue, insurancePending, collectList, collectAmt, idleCameras }
  }, [rentals, cameras])

  const panelRows = useMemo(() => {
    const rows = []
    if (tasks.toDeliver.length)        rows.push({ k:'d',  icon:'📦', label:'ต้องส่งกล้อง',        val:tasks.toDeliver.length,      to:'/rentals',  color:'#f59e0b' })
    if (tasks.overdue.length)          rows.push({ k:'o',  icon:'⚠️', label:'ค้างคืน (เลยกำหนด)',   val:tasks.overdue.length,        to:'/rentals',  color:'#ef4444' })
    if (tasks.toReturnToday.length)    rows.push({ k:'r',  icon:'🔄', label:'คืนวันนี้',           val:tasks.toReturnToday.length,  to:'/rentals',  color:'#10b981' })
    if (tasks.collectAmt > 0)          rows.push({ k:'c',  icon:'💰', label:'ต้องเก็บเงินวันนี้',   val:'฿'+tasks.collectAmt.toLocaleString(), to:'/rentals', color:'#0ea5e9' })
    if (tasks.insurancePending.length) rows.push({ k:'i',  icon:'🛡️', label:'ประกันค้างคืน',        val:tasks.insurancePending.length, to:'/rentals', color:'#8b5cf6' })
    if (tasks.idleCameras.length)      rows.push({ k:'idle',icon:'📷', label:'กล้องว่าง',           val:tasks.idleCameras.length,    to:'/cameras',  color:'#64748b' })
    if (unreadCount > 0)               rows.push({ k:'n',  icon:'🔔', label:'แจ้งเตือนใหม่',        val:unreadCount,                 to:'/notifications', color:'#ec4899' })
    return rows
  }, [tasks, unreadCount])

  // อารมณ์ตามปริมาณงาน: stressed (ค้างคืน) / busy (คิวเยอะ) / lazy (ว่าง) / happy
  const mood = useMemo(() => {
    if (tasks.overdue.length > 0) return 'stressed'
    const q = tasks.toDeliver.length + tasks.toReturnToday.length
    if (q >= 3) return 'busy'
    if (q === 0) return 'lazy'
    return 'happy'
  }, [tasks])
  useEffect(() => { moodRef.current = mood }, [mood])


  const queueToday = () => rentalsRef.current.filter(r =>
    ['booked','active'].includes(r.status) &&
    (r.start_date === todayStr() || r.end_date === todayStr())).length

  const showMsg = useCallback((text, dur=2600) => {
    setMsg(text)
    clearTimeout(timers.current.msg)
    timers.current.msg = setTimeout(()=>setMsg(null), dur)
  }, [])
  // เตือนแบบกังวลเมื่อมีของค้างคืน (ทุก 1 นาที)
  useEffect(() => {
    if (mood !== 'stressed') return
    const t = setInterval(() => {
      if (isDragging.current) return
      setReact('💦'); setTimeout(() => setReact(null), 1000)
      showMsg('ยังมีของค้างคืนอยู่นะนิจ~ รีบตามหน่อย 😿', 3200)
    }, 60000)
    return () => clearInterval(t)
  }, [mood, showMsg])


  const changeState = useCallback(s => {
    stateRef.current = s
    setCatState(s)
  }, [])

  const goTo = useCallback((path) => {
    setPanelOpen(false)
    navigate(path)
  }, [navigate])

  // ── track viewport size (mobile/desktop switch) ─────────────────
  useEffect(() => {
    const onResize = () => setIsMobile(
      window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── ซ่อนแมวเมื่อมีหน้าต่าง modal เปิดอยู่ (modal ใช้ class 'fixed inset-0') ──
  // กันแมว (zIndex 9999) ลอยทับปุ่มใน modal เช่นตอนสร้างรายการเช่า
  useEffect(() => {
    const check = () => {
      const open = !!document.querySelector('.fixed.inset-0')
      setModalOpen(prev => (prev === open ? prev : open))
    }
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [])

  // ── โหลด Lottie แมว (/cat.json) — ถ้าไม่มี/พัง ใช้ SVG เดิม ──────
  // โหลดครั้งเดียวเมื่อกล่องพร้อม (รองรับเข้า login ก่อนแล้วค่อยไป dashboard)
  useEffect(() => {
    if (animInstRef.current || lottieState === 'failed') return
    if (!lottieBoxRef.current) return
    let cancelled = false
    loadLottie().then((lib) => {
      if (cancelled || animInstRef.current || !lottieBoxRef.current || !lib) return
      const inst = lib.loadAnimation({
        container: lottieBoxRef.current,
        renderer: 'svg', loop: true, autoplay: true, path: '/cat.json',
      })
      animInstRef.current = inst
      inst.addEventListener('DOMLoaded',   () => { if (!cancelled) setLottieState('ready') })
      inst.addEventListener('data_failed', () => { if (!cancelled) setLottieState('failed') })
    }).catch(() => { if (!cancelled) setLottieState('failed') })
    return () => { cancelled = true }
  }, [location.pathname, lottieState])

  // ทำลาย instance ตอน unmount เท่านั้น
  useEffect(() => () => {
    if (animInstRef.current) { try { animInstRef.current.destroy() } catch {} animInstRef.current = null }
  }, [])

  // ปรับความเร็ว Lottie ตามสถานะ (วิ่งเร็ว/นอนช้า)
  useEffect(() => {
    const inst = animInstRef.current
    if (!inst || lottieState !== 'ready') return
    try {
      if (catState === S.RUN || catState === S.TEASE) inst.setSpeed(2)
      else if (catState === S.SLEEP) inst.setSpeed(0.4)
      else inst.setSpeed(1)
    } catch {}
  }, [catState, lottieState])

  // leg step timer — 4-frame gait
  useEffect(() => {
    const leg = setInterval(() => {
      if (stateRef.current===S.WALK || stateRef.current===S.RUN || stateRef.current===S.TEASE) {
        setLegFrame(f => f+1)
      }
    }, stateRef.current===S.RUN ? 80 : 350)
    return () => clearInterval(leg)
  }, [catState])

  // tail swish — speed follows mood
  useEffect(() => {
    let t = 0
    const sw = setInterval(()=>{
      const st = stateRef.current
      t += st===S.RUN ? 0.18 : (st===S.MEOW||st===S.REACT) ? 0.12 : st===S.SLEEP ? 0.02 : 0.06
      setTail(t)
    }, 70)
    return () => clearInterval(sw)
  }, [])

  // blink
  useEffect(() => {
    const bl = setInterval(()=>{
      setBlink(true); setTimeout(()=>setBlink(false), 130)
    }, 3500 + Math.random()*2000)
    return () => clearInterval(bl)
  }, [])

  // mouse track (roaming only)
  useEffect(() => {
    if (docked) return
    const mv = e => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', mv)
    return () => window.removeEventListener('mousemove', mv)
  }, [docked])

  // drag (roaming only)
  useEffect(() => {
    if (docked) return
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
  }, [docked, changeState, rndTarget])

  // ── เปิดแผงสรุปอัตโนมัติทุกครั้งที่เปิดแอป (หลังโหลดข้อมูลเสร็จ) ──
  useEffect(() => {
    if (loading || autoShownRef.current) return
    autoShownRef.current = true
    clearTimeout(timers.current.autoOpen)
    timers.current.autoOpen = setTimeout(() => {
      setPanelOpen(true)
      clearTimeout(timers.current.autoClose)
      timers.current.autoClose = setTimeout(() => setPanelOpen(false), 12000)
    }, 1500)
  }, [loading])

  // close panel on outside click
  useEffect(() => {
    if (!panelOpen) return
    const h = e => { if (containerRef.current && !containerRef.current.contains(e.target)) setPanelOpen(false) }
    document.addEventListener('mousedown', h)
    document.addEventListener('touchstart', h)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h) }
  }, [panelOpen])

  // ── แมวรู้งานจริง ──────────────────────────────────────────────
  useEffect(() => { rentalsRef.current = rentals || [] }, [rentals])

  const announce = useCallback((text) => {
    if (isDragging.current || docked) { showMsg(text, 7000); return }
    changeState(S.RUN); targetRef.current = rndTarget()
    clearTimeout(timers.current.annc)
    timers.current.annc = setTimeout(() => {
      changeState(S.MEOW); showMsg(text, 7000)
      setTimeout(() => { if (stateRef.current===S.MEOW) changeState(S.WALK) }, 4200)
    }, 900)
  }, [changeState, rndTarget, showMsg, docked])

  // จองใหม่เข้ามา → ตื่นเต้น
  useEffect(() => {
    if (!rentals || loading) return
    const ids = new Set(rentals.map(r => r.id))
    if (knownIdsRef.current) {
      const fresh = rentals.filter(r => !knownIdsRef.current.has(r.id))
      if (fresh.length > 0) {
        const r = fresh[0]
        setReact('🎉')
        setTimeout(() => setReact(null), 1100)
        announce(`จองใหม่เข้ามา! 🎉 ${r.camera?.name ?? 'กล้อง'} — คุณ${r.customer?.name ?? 'ลูกค้า'}`)
      }
    }
    knownIdsRef.current = ids
  }, [rentals, loading, announce])

  // รีแอคชันเมื่อสถานะเปลี่ยน: ส่งกล้อง (🚀/💰) · คืนกล้อง (หมุน + ✨)
  useEffect(() => {
    if (!rentals || loading) return
    const prev = prevStatusRef.current
    if (prev) {
      for (const r of rentals) {
        const before = prev.get(r.id)
        if (!before || before === r.status) continue
        if (before === 'booked' && r.status === 'active') {
          setReact(Number(r.due_on_pickup) > 0 ? '💰' : '🚀')
          setTimeout(() => setReact(null), 1300)
          announce(`ส่งกล้อง ${r.camera?.name ?? ''} เรียบร้อย! 🚀`)
        } else if (before === 'active' && r.status === 'returned') {
          setSpinning(true)
          clearTimeout(timers.current.spin)
          timers.current.spin = setTimeout(() => setSpinning(false), 1000)
          setReact('✨')
          setTimeout(() => setReact(null), 1300)
          announce(`รับคืน ${r.camera?.name ?? ''} แล้ว เก่งมากนิจ! 🎉`)
        }
      }
    }
    prevStatusRef.current = new Map(rentals.map(r => [r.id, r.status]))
  }, [rentals, loading, announce])

  // ── บรีฟตอนเช้า (ครั้งเดียว/วัน) + เตือนของค้างคืน ──────────────
  useEffect(() => {
    if (loading) return
    const today = tasks.today
    const briefKey = 'nc_brief_' + today
    let briefShown = false
    try { briefShown = localStorage.getItem(briefKey) === '1' } catch {}

    if (!briefShown) {
      const parts = []
      parts.push(`ส่ง ${tasks.toDeliver.length}`)
      parts.push(`คืน ${tasks.toReturnToday.length}`)
      if (tasks.overdue.length) parts.push(`ค้าง ${tasks.overdue.length} ❗`)
      if (tasks.collectAmt > 0) parts.push(`เก็บ ฿${tasks.collectAmt.toLocaleString()}`)
      const brief = `อรุณสวัสดิ์นิจ! ☀️ วันนี้: ${parts.join(' · ')} — กดดูได้เลยนิจ`
      clearTimeout(timers.current.brief)
      timers.current.brief = setTimeout(() => announce(brief), 5000)
      try { localStorage.setItem(briefKey, '1') } catch {}
    } else if (tasks.overdue.length && !announcedRef.current.has('overdue-'+today)) {
      announcedRef.current.add('overdue-'+today)
      clearTimeout(timers.current.over)
      timers.current.over = setTimeout(
        () => announce(`❗ มีของค้างคืน ${tasks.overdue.length} ชิ้น กดดูเลยนิจ!`), 7000)
    }
  }, [loading, tasks, announce])

  // เตือนคิวรับ/คืนที่ใกล้ถึง (เช็คทุก 1 นาที)
  useEffect(() => {
    const check = () => {
      const now = new Date()
      const today = todayStr()
      const evts = []
      for (const r of rentalsRef.current) {
        if (!['booked','active'].includes(r.status)) continue
        const cam  = r.camera?.name ?? 'กล้อง'
        const cust = r.customer?.name ?? 'ลูกค้า'
        if (r.start_date === today && r.pickup_time)
          evts.push({ key:`${r.id}-p`, time:r.pickup_time, txt:(mn)=>`📦 อีก ${mn} นาที คุณ${cust} มารับ ${cam} นะนิจ!`, soon:`❗ ใกล้ถึงคิวรับแล้ว! ${cam} — คุณ${cust}` })
        if (r.end_date === today && r.return_time)
          evts.push({ key:`${r.id}-r`, time:r.return_time, txt:(mn)=>`🔄 อีก ${mn} นาที คุณ${cust} มาคืน ${cam} นะนิจ!`, soon:`❗ ใกล้ถึงคิวคืนแล้ว! ${cam} — คุณ${cust}` })
      }
      for (const ev of evts) {
        const [h, mi] = ev.time.split(':').map(Number)
        const at = new Date(); at.setHours(h, mi, 0, 0)
        const mn = Math.round((at - now) / 60000)
        if (mn > 0 && mn <= 10 && !announcedRef.current.has(ev.key+'-10')) {
          announcedRef.current.add(ev.key+'-10'); announcedRef.current.add(ev.key+'-60')
          announce(ev.soon); break
        }
        if (mn > 10 && mn <= 60 && !announcedRef.current.has(ev.key+'-60')) {
          announcedRef.current.add(ev.key+'-60')
          announce(ev.txt(mn)); break
        }
      }
    }
    const iv = setInterval(check, 60000)
    const t0 = setTimeout(check, 4000)
    return () => { clearInterval(iv); clearTimeout(t0) }
  }, [announce])

  // behavior scheduler (roaming only)
  const scheduleBehavior = useCallback(() => {
    if (docked) return
    clearTimeout(timers.current.behav)
    timers.current.behav = setTimeout(() => {
      if (isDragging.current || stateRef.current===S.REACT) return scheduleBehavior()
      const pick = ['walk','walk','run','sit','meow','meow','meow'][Math.floor(Math.random()*7)]
      if (pick==='run') {
        changeState(S.RUN); targetRef.current = rndTarget()
        setTimeout(()=>{ if(stateRef.current===S.RUN) changeState(S.WALK) }, 1800)
      } else if (pick==='sit') {
        const q = queueToday()
        const text = Math.random() < 0.35
          ? (q > 0 ? `วันนี้มีคิว ${q} รายการนะนิจ 📋` : 'วันนี้ไม่มีคิว ชิลล์ๆ ได้เลย 😸')
          : rndMsg()
        changeState(S.SIT); showMsg(text, 2600)
        setTimeout(()=>changeState(S.WALK), 3500)
      } else if (pick==='meow') {
        const q2 = queueToday()
        const text2 = Math.random() < 0.35
          ? (q2 > 0 ? `อย่าลืมคิววันนี้ ${q2} รายการนะนิจ! 📋` : 'วันนี้ว่างๆ เล่นกับขันเงินไหม 🐾')
          : rndMsg()
        changeState(S.MEOW); showMsg(text2, 2600)
        setTimeout(()=>changeState(S.WALK), 2800)
      } else {
        targetRef.current = rndTarget(); changeState(S.WALK)
      }
      scheduleBehavior()
    }, 3500 + Math.random()*5000)
  }, [docked, changeState, rndTarget, showMsg])

  // sleep after idle (roaming only)
  useEffect(() => {
    if (docked) return
    let sl
    const reset = () => {
      clearTimeout(sl)
      if (stateRef.current===S.SLEEP) {
        changeState(S.STRETCH); setMsg(null); showMsg('ยืดเส้นยืดสายย~ 😺', 1400)
        clearTimeout(timers.current.stretch)
        timers.current.stretch = setTimeout(() => {
          if (stateRef.current===S.STRETCH) { changeState(S.WALK); targetRef.current = rndTarget() }
        }, 950)
      }
      const sleepMs = moodRef.current==='lazy' ? 12000 : (moodRef.current==='busy'||moodRef.current==='stressed') ? 40000 : 20000
      sl = setTimeout(()=>{ changeState(S.SLEEP); showMsg('zzz 💤',99999) }, sleepMs)
    }
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown',   reset)
    reset()
    return () => { window.removeEventListener('mousemove',reset); window.removeEventListener('keydown',reset); clearTimeout(sl) }
  }, [docked, changeState, rndTarget, showMsg])

  // main RAF loop (roaming only; paused when tab hidden)
  useEffect(() => {
    if (docked) return
    scheduleBehavior(); targetRef.current = rndTarget()
    const loop = () => {
      if (document.hidden || isDragging.current) { rafRef.current = requestAnimationFrame(loop); return }
      const p  = posRef.current
      const t  = targetRef.current
      const m  = mouseRef.current
      const st = stateRef.current
      if (st===S.SLEEP||st===S.SIT||st===S.REACT||st===S.MEOW||st===S.STRETCH) { rafRef.current=requestAnimationFrame(loop); return }

      const dMouse = dist(p, m)
      if (dMouse < 100 && st!==S.TEASE && dodgeRef.current < 5) {
        changeState(S.TEASE)
        setTimeout(()=>{ if(stateRef.current===S.TEASE) changeState(S.WALK) }, 2000)
      }

      const spd = st===S.RUN ? 4.5 : st===S.TEASE ? 2.0 : 0.25
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
  }, [docked, scheduleBehavior, rndTarget, changeState])

  const onMouseDown = useCallback(e => {
    if (docked) return
    e.preventDefault(); e.stopPropagation()
    isDragging.current = true
    setDragging(true)
    dragOffset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y }
    changeState(S.REACT)
    showMsg('ว้าย!! 😹', 800)
  }, [docked, changeState, showMsg])

  // คลิกแมว = เปิดแผงสรุปงาน
  const onClick = useCallback(e => {
    e.stopPropagation()
    if (isDragging.current) return
    if (stateRef.current===S.SLEEP) changeState(S.WALK)
    setReact('💕'); setTimeout(()=>setReact(null), 700)
    setPanelOpen(o => !o)
  }, [changeState])

  const restore = useCallback(() => {
    try { localStorage.removeItem('nc_hidden') } catch {}
    setHidden(false)
  }, [])

  const hide = useCallback((e) => {
    e.stopPropagation()
    try { localStorage.setItem('nc_hidden', '1') } catch {}
    setHidden(true)
    setPanelOpen(false)
  }, [])

  // ── ไม่แสดงบนหน้า login ──────────────────────────────────────────
  if (location.pathname === '/login') return null

  // ── ซ่อนแมวระหว่างเปิด modal (กันบังปุ่ม) ────────────────────────
  if (modalOpen) return null

  // ── ปิดอยู่ → ปุ่มเรียกกลับเล็ก ๆ ────────────────────────────────
  if (hidden) {
    return (
      <button onClick={restore} title="เรียกขันเงินกลับมา"
        style={{ position:'fixed', right:14, bottom:14, zIndex:9999,
          width:44, height:44, borderRadius:'50%', border:'1.5px solid #f3e8e0',
          background:'white', boxShadow:'0 4px 14px rgba(0,0,0,0.15)',
          cursor:'pointer', fontSize:20 }}>🐾</button>
    )
  }

  const side = (docked || flip) ? 'right' : 'left'

  const anim = dragging ? 'ncJump .4s ease-out'
             : spinning ? 'ncSpin 1s ease-in-out'
             : catState===S.WALK    ? 'ncWalk 1.8s ease-in-out infinite alternate'
             : catState===S.RUN     ? 'ncRun  .35s ease-in-out infinite alternate'
             : catState===S.REACT   ? 'ncJump .4s ease-out'
             : catState===S.STRETCH ? 'ncStretch .95s ease-in-out'
             : 'ncBreath 3s ease-in-out infinite'

  const containerStyle = docked
    ? { position:'fixed', right:14, bottom:14, zIndex:9999, userSelect:'none', cursor:'pointer' }
    : { position:'fixed', left:pos.x, top:pos.y, zIndex:9999, userSelect:'none',
        cursor: dragging ? 'grabbing' : 'grab' }

  return (
    <div ref={containerRef} style={containerStyle}
      onMouseDown={onMouseDown} onClick={onClick} title="ขันเงิน 🐾">

      {panelOpen && <TaskPanel rows={panelRows} onGo={goTo} side={side} />}

      {!panelOpen && msg && <Bubble text={msg} flip={docked ? true : flip} onClick={onClick}/>}

      {reactEmoji && (
        <div style={{ position:'absolute', top:-44, left:'50%', transform:'translateX(-50%)',
          fontSize:24, animation:'ncFloat .9s ease-out forwards', pointerEvents:'none' }}>
          {reactEmoji}
        </div>
      )}

      <div style={{ animation: anim }}>
        <div
          ref={lottieBoxRef}
          style={{
            width: 104, height: 104,
            display: lottieState === 'ready' ? 'block' : 'none',
            transform: (docked ? true : flip) ? 'scaleX(-1)' : 'none',
          }}
        />
        {lottieState !== 'ready' && (
          <PersianCat state={catState} flip={docked ? true : flip} blinking={blink} tailAngle={tail} legFrame={legFrame}/>
        )}
      </div>

      <div onClick={hide} className="nc-x"
        style={{ position:'absolute', top:-6, right:-6, width:16, height:16,
          borderRadius:'50%', background:'#e2e8f0', color:'#94a3b8',
          fontSize:9, display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', opacity: docked ? 1 : 0, transition:'opacity .2s' }}>✕</div>

      <style>{`
        @keyframes ncWalk   { from{transform:translateY(0) rotate(-.5deg)} to{transform:translateY(-2px) rotate(.5deg)} }
        @keyframes ncRun    { from{transform:translateY(0) rotate(-2deg)}  to{transform:translateY(-6px) rotate(2deg)} }
        @keyframes ncBreath { 0%,100%{transform:scale(1)} 50%{transform:scale(1.02)} }
        @keyframes ncJump   { 0%{transform:translateY(0)} 35%{transform:translateY(-16px) scale(1.07)} 100%{transform:translateY(0)} }
        @keyframes ncFloat  { 0%{opacity:1;transform:translateX(-50%) translateY(0)} 100%{opacity:0;transform:translateX(-50%) translateY(-28px)} }
        @keyframes ncBubble { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
        @keyframes ncStretch{ 0%{transform:scale(1)} 40%{transform:scaleX(1.18) scaleY(.8) translateY(7px)} 70%{transform:scaleX(.96) scaleY(1.06) translateY(-3px)} 100%{transform:scale(1)} }
        @keyframes ncSpin   { 0%{transform:rotate(0) scale(1)} 50%{transform:rotate(180deg) scale(1.12)} 100%{transform:rotate(360deg) scale(1)} }
        div:hover > .nc-x   { opacity:1 !important }
      `}</style>
    </div>
  )
}
