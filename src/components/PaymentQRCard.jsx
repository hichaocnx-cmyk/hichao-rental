import { useMemo, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { makeQR } from '../lib/qr'
import { promptPayPayload, merchantPayload, parsePromptPayId, formatPromptPayId } from '../lib/promptpay'
import { SHOP_PAYMENT } from '../lib/shopPayment'
import { groupRentals } from '../lib/rentalGroup'

/* ══════════════════════════════════════════════════════════════
   การ์ด "สแกนจ่ายเงิน" (QR ร้านค้า K SHOP) — อยู่หน้าแรกแทนปฏิทินเดิม
   - ใส่ยอด → ลูกค้าสแกนแล้วยอดขึ้นเองในแอปธนาคาร
   - กดชื่อลูกค้าที่มารับกล้องวันนี้ → ยอด "ชำระวันรับ" เติมให้อัตโนมัติ
   - เต็มจอ = ยื่นมือถือ/แท็บเล็ตให้ลูกค้าสแกน · แชร์ = ส่งรูป QR ทาง LINE
   QR สร้างในเครื่องเอง ไม่ต้องใช้เน็ตโหลดอะไรเพิ่ม
   ══════════════════════════════════════════════════════════════ */

const LS_KEY = 'hichao.promptpayId'
const readLS = () => { try { return localStorage.getItem(LS_KEY) || '' } catch { return '' } }
const writeLS = (v) => { try { v ? localStorage.setItem(LS_KEY, v) : localStorage.removeItem(LS_KEY) } catch {} }

const money = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// รับเฉพาะตัวเลข + จุดทศนิยม 1 จุด ไม่เกิน 2 ตำแหน่ง
const cleanAmount = (raw) => {
  let s = String(raw).replace(/[^\d.]/g, '')
  const i = s.indexOf('.')
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, 2)
  if (s.startsWith('.')) s = '0' + s
  return s.slice(0, 10)
}

// ── ตัววาด QR เป็น SVG (คมทุกขนาดจอ) ───────────────────────────
// ข้อความยาว (QR ร้านค้า ~380 ตัว) ใช้ระดับ M จุดจะได้ไม่ถี่เกินไปจนกล้องอ่านยาก · สั้นใช้ H
const eclFor = (text) => (text.length > 150 ? 'M' : 'H')
const logoFrac = (ecl) => (ecl === 'H' ? 0.22 : 0.13)

function QRSvg({ text, className = '', logo = true }) {
  const ecl = eclFor(text)
  const qr = useMemo(() => makeQR(text, ecl), [text, ecl])
  const q = 4                       // ขอบขาวรอบ QR (quiet zone)
  const n = qr.size + q * 2
  let d = ''
  for (let r = 0; r < qr.size; r++) for (let c = 0; c < qr.size; c++)
    if (qr.get(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`
  const L = qr.size * logoFrac(ecl)  // โลโก้กลาง (เล็กพอให้ระบบกันเสียของ QR กู้คืนได้สบาย)
  const lx = (n - L) / 2
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className={className} shapeRendering="crispEdges" role="img" aria-label="QR พร้อมเพย์">
      <rect width={n} height={n} fill="#fff" />
      <path d={d} fill="#111827" />
      {logo && (
        <>
          <rect x={lx - 0.6} y={lx - 0.6} width={L + 1.2} height={L + 1.2} rx={1.4} fill="#fff" />
          <image href="/logo.png" x={lx} y={lx} width={L} height={L} preserveAspectRatio="xMidYMid meet" />
        </>
      )}
    </svg>
  )
}

// ── สร้างรูป PNG ไว้แชร์ / ดาวน์โหลด ─────────────────────────────
async function buildShareImage({ text, amount, name, idLabel }) {
  const W = 1080, H = 1400
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d')
  const font = (w, s) => `${w} ${s}px 'IBM Plex Sans Thai','Leelawadee UI','Noto Sans Thai',Tahoma,sans-serif`
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#C9376B'; g.fillRect(0, 0, W, 170)
  g.fillStyle = '#ffffff'; g.textAlign = 'center'
  g.font = font(700, 54); g.fillText('สแกนจ่ายได้ทุกแอปธนาคาร', W / 2, 108)

  const ecl = eclFor(text)
  const qr = makeQR(text, ecl)
  const box = 760, x0 = (W - box) / 2, y0 = 230
  const cell = box / (qr.size + 8)
  g.fillStyle = '#111827'
  for (let r = 0; r < qr.size; r++) for (let c = 0; c < qr.size; c++)
    if (qr.get(r, c)) g.fillRect(Math.floor(x0 + (c + 4) * cell), Math.floor(y0 + (r + 4) * cell), Math.ceil(cell), Math.ceil(cell))
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = '/logo.png' })
    const L = qr.size * logoFrac(ecl) * cell, lx = x0 + (box - L) / 2, ly = y0 + (box - L) / 2
    g.fillStyle = '#ffffff'; g.fillRect(lx - cell * 0.6, ly - cell * 0.6, L + cell * 1.2, L + cell * 1.2)
    const s = Math.min(L / img.width, L / img.height)
    g.drawImage(img, lx + (L - img.width * s) / 2, ly + (L - img.height * s) / 2, img.width * s, img.height * s)
  } catch { /* ไม่มีโลโก้ก็ได้ */ }

  g.textAlign = 'center'
  if (amount) {
    g.fillStyle = '#A82B57'; g.font = font(700, 92); g.fillText(`฿${money(amount)}`, W / 2, 1110)
  } else {
    g.fillStyle = '#6b7280'; g.font = font(500, 44); g.fillText('กรอกยอดเงินในแอปธนาคาร', W / 2, 1100)
  }
  g.fillStyle = '#111827'; g.font = font(700, 48); g.fillText(name, W / 2, 1215)
  g.fillStyle = '#6b7280'; g.font = font(500, 36); g.fillText(idLabel, W / 2, 1280)
  return await new Promise((res) => cv.toBlob(res, 'image/png'))
}

// ── จอเต็มสำหรับยื่นให้ลูกค้าสแกน ────────────────────────────────
function FullScreenQR({ text, amount, name, idLabel, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center px-6 py-8 text-center"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 24px)', paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
      <button type="button" onClick={onClose} aria-label="ปิด"
        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
        style={{ top: 'max(env(safe-area-inset-top), 16px)' }}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
      <p className="text-sm font-semibold text-brand-500 tracking-wide">สแกนจ่ายได้ทุกแอปธนาคาร</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{name}</p>
      <div className="mt-5 p-3 rounded-3xl border-2 border-brand-100 bg-white">
        <QRSvg text={text} className="block" />
      </div>
      <style>{`.hc-fsqr svg{width:min(78vw,58dvh,460px);height:auto}`}</style>
      {amount
        ? <p className="mt-6 text-4xl sm:text-5xl font-bold text-brand-700 tabular-nums">฿{money(amount)}</p>
        : <p className="mt-6 text-base text-gray-500">กรอกยอดเงินในแอปธนาคาร</p>}
      <p className="mt-2 text-sm text-gray-400">{idLabel}</p>
    </div>
  )
}

export default function PaymentQRCard({ pickups = [] }) {
  const [localId, setLocalId] = useState(readLS)
  const merchant = SHOP_PAYMENT.merchantQR || ''        // มี QR ร้านค้า (K SHOP) → ใช้อันนี้เป็นหลัก
  const ppId = SHOP_PAYMENT.promptpayId || localId
  const valid = !!merchant || !!parsePromptPayId(ppId)
  const [editing, setEditing] = useState(!valid)
  const [draft, setDraft] = useState(ppId)
  const [amount, setAmount] = useState('')
  const [picked, setPicked] = useState(null)
  const [full, setFull] = useState(false)
  const [sharing, setSharing] = useState(false)

  const name = SHOP_PAYMENT.name
  const idLabel = merchant ? SHOP_PAYMENT.note : `พร้อมเพย์ ${formatPromptPayId(ppId)}`
  const amt = Number(amount) > 0 ? Number(amount) : 0
  const text = useMemo(() => {
    if (merchant) return merchantPayload(merchant, amt)
    return valid ? promptPayPayload(ppId, amt) : ''
  }, [merchant, valid, ppId, amt])

  // ลูกค้าที่มารับกล้องวันนี้ (รวมชุดที่เช่าหลายตัวเป็นยอดเดียว)
  const chips = useMemo(() => groupRentals(pickups)
    .map(g => ({ key: g.key, who: g.lead.customer?.name || 'ลูกค้า', count: g.count, due: g.totals.dueOnPickup }))
    .filter(c => c.due > 0), [pickups])

  const saveId = () => {
    if (!parsePromptPayId(draft)) return
    writeLS(draft.replace(/\D/g, '')); setLocalId(draft.replace(/\D/g, '')); setEditing(false)
  }

  const pickChip = (c) => {
    if (picked === c.key) { setPicked(null); setAmount(''); return }
    setPicked(c.key); setAmount(String(c.due))
  }

  const closeFull = useCallback(() => setFull(false), [])

  const share = async () => {
    setSharing(true)
    try {
      const blob = await buildShareImage({ text, amount: amt, name, idLabel })
      const file = new File([blob], `HICHAO-QR${amt ? '-' + amt : ''}.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'QR จ่ายเงิน HICHAO.CNX' })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = file.name; a.click()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
      }
    } catch { /* ผู้ใช้กดยกเลิก */ }
    finally { setSharing(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* หัวการ์ด */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800">สแกนจ่ายเงิน</h3>
          <p className="text-xs text-gray-400 truncate">{name} · สแกนได้ทุกแอปธนาคาร</p>
        </div>
        {valid && !merchant && !SHOP_PAYMENT.promptpayId && !editing && (
          <button type="button" onClick={() => { setDraft(ppId); setEditing(true) }}
            className="text-xs text-gray-400 hover:text-brand-500 font-medium">เปลี่ยนเลข</button>
        )}
      </div>

      {/* ยังไม่มีเลขพร้อมเพย์ → ช่องตั้งค่า */}
      {(!valid || editing) ? (
        <div className="p-5">
          <div className="rounded-2xl border-2 border-dashed border-brand-100 bg-brand-50/40 p-5 text-center">
            <p className="text-sm font-semibold text-gray-800">ใส่เลขพร้อมเพย์ของร้าน</p>
            <p className="text-xs text-gray-500 mt-1">เบอร์มือถือ 10 หลัก หรือ เลขบัตรประชาชน 13 หลัก</p>
            <input value={draft} onChange={e => setDraft(e.target.value)} inputMode="numeric" autoComplete="off"
              placeholder="เช่น 081-234-5678"
              onKeyDown={e => { if (e.key === 'Enter') saveId() }}
              className="mt-4 w-full h-12 rounded-xl border border-gray-200 bg-white px-4 text-center tracking-wider focus:outline-none focus:border-brand-400" />
            {draft && !parsePromptPayId(draft) && (
              <p className="text-[11px] text-amber-600 mt-2">เลขยังไม่ครบ — ต้องเป็น 10 หลัก (ขึ้นต้น 0) หรือ 13 หลัก</p>
            )}
            <div className="flex gap-2 mt-4">
              {valid && (
                <button type="button" onClick={() => setEditing(false)}
                  className="flex-1 h-11 rounded-xl border border-gray-200 text-sm text-gray-600">ยกเลิก</button>
              )}
              <button type="button" onClick={saveId} disabled={!parsePromptPayId(draft)}
                className="flex-[2] h-11 rounded-xl bg-brand-500 text-white text-sm font-semibold disabled:opacity-40">บันทึก</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5">
          {/* QR */}
          <button type="button" onClick={() => setFull(true)} aria-label="แสดง QR เต็มจอ"
            className="group block mx-auto p-2.5 rounded-3xl border-2 border-brand-100 bg-white hover:border-brand-200 transition-colors">
            <QRSvg text={text} className="block w-[240px] h-[240px] sm:w-[260px] sm:h-[260px]" />
          </button>

          <div className="text-center mt-3">
            {amt
              ? <p className="text-2xl font-bold text-brand-700 tabular-nums">฿{money(amt)}</p>
              : <p className="text-sm text-gray-400 py-1">ลูกค้ากรอกยอดเองในแอปธนาคาร</p>}
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-semibold text-gray-700">{name}</span> · {idLabel}
            </p>
          </div>

          {/* ใส่ยอด */}
          <div className="mt-4 flex items-center gap-2 h-12 rounded-xl border border-gray-200 bg-gray-50/60 px-3 focus-within:border-brand-400 focus-within:bg-white transition-colors">
            <span className="text-gray-400 font-semibold">฿</span>
            <input value={amount} inputMode="decimal" autoComplete="off" placeholder="ใส่ยอดเงิน (ไม่ใส่ก็ได้)"
              onChange={e => { setAmount(cleanAmount(e.target.value)); setPicked(null) }}
              className="flex-1 min-w-0 bg-transparent outline-none text-gray-900 font-semibold tabular-nums placeholder:font-normal placeholder:text-gray-400" />
            {amount && (
              <button type="button" onClick={() => { setAmount(''); setPicked(null) }} aria-label="ล้างยอด"
                className="w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {/* ยอดลูกค้ารับกล้องวันนี้ */}
          {chips.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] text-gray-400 mb-1.5">ยอดชำระวันรับ · ลูกค้าวันนี้</p>
              <div className="flex flex-wrap gap-1.5">
                {chips.map(c => (
                  <button key={c.key} type="button" onClick={() => pickChip(c)}
                    className={`max-w-full px-3 py-1.5 rounded-full text-xs font-medium border transition-colors truncate
                      ${picked === c.key ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-200'}`}>
                    {c.who}{c.count > 1 ? ` (${c.count} ตัว)` : ''} · ฿{Number(c.due).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ปุ่ม */}
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={share} disabled={sharing}
              className="flex-1 h-11 rounded-xl border border-brand-200 text-brand-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-brand-50 disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" /></svg>
              {sharing ? 'กำลังทำรูป…' : 'แชร์ / ส่ง LINE'}
            </button>
            <button type="button" onClick={() => setFull(true)}
              className="flex-1 h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
              แสดงเต็มจอ
            </button>
          </div>
        </div>
      )}

      {/* portal ไปที่ body — กันโดนกล่องแม่ที่มี transform/overflow ครอบจนไม่เต็มจอ */}
      {full && valid && createPortal(
        <div className="hc-fsqr">
          <FullScreenQR text={text} amount={amt} name={name} idLabel={idLabel} onClose={closeFull} />
        </div>,
        document.body
      )}
    </div>
  )
}
