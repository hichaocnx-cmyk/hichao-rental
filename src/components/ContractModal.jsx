import { useRef, useState } from 'react'

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

export default function ContractModal({ rental, onClose }) {
  const canvasRef = useRef(null)
  const drawing   = useRef(false)
  const [hasSig, setHasSig] = useState(false)
  const [sigImg, setSigImg] = useState('')   // ลายเซ็นสำหรับฝังในเอกสารพิมพ์

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
    'ผู้เช่าได้ตรวจสอบสภาพอุปกรณ์และยอมรับว่าอยู่ในสภาพสมบูรณ์ใช้งานได้ปกติก่อนรับมอบ',
    `ผู้เช่าจะส่งคืนอุปกรณ์ภายในกำหนด หากคืนล่าช้า ${lateFee}`,
    'หากอุปกรณ์ชำรุดหรือเสียหายจากการใช้งานของผู้เช่า ผู้เช่าตกลงรับผิดชอบค่าซ่อมตามจริง',
    'กรณีอุปกรณ์สูญหาย ผู้เช่าตกลงชดใช้ตามราคาประเมิน/ราคาตลาดของอุปกรณ์นั้น',
    'เงินค่าจอง/มัดจำ และค่าประกัน จะคืนให้เมื่อผู้เช่าส่งคืนอุปกรณ์ครบถ้วนในสภาพปกติ',
    'ผู้เช่าจะไม่นำอุปกรณ์ไปให้ผู้อื่นเช่าช่วง หรือใช้ผิดวัตถุประสงค์',
    'ผู้ให้เช่าไม่รับผิดชอบต่อความเสียหายหรืออุบัติเหตุที่เกิดแก่บุคคลภายนอกระหว่างที่ผู้เช่าใช้งานอุปกรณ์',
    'คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญานี้โดยตลอดแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐาน',
  ]

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

  // ── พิมพ์ / บันทึก PDF (รองรับมือถือ — ไม่เปิดแท็บใหม่) ──────────
  const handlePrint = () => {
    if (hasSig && canvasRef.current) setSigImg(canvasRef.current.toDataURL('image/png'))
    // รอให้ลายเซ็นเรนเดอร์ลง DOM ก่อนสั่งพิมพ์
    setTimeout(() => { window.print() }, 200)
  }

  // ── UI helpers ───────────────────────────────────────────────────
  const RowL = ({ k, v }) => (
    <div className="flex gap-2 text-sm mb-1">
      <span className="text-gray-400 w-28 flex-shrink-0">{k}</span>
      <span className="font-medium text-gray-800">{v || '—'}</span>
    </div>
  )

  // ── styles สำหรับเอกสารพิมพ์ ─────────────────────────────────────
  const pParty = { background:'#f9fafb', border:'1px solid #eef0f3', borderRadius:10, padding:'12px 14px', marginBottom:10 }
  const pH3    = { fontSize:12, color:'#0ea5e9', fontWeight:800, marginBottom:6, textTransform:'uppercase', letterSpacing:'.5px' }
  const pRow   = { display:'flex', gap:8, marginBottom:3 }
  const pK     = { width:130, color:'#6b7280', flexShrink:0 }
  const pV     = { fontWeight:600 }
  const pSec   = { fontSize:13, fontWeight:800, margin:'14px 0 4px' }
  const pTd    = { padding:'5px 8px', borderBottom:'1px solid #f1f3f5' }
  const pTdR   = { ...pTd, textAlign:'right', fontWeight:700 }

  const SignBlock = ({ role, name, img }) => (
    <div style={{ textAlign:'center', width:'46%' }}>
      {img ? <img src={img} alt="" style={{ height:46, objectFit:'contain', display:'block', margin:'0 auto 2px' }} />
           : <div style={{ height:46 }} />}
      <div style={{ borderBottom:'1px dotted #9ca3af', marginBottom:6 }} />
      <div style={{ fontSize:12, color:'#6b7280' }}>{role}</div>
      <div style={{ fontSize:12, fontWeight:600, marginTop:2 }}>( {name || '..............................'} )</div>
    </div>
  )

  return (
    <>
      {/* ── พรีวิว + เซ็น (บนจอ) ───────────────────────────────────── */}
      <div className="hc-screen-only fixed inset-0 z-[10000] bg-black/40 flex items-center justify-center p-4"
        onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={e => e.stopPropagation()}>

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
              <p className="text-[11px] text-gray-400 mt-1">ลูกค้าเซ็นนิ้ว/เมาส์ตรงนี้ แล้วกดพิมพ์ — ลายเซ็นจะอยู่ในไฟล์ PDF (หรือเว้นว่างไว้เซ็นบนกระดาษก็ได้)</p>
            </div>
          </div>

          <div className="flex gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">
              ปิด
            </button>
            <button onClick={handlePrint}
              className="flex-[2] py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              พิมพ์ / บันทึก PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── เอกสารสำหรับพิมพ์ (ซ่อนบนจอ โผล่ตอน print) ─────────────── */}
      <div id="hc-contract-print" style={{ fontFamily:"'Sarabun','Sukhumvit Set','Prompt',sans-serif", color:'#1f2937', fontSize:13, lineHeight:1.5 }}>
        <div style={{ textAlign:'center', marginBottom:14 }}>
          <div style={{ fontSize:20, fontWeight:800 }}>หนังสือสัญญาเช่าอุปกรณ์ถ่ายภาพ</div>
          <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{LESSOR.name}</div>
          <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>เลขที่สัญญา {contractNo}</div>
        </div>
        <div style={{ textAlign:'right', fontSize:12, color:'#6b7280', marginBottom:10 }}>
          ทำที่ {LESSOR.address} · วันที่ {todayStr}
        </div>

        <div style={pParty}>
          <div style={pH3}>ผู้ให้เช่า</div>
          <div style={pRow}><span style={pK}>ชื่อ</span><span style={pV}>{LESSOR.name}</span></div>
          <div style={pRow}><span style={pK}>ที่อยู่</span><span style={pV}>{LESSOR.address}</span></div>
          <div style={pRow}><span style={pK}>โทร</span><span style={pV}>{LESSOR.phone}</span></div>
        </div>

        <div style={pParty}>
          <div style={pH3}>ผู้เช่า</div>
          <div style={pRow}><span style={pK}>ชื่อ</span><span style={pV}>{cust.name || '—'}</span></div>
          <div style={pRow}><span style={pK}>เลขบัตรประชาชน</span><span style={pV}>{cust.id_card || '—'}</span></div>
          <div style={pRow}><span style={pK}>โทร</span><span style={pV}>{cust.phone || '—'}</span></div>
          <div style={pRow}><span style={pK}>ที่อยู่</span><span style={pV}>{cust.address || '—'}</span></div>
        </div>

        <div style={pSec}>รายการอุปกรณ์ที่เช่า</div>
        <div style={pParty}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            {cam.image_url
              ? <img src={cam.image_url} alt="" style={{ width:64, height:64, objectFit:'cover', borderRadius:8, border:'1px solid #e5e7eb' }} />
              : <div style={{ width:64, height:64, borderRadius:8, background:'#f3f4f6' }} />}
            <div>
              <div style={pRow}><span style={pK}>อุปกรณ์</span><span style={pV}>{cam.name || '—'}{cam.brand ? ' · ' + cam.brand : ''}</span></div>
              <div style={pRow}><span style={pK}>ระยะเวลาเช่า</span><span style={pV}>{fmtDate(rental.start_date)} {fmtTime(rental.pickup_time)} ถึง {fmtDate(rental.end_date)} {fmtTime(rental.return_time)} ({days} วัน)</span></div>
            </div>
          </div>
        </div>

        <div style={pSec}>ค่าใช้จ่าย</div>
        <table style={{ width:'100%', borderCollapse:'collapse', marginTop:6 }}>
          <tbody>
            <tr><td style={pTd}>ค่าเช่า ({baht(pricePerDay)} × {days} วัน)</td><td style={pTdR}>{baht(pricePerDay * days)}</td></tr>
            {deliveryFee > 0 && <tr><td style={pTd}>ค่าจัดส่ง</td><td style={pTdR}>{baht(deliveryFee)}</td></tr>}
            <tr><td style={pTd}>ค่าจอง/มัดจำ</td><td style={pTdR}>{baht(deposit)}</td></tr>
            <tr><td style={pTd}>ค่าประกันความเสียหาย</td><td style={pTdR}>{baht(insurance)}</td></tr>
            <tr><td style={{ borderTop:'2px solid #111827', fontWeight:800, fontSize:14, paddingTop:8 }}>รวมค่าเช่าสุทธิ</td>
                <td style={{ borderTop:'2px solid #111827', fontWeight:800, fontSize:14, paddingTop:8, textAlign:'right' }}>{baht(totalPrice)}</td></tr>
          </tbody>
        </table>

        <div style={pSec}>ข้อตกลงและเงื่อนไข</div>
        <ol style={{ margin:'8px 0 0 18px' }}>
          {TERMS.map((t, i) => <li key={i} style={{ marginBottom:5 }}>{t}</li>)}
        </ol>

        <div style={{ display:'flex', justifyContent:'space-around', gap:24, marginTop:40 }}>
          <SignBlock role="ลงชื่อ ผู้เช่า" name={cust.name} img={sigImg} />
          <SignBlock role="ลงชื่อ ผู้ให้เช่า" name={LESSOR.name} img="" />
        </div>
      </div>

      <style>{`
        #hc-contract-print { display: none; }
        @media screen {
          #hc-contract-print { display: none !important; }
        }
        @media print {
          .hc-screen-only { display: none !important; }
          body * { visibility: hidden !important; }
          #hc-contract-print, #hc-contract-print * { visibility: visible !important; }
          #hc-contract-print {
            display: block !important;
            position: absolute; left: 0; top: 0; width: 100%;
            padding: 0; margin: 0; background: #fff;
          }
          @page { size: A4; margin: 14mm 16mm; }
        }
      `}</style>
    </>
  )
}
