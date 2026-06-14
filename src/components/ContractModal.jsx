import { useRef, useState, useEffect } from 'react'

// ── ข้อมูลผู้ให้เช่า (แก้ไขได้ตรงนี้) ───────────────────────────────
const LESSOR = {
  name:   'HICHAO.CNX Camera Rental',
  phone:  '—',
  address:'จังหวัดเชียงใหม่',
}

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

const fmtDate = (ds) => {
  if (!ds) return '—'
  const [y, m, d] = ds.split('-')
  return `${parseInt(d)} ${MONTHS_TH[parseInt(m) - 1]} ${parseInt(y) + 543}`
}
const fmtTime = (t) => (t ? `${t.slice(0,5)} น.` : '')
const calcDays = (start, end) => {
  if (!start || !end) return 0
  return Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1
}
const baht = (n) => '฿' + Number(n || 0).toLocaleString()

async function toBase64(url) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result)
      r.readAsDataURL(blob)
    })
  } catch { return null }
}

function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas)
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    s.onload = () => resolve(window.html2canvas)
    s.onerror = () => reject(new Error('โหลดตัวสร้างรูปไม่สำเร็จ'))
    document.head.appendChild(s)
  })
}

const BRAND = '#FF6B9D'
const INK   = '#1f2937'

export default function ContractModal({ rental, onClose }) {
  const canvasRef = useRef(null)
  const docRef    = useRef(null)
  const drawing   = useRef(false)
  const [hasSig, setHasSig]       = useState(false)
  const [sigImg, setSigImg]       = useState('')
  const [camB64, setCamB64]       = useState('')
  const [logoB64, setLogoB64]     = useState('/logo.png')
  const [generating, setGenerating] = useState(false)
  const [resultUrl, setResultUrl]   = useState('')
  const [resultFile, setResultFile] = useState(null)

  const days        = calcDays(rental.start_date, rental.end_date)
  const pricePerDay = Number(rental.price_per_day || 0)
  const totalPrice  = Number(rental.total_price || 0)
  const deposit     = Number(rental.deposit || 0)
  const insurance   = Number(rental.insurance || 0)
  const deliveryFee = Number(rental.delivery_fee || 0)
  const contractNo  = `HC-CT-${rental.id?.slice(-8).toUpperCase() || '00000000'}`
  const todayStr    = (() => { const d = new Date(); return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}` })()

  const cust = rental.customer || {}
  const cam  = rental.camera || {}

  const lateFee = pricePerDay > 0
    ? `คิดค่าปรับล่าช้าวันละ ${baht(pricePerDay)}`
    : 'คิดค่าปรับล่าช้าตามอัตราค่าเช่า 1 วันต่อวัน'

  const TERMS = [
    'ผู้เช่าได้ตรวจสอบสภาพอุปกรณ์และยอมรับว่าอยู่ในสภาพสมบูรณ์ ใช้งานได้ปกติก่อนรับมอบ',
    `ผู้เช่าจะส่งคืนอุปกรณ์ภายในวันและเวลาที่กำหนด หากคืนล่าช้า ${lateFee}`,
    'ผู้เช่าจะชำระค่าเช่าและค่าใช้จ่ายตามที่ระบุให้ครบถ้วนภายในวันรับอุปกรณ์',
    'ผู้เช่าตกลงแสดงบัตรประชาชนตัวจริงและยินยอมให้ถ่ายสำเนาเพื่อประกอบสัญญา',
    'หากอุปกรณ์ชำรุดหรือเสียหายจากการใช้งานของผู้เช่า ผู้เช่าตกลงรับผิดชอบค่าซ่อมตามจริง',
    'กรณีอุปกรณ์สูญหาย ผู้เช่าตกลงชดใช้ตามราคาประเมินหรือราคาตลาดของอุปกรณ์นั้น',
    'ห้ามดัดแปลง แกะ ซ่อม หรือให้ผู้อื่นซ่อมอุปกรณ์โดยไม่ได้รับอนุญาตจากผู้ให้เช่า',
    'อุปกรณ์เสริม (แบตเตอรี่ เลนส์ การ์ดความจำ สายชาร์จ ฯลฯ) ต้องส่งคืนครบตามรายการที่รับไป',
    'ผู้เช่าจะไม่นำอุปกรณ์ไปให้ผู้อื่นเช่าช่วง หรือใช้ผิดวัตถุประสงค์/ผิดกฎหมาย',
    'เงินค่าจอง/มัดจำ และค่าประกัน จะคืนให้เมื่อผู้เช่าส่งคืนอุปกรณ์ครบถ้วนในสภาพปกติ',
    'กรณีผิดนัดส่งคืนเกินกำหนดโดยไม่แจ้ง ผู้ให้เช่ามีสิทธิ์ริบเงินมัดจำ/ประกัน และดำเนินการตามกฎหมาย',
    'ผู้ให้เช่าไม่รับผิดชอบต่อความเสียหายหรืออุบัติเหตุที่เกิดแก่บุคคลภายนอกระหว่างที่ผู้เช่าใช้งานอุปกรณ์',
    'สัญญานี้จัดทำขึ้นโดยมีข้อความถูกต้องตรงกัน คู่สัญญาได้อ่านเข้าใจโดยตลอดแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐาน',
  ]

  // preload รูปกล้อง + โลโก้ เป็น base64 (กัน canvas ปนเปื้อน cross-origin)
  useEffect(() => {
    let on = true
    if (cam.image_url) toBase64(cam.image_url).then(d => { if (on && d) setCamB64(d) })
    toBase64('/logo.png').then(d => { if (on && d) setLogoB64(d) })
    if (!document.getElementById('hc-sarabun')) {
      const l = document.createElement('link')
      l.id = 'hc-sarabun'; l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap'
      document.head.appendChild(l)
    }
    return () => { on = false }
  }, [cam.image_url])

  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl) }, [resultUrl])

  // ── signature pad ────────────────────────────────────────────────
  const getPos = (e) => {
    const c = canvasRef.current
    const rect = c.getBoundingClientRect()
    const t = e.touches ? e.touches[0] : e
    return { x: (t.clientX - rect.left) * (c.width / rect.width),
             y: (t.clientY - rect.top)  * (c.height / rect.height) }
  }
  const start = (e) => {
    e.preventDefault(); drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y)
  }
  const move = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const p = getPos(e)
    ctx.lineTo(p.x, p.y); ctx.lineWidth = 2.2; ctx.lineCap = 'round'
    ctx.strokeStyle = '#111827'; ctx.stroke()
    if (!hasSig) setHasSig(true)
  }
  const end = () => { drawing.current = false }
  const clearSig = () => {
    const c = canvasRef.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    setHasSig(false); setSigImg('')
  }

  // ── สร้างรูป (จังหวะที่ 1) ────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true)
    try {
      if (hasSig && canvasRef.current) setSigImg(canvasRef.current.toDataURL('image/png'))
      const h2c = await loadHtml2Canvas()
      try { await document.fonts.ready } catch {}
      await new Promise(r => setTimeout(r, 300))
      const canvas = await h2c(docRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (resultUrl) URL.revokeObjectURL(resultUrl)
          if (blob) {
            setResultFile(new File([blob], `${contractNo}.png`, { type: 'image/png' }))
            setResultUrl(URL.createObjectURL(blob))
          } else {
            setResultFile(null)
            setResultUrl(canvas.toDataURL('image/png'))
          }
          resolve()
        }, 'image/png')
      })
    } catch (e) {
      alert('สร้างรูปไม่สำเร็จ: ' + e.message)
    } finally {
      setGenerating(false)
    }
  }

  // ── แชร์ (จังหวะที่ 2 — เรียกในคลิกตรง ๆ กัน activation หมดอายุ) ──
  const handleShare = async () => {
    try {
      if (resultFile && navigator.canShare && navigator.canShare({ files: [resultFile] })) {
        await navigator.share({ files: [resultFile], title: 'หนังสือสัญญาเช่ากล้อง' })
      } else if (navigator.share) {
        await navigator.share({ title: 'หนังสือสัญญาเช่ากล้อง', text: contractNo })
      }
    } catch { /* ผู้ใช้ยกเลิก */ }
  }

  // ── UI helpers (พรีวิวบนจอ) ──────────────────────────────────────
  const RowL = ({ k, v }) => (
    <div className="flex gap-2 text-sm mb-1">
      <span className="text-gray-400 w-28 flex-shrink-0">{k}</span>
      <span className="font-medium text-gray-800">{v || '—'}</span>
    </div>
  )

  // ── styles เอกสาร ────────────────────────────────────────────────
  const card  = { background:'#fafafa', border:'1px solid #eef0f3', borderRadius:12, padding:'14px 16px' }
  const h3    = { fontSize:12, color:BRAND, fontWeight:800, marginBottom:8, letterSpacing:'.3px' }
  const row   = { display:'flex', gap:8, marginBottom:4, fontSize:13 }
  const kCol  = { width:118, color:'#6b7280', flexShrink:0 }
  const vCol  = { fontWeight:600, color:INK }
  const sec   = { fontSize:14, fontWeight:800, color:INK, margin:'18px 0 6px', display:'flex', alignItems:'center', gap:8 }
  const secBar= { width:4, height:16, background:BRAND, borderRadius:3, display:'inline-block' }
  const td    = { padding:'6px 10px', borderBottom:'1px solid #f1f3f5', fontSize:13 }
  const tdR   = { ...td, textAlign:'right', fontWeight:700 }

  const SignBox = ({ role, name, img }) => (
    <div style={{ textAlign:'center', flex:1 }}>
      {img ? <img src={img} alt="" style={{ height:44, objectFit:'contain', display:'block', margin:'0 auto 2px' }} />
           : <div style={{ height:44 }} />}
      <div style={{ borderBottom:'1px dotted #9ca3af', marginBottom:6 }} />
      <div style={{ fontSize:12, color:'#6b7280' }}>{role}</div>
      <div style={{ fontSize:12, fontWeight:600, marginTop:2, color:INK }}>( {name || '............................'} )</div>
      <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>วันที่ ......./......./.......</div>
    </div>
  )

  return (
    <>
      {/* ── พรีวิว + เซ็น (บนจอ) ───────────────────────────────────── */}
      <div className="fixed inset-0 z-[10000] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
            <div>
              <h2 className="text-base font-bold text-gray-900">หนังสือสัญญาเช่ากล้อง</h2>
              <p className="text-xs text-gray-400">{contractNo}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs font-bold text-brand-500 mb-2">ผู้เช่า</p>
              <RowL k="ชื่อ" v={cust.name} />
              <RowL k="บัตรประชาชน" v={cust.id_card} />
              <RowL k="โทร" v={cust.phone} />
              <RowL k="ที่อยู่" v={cust.address} />
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs font-bold text-brand-500 mb-2">อุปกรณ์ & ระยะเวลา</p>
              <RowL k="อุปกรณ์" v={`${cam.name || '—'}${cam.brand ? ' · ' + cam.brand : ''}`} />
              <RowL k="รับ" v={`${fmtDate(rental.start_date)} ${fmtTime(rental.pickup_time)}`} />
              <RowL k="คืน" v={`${fmtDate(rental.end_date)} ${fmtTime(rental.return_time)}`} />
              <RowL k="รวมสุทธิ" v={baht(totalPrice)} />
            </div>

            {(!cust.id_card || !cust.address) && (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                ⚠️ ลูกค้ายังไม่มี{!cust.id_card ? ' เลขบัตรประชาชน' : ''}{(!cust.id_card && !cust.address) ? ' /' : ''}{!cust.address ? ' ที่อยู่' : ''} — แนะนำเพิ่มในข้อมูลลูกค้าให้ครบก่อน
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-gray-700">ลายเซ็นผู้เช่า (เซ็นบนจอ)</p>
                <button onClick={clearSig} className="text-xs text-gray-400 hover:text-gray-600">ล้าง</button>
              </div>
              <canvas
                ref={canvasRef} width={440} height={150}
                onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
                onTouchStart={start} onTouchMove={move} onTouchEnd={end}
                className="w-full h-[150px] border-2 border-dashed border-gray-200 rounded-xl bg-white touch-none"
              />
              <p className="text-[11px] text-gray-400 mt-1">เซ็นนิ้ว/เมาส์ตรงนี้ แล้วกดบันทึกรูป — ลายเซ็นจะอยู่ในภาพ (หรือเว้นว่างไว้เซ็นบนกระดาษก็ได้)</p>
            </div>

            {resultUrl && (
              <div className="border-2 border-brand-100 rounded-xl p-3 bg-brand-50/40">
                <p className="text-sm font-semibold text-gray-700 mb-2">รูปสัญญาพร้อมแล้ว ✅</p>
                <img src={resultUrl} alt="ตัวอย่างสัญญา"
                  className="w-full rounded-lg border border-gray-200 shadow-sm" />
                <p className="text-[11px] text-gray-500 mt-2 text-center">
                  📲 กดค้างที่รูปเพื่อบันทึกลงคลังภาพ — หรือใช้ปุ่มด้านล่าง (ทำซ้ำได้ไม่จำกัด)
                </p>
                <div className="flex gap-2 mt-3">
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <button onClick={handleShare}
                      className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                      </svg>
                      แชร์ / ส่ง LINE
                    </button>
                  )}
                  <a href={resultUrl} download={`${contractNo}.png`}
                    className="flex-1 py-2.5 rounded-xl border border-brand-200 text-brand-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-brand-50">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    ดาวน์โหลด
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">
              ปิด
            </button>
            <button onClick={handleGenerate} disabled={generating}
              className="flex-[2] py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2">
              {generating ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> กำลังสร้างรูป...</>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  {resultUrl ? 'สร้างรูปใหม่' : 'สร้างรูปสัญญา'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── เอกสารสำหรับสร้างรูป (วางนอกจอ) ────────────────────────── */}
      <div style={{ position:'fixed', left:-99999, top:0, pointerEvents:'none', opacity:1 }} aria-hidden="true">
        <div ref={docRef} style={{
          width:760, background:'#ffffff', padding:'40px 44px',
          fontFamily:"'Sarabun','Sukhumvit Set','Prompt',sans-serif", color:INK, fontSize:13, lineHeight:1.55,
        }}>
          {/* header + logo */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            borderBottom:`2px solid ${BRAND}`, paddingBottom:14, marginBottom:16 }}>
            <img src={logoB64} alt="" crossOrigin="anonymous" style={{ height:56, width:'auto', objectFit:'contain' }} />
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:16, fontWeight:800 }}>{LESSOR.name}</div>
              <div style={{ fontSize:12, color:'#6b7280' }}>{LESSOR.address}</div>
              <div style={{ fontSize:12, color:'#6b7280' }}>โทร {LESSOR.phone}</div>
            </div>
          </div>

          <div style={{ textAlign:'center', marginBottom:6 }}>
            <div style={{ fontSize:21, fontWeight:800, letterSpacing:'.3px' }}>หนังสือสัญญาเช่าอุปกรณ์ถ่ายภาพ</div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#6b7280', marginBottom:14 }}>
            <span>เลขที่สัญญา {contractNo}</span>
            <span>ทำที่ {LESSOR.address} · วันที่ {todayStr}</span>
          </div>

          {/* parties: two columns */}
          <div style={{ display:'flex', gap:12, marginBottom:4 }}>
            <div style={{ ...card, flex:1 }}>
              <div style={h3}>ผู้ให้เช่า</div>
              <div style={row}><span style={kCol}>ชื่อ</span><span style={vCol}>{LESSOR.name}</span></div>
              <div style={row}><span style={kCol}>ที่อยู่</span><span style={vCol}>{LESSOR.address}</span></div>
              <div style={row}><span style={kCol}>โทร</span><span style={vCol}>{LESSOR.phone}</span></div>
            </div>
            <div style={{ ...card, flex:1 }}>
              <div style={h3}>ผู้เช่า</div>
              <div style={row}><span style={kCol}>ชื่อ</span><span style={vCol}>{cust.name || '—'}</span></div>
              <div style={row}><span style={kCol}>บัตรประชาชน</span><span style={vCol}>{cust.id_card || '—'}</span></div>
              <div style={row}><span style={kCol}>โทร</span><span style={vCol}>{cust.phone || '—'}</span></div>
              <div style={row}><span style={kCol}>ที่อยู่</span><span style={vCol}>{cust.address || '—'}</span></div>
            </div>
          </div>

          {/* equipment */}
          <div style={sec}><span style={secBar} />รายการอุปกรณ์ที่เช่า</div>
          <div style={card}>
            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
              {camB64
                ? <img src={camB64} alt="" style={{ width:70, height:70, objectFit:'cover', borderRadius:10, border:'1px solid #e5e7eb' }} />
                : <div style={{ width:70, height:70, borderRadius:10, background:'#f3f4f6' }} />}
              <div style={{ flex:1 }}>
                <div style={row}><span style={kCol}>อุปกรณ์</span><span style={vCol}>{cam.name || '—'}{cam.brand ? ' · ' + cam.brand : ''}</span></div>
                <div style={row}><span style={kCol}>รับวันที่</span><span style={vCol}>{fmtDate(rental.start_date)} {fmtTime(rental.pickup_time)}</span></div>
                <div style={row}><span style={kCol}>คืนวันที่</span><span style={vCol}>{fmtDate(rental.end_date)} {fmtTime(rental.return_time)} (รวม {days} วัน)</span></div>
              </div>
            </div>
          </div>

          {/* fees */}
          <div style={sec}><span style={secBar} />ค่าใช้จ่าย</div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <tbody>
              <tr><td style={td}>ค่าเช่า ({baht(pricePerDay)} × {days} วัน)</td><td style={tdR}>{baht(pricePerDay * days)}</td></tr>
              {deliveryFee > 0 && <tr><td style={td}>ค่าจัดส่ง</td><td style={tdR}>{baht(deliveryFee)}</td></tr>}
              <tr><td style={td}>ค่าจอง / มัดจำ</td><td style={tdR}>{baht(deposit)}</td></tr>
              <tr><td style={td}>ค่าประกันความเสียหาย</td><td style={tdR}>{baht(insurance)}</td></tr>
              <tr><td style={{ borderTop:`2px solid ${INK}`, fontWeight:800, fontSize:15, padding:'9px 10px' }}>รวมค่าเช่าสุทธิ</td>
                  <td style={{ borderTop:`2px solid ${INK}`, fontWeight:800, fontSize:15, padding:'9px 10px', textAlign:'right', color:BRAND }}>{baht(totalPrice)}</td></tr>
            </tbody>
          </table>

          {/* terms */}
          <div style={sec}><span style={secBar} />ข้อตกลงและเงื่อนไข</div>
          <div style={{ marginTop:4 }}>
            {TERMS.map((t, i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:6, lineHeight:1.55 }}>
                <span style={{ fontWeight:700, color:BRAND, flexShrink:0, minWidth:44 }}>ข้อ {i + 1}</span>
                <span style={{ flex:1 }}>{t}</span>
              </div>
            ))}
          </div>

          {/* signatures */}
          <div style={{ display:'flex', justifyContent:'space-between', gap:20, marginTop:42 }}>
            <SignBox role="ลงชื่อ ผู้เช่า" name={cust.name} img={sigImg} />
            <SignBox role="ลงชื่อ ผู้ให้เช่า" name={LESSOR.name} img="" />
            <SignBox role="ลงชื่อ พยาน" name="" img="" />
          </div>

          <div style={{ textAlign:'center', fontSize:10, color:'#cbd5e1', marginTop:24 }}>
            เอกสารนี้สร้างโดยระบบ {LESSOR.name} · {contractNo}
          </div>
        </div>
      </div>
    </>
  )
}
