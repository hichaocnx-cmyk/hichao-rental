import { useState, useEffect } from 'react'
import { getCameras, updateCamera } from '../lib/cameras'
import { getCustomers, createCustomer } from '../lib/customers'
import { getRentals, createRental, updateRental } from '../lib/rentals'
import { sendLineNotify } from '../lib/lineNotify'
import { celebrate } from '../lib/confetti'

const EMPTY_CUSTOMER = { name: '', phone: '' }

// ── ตารางราคาตามรุ่นกล้อง ──────────────────────────────────────
const CAMERA_PRICES = {
  griii:  { 1:600,  2:1200, 3:1500, 4:2000, 5:2500, 6:3000, 7:3200, 8:3600, 9:3900, 10:4100 },
  griiix: { 1:700,  2:1400, 3:2000, 4:2200, 5:2500, 6:3000, 7:3500, 8:3800, 9:3990, 10:4200 },
  griv:   { 1:790,  2:1500, 3:2000, 4:2500, 5:3000, 6:3500, 7:3990, 8:4200, 9:4400, 10:4500 },
  canon:  { 1:299,  2:499,  3:699,  4:850,  5:1000, 6:1200, 7:1400 },
  osmo:   { 1:450,  2:850,  3:1200, 4:1550, 5:1900, 6:2200, 7:2500, 8:2800, 9:3050, 10:3300 },
}

const getCameraKey = (name) => {
  const n = name?.toLowerCase() || ''
  if (n.includes('gr iiix') || n.includes('gr3x') || n.includes('griiix')) return 'griiix'
  if (n.includes('gr iv')   || n.includes('gr4')  || n.includes('griv'))   return 'griv'
  if (n.includes('gr iii')  || n.includes('gr3')  || n.includes('griii'))  return 'griii'
  if (n.includes('ixy') || n.includes('canon ixy'))                         return 'canon'
  if (n.includes('osmo') || n.includes('pocket'))                            return 'osmo'
  return null
}

const getCameraPrice = (name, days) => {
  const key = getCameraKey(name)
  if (!key) return null
  return CAMERA_PRICES[key][days] ?? null
}

const addDays = (dateStr, n) => {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  // ใช้ local time แทน UTC เพื่อหลีกเลี่ยงปัญหา timezone
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const calcDaysFromDates = (start, end) => {
  if (!start || !end) return 1
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end   + 'T00:00:00')
  // นับแบบ "คืน": รับวันหนึ่ง คืนอีกวัน (ข้ามคืน) = 1 วัน ไม่ใช่ 2 วัน
  const d = Math.round((e - s) / 86400000)
  return d >= 1 ? d : 1
}

const rangesOverlap = (startA, endA, startB, endB) =>
  startA <= endB && startB <= endA

const fmtConflictDate = (start, end) => {
  const fmt = iso => {
    if (!iso) return '-'
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }
  return `${fmt(start)} - ${fmt(end)}`
}

export default function RentalModal({ rental = null, onClose, onSaved }) {
  const isEdit = !!rental

  const initDays = isEdit ? calcDaysFromDates(rental.start_date, rental.end_date) : 1

  const [cameras, setCameras] = useState([])
  const [customers, setCustomers] = useState([])
  const [existingRentals, setExistingRentals] = useState([])
  const [form, setForm] = useState({
    camera_id:        rental?.camera_id        || '',
    customer_id:      rental?.customer_id      || '',
    start_date:       rental?.start_date       || '',
    end_date:         rental?.end_date         || '',
    days:             String(initDays),
    pickup_time:      rental?.pickup_time      || '',
    return_time:      rental?.return_time      || '',
    pickup_location:  rental?.pickup_location  || '',
    return_location:  rental?.return_location  || '',
    deposit:          rental?.deposit          != null ? String(rental.deposit)      : '',
    delivery_fee:     rental?.delivery_fee     != null ? String(rental.delivery_fee) : '',
    discount:         rental?.discount         != null ? String(rental.discount)     : '',
    notes:            rental?.notes            || '',
  })
  const [newCustomer, setNewCustomer] = useState(EMPTY_CUSTOMER)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      getCameras().then(d => {
        const available = d.filter(c => c.status !== 'maintenance')
        if (isEdit && rental.camera_id && !available.find(c => c.id === rental.camera_id)) {
          const current = d.find(c => c.id === rental.camera_id)
          if (current) available.unshift(current)
        }
        setCameras(available)
      }),
      getCustomers().then(setCustomers),
      getRentals().then(setExistingRentals)
    ]).catch(console.error)
  }, [])

  // ตอนสร้างใหม่: start_date หรือ days เปลี่ยน → คำนวณ end_date
  useEffect(() => {
    if (!isEdit && form.start_date && form.days) {
      // N วัน = N คืน: รับวันนี้ คืนอีก N วันถัดไป (เช่น 1 วัน = รับวันนี้ คืนพรุ่งนี้)
      const n = parseInt(form.days)
      const newEnd = addDays(form.start_date, n)
      setForm(f => ({ ...f, end_date: newEnd }))
    }
  }, [form.start_date, form.days])

  // ตอนแก้ไข: end_date เปลี่ยนโดยตรง → sync form.days ให้ถูกต้อง (เพื่อคำนวณราคาถูก)
  useEffect(() => {
    if (isEdit && form.start_date && form.end_date) {
      const d = calcDaysFromDates(form.start_date, form.end_date)
      setForm(f => f.days === String(d) ? f : { ...f, days: String(d) })
    }
  }, [form.start_date, form.end_date])

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const setNC = e => setNewCustomer(f => ({ ...f, [e.target.name]: e.target.value }))

  const selectedCamera = cameras.find(c => c.id === form.camera_id)
    || (isEdit ? { name: rental.camera?.name, price_per_day: rental.price_per_day, insurance: rental.insurance } : null)

  const days = parseInt(form.days) || 1

  // ราคาเช่า: ใช้ตารางราคาถ้ามี, ไม่มีใช้ price_per_day × วัน
  const getRentalPrice = () => {
    if (!selectedCamera) return 0
    const tablePrice = getCameraPrice(selectedCamera.name, days)
    if (tablePrice != null) return tablePrice
    return days * Number(selectedCamera.price_per_day || 0)
  }

  const rentalPrice  = getRentalPrice()
  const depositAmt   = parseFloat(form.deposit)      || 0
  const deliveryFee  = parseFloat(form.delivery_fee) || 0
  const discountAmt  = parseFloat(form.discount)     || 0
  const insuranceAmt = selectedCamera ? Number(selectedCamera.insurance || 0) : 0
  const totalPrice   = Math.max(0, rentalPrice - discountAmt)
  const dueOnPickup  = Math.max(0, totalPrice - depositAmt + insuranceAmt + deliveryFee)

  const findDateConflict = () => {
    if (!form.camera_id || !form.start_date || !form.end_date) return null
    return existingRentals.find(r =>
      r.id !== rental?.id &&
      r.camera_id === form.camera_id &&
      (r.status === 'booked' || r.status === 'active') &&
      rangesOverlap(form.start_date, form.end_date, r.start_date, r.end_date)
    )
  }

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      if (!form.camera_id) throw new Error('กรุณาเลือกกล้อง')
      if (!form.start_date || !form.end_date) throw new Error('กรุณาเลือกวันที่')
      if (new Date(form.end_date) < new Date(form.start_date)) throw new Error('วันคืนต้องไม่ก่อนวันรับ')
      const conflict = findDateConflict()
      if (conflict) {
        const cam = conflict.camera?.name || selectedCamera?.name || 'กล้องนี้'
        const cust = conflict.customer?.name ? ` (${conflict.customer.name})` : ''
        throw new Error(`${cam} มีคิวชนวันที่ ${fmtConflictDate(conflict.start_date, conflict.end_date)}${cust}`)
      }

      let customerId = form.customer_id
      if (!isEdit) {
        if (!newCustomer.name.trim()) throw new Error('กรุณาใส่ชื่อลูกค้า')
        const created = await createCustomer({
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim() || null,
        })
        customerId = created.id
      }
      if (!customerId) throw new Error('กรุณากรอกข้อมูลลูกค้า')

      const pricePerDay = getCameraKey(selectedCamera?.name)
        ? (days > 0 ? Math.round(rentalPrice / days) : 0)
        : Number(selectedCamera?.price_per_day || 0)

      const payload = {
        camera_id:       form.camera_id,
        customer_id:     customerId,
        start_date:      form.start_date,
        end_date:        form.end_date,
        pickup_time:     form.pickup_time || null,
        return_time:     form.return_time || null,
        pickup_location: form.pickup_location.trim() || null,
        return_location: form.return_location.trim() || null,
        price_per_day:   pricePerDay,
        deposit:         depositAmt,
        insurance:       insuranceAmt,
        delivery_fee:    deliveryFee,
        discount:        discountAmt,
        due_on_pickup:   dueOnPickup,
        total_price:     totalPrice,
        notes:           form.notes.trim() || null,
      }

      const camName = selectedCamera?.name || rental?.camera?.name || 'กล้อง'
      const custObj = isEdit ? customers.find(c => c.id === customerId) || rental?.customer : newCustomer
      const custName = custObj?.name || '—'
      const custPhone = custObj?.phone || '—'

      const fmtDate = iso => {
        if (!iso) return '—'
        const [y, m, d] = iso.split('-')
        return `${d}/${m}/${y}`
      }
      const fmtTime = t => t || '—'
      const buildLineMsg = (header) =>
        `${header}\n` +
        `📷 ${camName}\n` +
        `👤 ${custName}\n` +
        `📞 ${custPhone}\n` +
        `\n📅 รับกล้อง: ${fmtDate(form.start_date)}  เวลา ${fmtTime(form.pickup_time)}\n` +
        `📅 คืนกล้อง: ${fmtDate(form.end_date)}  เวลา ${fmtTime(form.return_time)}\n` +
        `📍 สถานที่รับ: ${form.pickup_location || '—'}\n` +
        `📍 สถานที่คืน: ${form.return_location || '—'}\n` +
        `\n🗓 ระยะเช่า: ${days} วัน\n` +
        `💰 ราคาเช่า: ฿${rentalPrice.toLocaleString()}\n` +
        (discountAmt > 0 ? `🎁 ส่วนลด: −฿${discountAmt.toLocaleString()}\n` : '') +
        `🔒 ค่าจองมัดจำ: ฿${depositAmt.toLocaleString()}\n` +
        `🛡 ค่าประกัน: ฿${insuranceAmt.toLocaleString()}\n` +
        (deliveryFee > 0 ? `🚚 ค่าส่ง: ฿${deliveryFee.toLocaleString()}\n` : '') +
        `✅ จ่ายวันรับกล้อง: ฿${dueOnPickup.toLocaleString()}`

      let savedId = isEdit ? rental.id : null
      if (isEdit) {
        const cameraChanged = form.camera_id !== rental.camera_id
        await updateRental(rental.id, payload)
        if (cameraChanged && rental.status === 'active') {
          try {
            await updateCamera(rental.camera_id, { status: 'available' })
            await updateCamera(form.camera_id, { status: 'rented' })
          } catch (camErr) {
            // rollback rental ถ้า camera update ล้มเหลว
            await updateRental(rental.id, {
              camera_id: rental.camera_id,
              ...Object.fromEntries(
                ['start_date','end_date','pickup_time','return_time','pickup_location','return_location',
                 'price_per_day','deposit','insurance','delivery_fee','discount','due_on_pickup','total_price','notes']
                .map(k => [k, rental[k]])
              )
            }).catch(() => {})
            throw new Error('อัปเดตสถานะกล้องล้มเหลว กรุณาลองใหม่: ' + camErr.message)
          }
        }
        sendLineNotify(buildLineMsg('[HICHAO.CNX] ✏️ แก้ไขรายการเช่า')).catch(console.warn)
      } else {
        const newRental = await createRental({ ...payload, status: 'booked' })
        savedId = newRental.id
        celebrate()
        sendLineNotify(buildLineMsg('[HICHAO.CNX] 🟡 จองใหม่!')).catch(console.warn)
      }
      onSaved(savedId, !isEdit)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
  const labelCls = "block text-xs font-medium text-gray-500 mb-1"

  const SectionHead = ({ n, label }) => (
    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
      <span className="w-5 h-5 bg-brand-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">{n}</span>
      {label}
    </h4>
  )

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Sheet wrapper — flex column so header+footer stay fixed, content scrolls */}
      <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '92dvh' }}>

        {/* ── Drag handle (mobile) ── */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* ── Header (sticky) ── */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? 'แก้ไขรายการเช่า' : 'สร้างรายการเช่า'}
          </h3>
          <button type="button" onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable form body ── */}
        <form id="rental-form" onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-5"
          style={{ WebkitOverflowScrolling: 'touch' }}>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
          )}

          {/* ── 1. กล้อง ── */}
          <section>
            <SectionHead n="1" label="เลือกกล้อง" />
            <div className="space-y-3">
              <select name="camera_id" value={form.camera_id} onChange={set} required className={inputCls}>
                <option value="">— เลือกกล้อง —</option>
                {cameras.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Day picker — 5×2 grid */}
              <div>
                <label className={labelCls}>จำนวนวันเช่า</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1,2,3,4,5,6,7,8,9,10].map(d => {
                    const price       = getCameraPrice(selectedCamera?.name, d)
                    const isSelected  = form.days === String(d)
                    const unavailable = price === null && getCameraKey(selectedCamera?.name) !== null
                    return (
                      <button key={d} type="button" disabled={unavailable}
                        onClick={() => setForm(f => ({ ...f, days: String(d) }))}
                        className={`py-2 rounded-xl border text-xs font-medium transition-colors flex flex-col items-center gap-0.5
                          ${unavailable
                            ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                            : isSelected
                              ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-brand-400'}`}
                      >
                        <span className="font-semibold">{d}</span>
                        <span className={`text-[9px] leading-none ${isSelected ? 'text-brand-100' : 'text-gray-400'}`}>
                          {price != null ? `฿${price >= 1000 ? (price/1000).toFixed(1)+'k' : price}` : 'วัน'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Price badge */}
              {rentalPrice > 0 && (
                <div className="flex items-center gap-2 text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2">
                  <svg className="w-4 h-4 flex-shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span className="text-xs">{selectedCamera?.name} · {days} วัน: <strong className="text-brand-600">฿{rentalPrice.toLocaleString()}</strong></span>
                </div>
              )}
            </div>
          </section>

          {/* ── 2. ลูกค้า ── */}
          <section>
            <SectionHead n="2" label="ข้อมูลลูกค้า" />
            {isEdit ? (
              <select name="customer_id" value={form.customer_id} onChange={set} className={inputCls}>
                <option value="">— เลือกลูกค้า —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className={labelCls}>ชื่อ-นามสกุล <span className="text-red-400">*</span></label>
                  <input name="name" value={newCustomer.name} onChange={setNC}
                    placeholder="ชื่อ นามสกุล" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>เบอร์โทร</label>
                  <input name="phone" value={newCustomer.phone} onChange={setNC} type="tel"
                    placeholder="0812345678" inputMode="tel" className={inputCls} />
                </div>
              </div>
            )}
          </section>

          {/* ── 3. วันที่ ── */}
          <section>
            <SectionHead n="3" label="วันที่และเวลา" />
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>วันรับ <span className="text-red-400">*</span></label>
                  <input type="date" name="start_date" value={form.start_date} onChange={set} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>เวลารับ</label>
                  <input type="time" name="pickup_time" value={form.pickup_time} onChange={set} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>วันคืน <span className="text-red-400">*</span></label>
                  <input type="date" name="end_date" value={form.end_date} onChange={set} min={form.start_date} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>เวลาคืน</label>
                  <input type="time" name="return_time" value={form.return_time} onChange={set} className={inputCls} />
                </div>
              </div>
            </div>
          </section>

          {/* ── 4. สถานที่ ── */}
          <section>
            <SectionHead n="4" label="สถานที่" />
            <div className="space-y-2">
              <div>
                <label className={labelCls}>สถานที่รับกล้อง</label>
                <input name="pickup_location" value={form.pickup_location} onChange={set}
                  placeholder="ร้าน HICHAO.CNX / ส่งถึงที่" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>สถานที่คืนกล้อง</label>
                <input name="return_location" value={form.return_location} onChange={set}
                  placeholder="ร้าน HICHAO.CNX / รับถึงที่" className={inputCls} />
              </div>
            </div>
          </section>

          {/* ── 5. ราคา ── */}
          <section>
            <SectionHead n="5" label="ราคา" />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelCls}>มัดจำ (฿)</label>
                <input type="number" name="deposit" value={form.deposit} onChange={set}
                  min="0" inputMode="numeric" placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>ค่าส่ง (฿)</label>
                <input type="number" name="delivery_fee" value={form.delivery_fee} onChange={set}
                  min="0" inputMode="numeric" placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>ส่วนลด (฿)</label>
                <input type="number" name="discount" value={form.discount} onChange={set}
                  min="0" inputMode="numeric" placeholder="0" className={inputCls} />
              </div>
            </div>

            {/* สรุปยอด */}
            {rentalPrice > 0 && (
              <div className="mt-3 bg-brand-50 rounded-xl p-3.5 space-y-1.5 border border-brand-100">
                <p className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider mb-2">สรุปยอด</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>ราคาเช่า ({days} วัน)</span>
                  <span className="font-medium text-gray-800">฿{rentalPrice.toLocaleString()}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>ส่วนลด</span><span>−฿{discountAmt.toLocaleString()}</span>
                  </div>
                )}
                {depositAmt > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>หักมัดจำ</span><span>−฿{depositAmt.toLocaleString()}</span>
                  </div>
                )}
                {insuranceAmt > 0 && (
                  <div className="flex justify-between text-xs text-orange-500">
                    <span>ค่าประกัน</span><span>+฿{insuranceAmt.toLocaleString()}</span>
                  </div>
                )}
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-xs text-blue-500">
                    <span>ค่าส่ง</span><span>+฿{deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-brand-200 pt-2 mt-1">
                  <p className="text-sm font-semibold text-gray-900">จ่ายวันรับกล้อง</p>
                  <span className="text-xl font-bold text-brand-600">฿{dueOnPickup.toLocaleString()}</span>
                </div>
              </div>
            )}
          </section>

          {/* ── หมายเหตุ ── */}
          <div>
            <label className={labelCls}>หมายเหตุ</label>
            <textarea name="notes" value={form.notes} onChange={set} rows={2}
              placeholder="หมายเหตุเพิ่มเติม..."
              className={`${inputCls} resize-none`} />
          </div>

          {/* bottom spacer so last input isn't hidden behind footer */}
          <div className="h-2" />
        </form>

        {/* ── Footer buttons (fixed at bottom) ── */}
        <div className="flex gap-2 px-4 sm:px-5 py-3 border-t border-gray-100 flex-shrink-0 bg-white">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
            ยกเลิก
          </button>
          <button form="rental-form" type="submit" disabled={saving}
            className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-brand-100">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />บันทึก...</>
              : isEdit ? 'บันทึกการแก้ไข' : 'สร้างรายการเช่า'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
