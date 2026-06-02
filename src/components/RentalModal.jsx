import { useState, useEffect } from 'react'
import { getCameras, updateCamera } from '../lib/cameras'
import { getCustomers, createCustomer } from '../lib/customers'
import { createRental, updateRental } from '../lib/rentals'
import { sendLineNotify } from '../lib/lineNotify'

const EMPTY_CUSTOMER = { name: '', phone: '', line_id: '', id_card: '' }

// ── ตารางราคาตามรุ่นกล้อง ──────────────────────────────────────
const CAMERA_PRICES = {
  griii:  { 1:600,  2:1200, 3:1500, 4:2000, 5:2500, 6:3000, 7:3200, 8:3600, 9:3900, 10:4100 },
  griiix: { 1:700,  2:1400, 3:2000, 4:2200, 5:2500, 6:3000, 7:3500, 8:3800, 9:3990, 10:4200 },
  griv:   { 1:790,  2:1500, 3:2000, 4:2500, 5:3000, 6:3500, 7:3990, 8:4200, 9:4400, 10:4500 },
  canon:  { 1:299,  2:499,  3:699,  4:850,  5:1000, 6:1200, 7:1400 },
}

const getCameraKey = (name) => {
  const n = name?.toLowerCase() || ''
  if (n.includes('gr iiix') || n.includes('gr3x') || n.includes('griiix')) return 'griiix'
  if (n.includes('gr iv')   || n.includes('gr4')  || n.includes('griv'))   return 'griv'
  if (n.includes('gr iii')  || n.includes('gr3')  || n.includes('griii'))  return 'griii'
  if (n.includes('ixy') || n.includes('canon ixy'))                         return 'canon'
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
  const d = Math.round((e - s) / 86400000) + 1
  return d >= 1 && d <= 10 ? d : 1
}

export default function RentalModal({ rental = null, onClose, onSaved }) {
  const isEdit = !!rental

  const initDays = isEdit ? calcDaysFromDates(rental.start_date, rental.end_date) : 1

  const [cameras, setCameras] = useState([])
  const [customers, setCustomers] = useState([])
  const [customerMode, setCustomerMode] = useState('existing')
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
    deposit:          rental?.deposit          != null ? String(rental.deposit)      : '0',
    delivery_fee:     rental?.delivery_fee     != null ? String(rental.delivery_fee) : '0',
    discount:         rental?.discount         != null ? String(rental.discount)     : '0',
    notes:            rental?.notes            || '',
  })
  const [newCustomer, setNewCustomer] = useState(EMPTY_CUSTOMER)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      getCameras().then(d => {
        const available = d.filter(c => c.status === 'available' || c.status === 'returned')
        if (isEdit && rental.camera_id && !available.find(c => c.id === rental.camera_id)) {
          const current = d.find(c => c.id === rental.camera_id)
          if (current) available.unshift(current)
        }
        setCameras(available)
      }),
      getCustomers().then(setCustomers)
    ]).catch(console.error)
  }, [])

  // เมื่อ start_date หรือ days เปลี่ยน → คำนวณ end_date
  useEffect(() => {
    if (form.start_date && form.days) {
      const n = parseInt(form.days) - 1
      const newEnd = addDays(form.start_date, n)
      setForm(f => ({ ...f, end_date: newEnd }))
    }
  }, [form.start_date, form.days])

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

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      if (!form.camera_id) throw new Error('กรุณาเลือกกล้อง')
      if (!form.start_date || !form.end_date) throw new Error('กรุณาเลือกวันที่')
      if (new Date(form.end_date) < new Date(form.start_date)) throw new Error('วันคืนต้องไม่ก่อนวันรับ')

      let customerId = form.customer_id
      if (customerMode === 'new') {
        if (!newCustomer.name.trim()) throw new Error('กรุณาใส่ชื่อลูกค้า')
        const created = await createCustomer({
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim() || null,
          line_id: newCustomer.line_id.trim() || null,
          id_card: newCustomer.id_card.trim() || null,
        })
        customerId = created.id
      }
      if (!customerId) throw new Error('กรุณาเลือกหรือเพิ่มลูกค้า')

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
      const custObj = customerMode === 'new' ? newCustomer : customers.find(c => c.id === customerId)
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

      if (isEdit) {
        await updateRental(rental.id, payload)
        if (form.camera_id !== rental.camera_id) {
          await updateCamera(rental.camera_id, { status: 'available' })
          await updateCamera(form.camera_id, { status: 'rented' })
        }
        sendLineNotify(buildLineMsg('[HICHAO.CNX] ✏️ แก้ไขรายการเช่า')).catch(console.warn)
      } else {
        await createRental({ ...payload, status: 'booked' })
        await updateCamera(form.camera_id, { status: 'rented' })
        sendLineNotify(buildLineMsg('[HICHAO.CNX] 🟡 จองใหม่!')).catch(console.warn)
      }
      onSaved()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[95vh] sm:max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'แก้ไขรายการเช่า' : 'สร้างรายการเช่า'}
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-5">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          {/* ── 1. เลือกกล้อง + จำนวนวัน ── */}
          <section>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs">1</span>
              เลือกกล้อง
            </h4>
            <div className="space-y-3">
              {/* Dropdown กล้อง (ไม่แสดงราคา/วัน) */}
              <select name="camera_id" value={form.camera_id} onChange={set} required className={inputCls}>
                <option value="">-- เลือกกล้อง --</option>
                {cameras.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* จำนวนวันเช่า */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">จำนวนวันเช่า</label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {[1,2,3,4,5,6,7,8,9,10].map(d => {
                    const price      = getCameraPrice(selectedCamera?.name, d)
                    const isSelected = form.days === String(d)
                    const unavailable = price === null && getCameraKey(selectedCamera?.name) !== null
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={unavailable}
                        onClick={() => setForm(f => ({ ...f, days: String(d) }))}
                        className={`py-2.5 rounded-lg border text-xs font-medium transition-colors flex flex-col items-center gap-0.5
                          ${unavailable
                            ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                            : isSelected
                              ? 'bg-brand-500 border-brand-500 text-white'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600'}`}
                      >
                        <span>{d} วัน</span>
                        {price != null && (
                          <span className={`text-[10px] ${isSelected ? 'text-brand-100' : 'text-gray-400'}`}>
                            ฿{price.toLocaleString()}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* แสดงราคาที่เลือก */}
              {rentalPrice > 0 && (
                <div className="flex items-center gap-2 text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  <span>{selectedCamera?.name} · {days} วัน: <strong>฿{rentalPrice.toLocaleString()}</strong></span>
                </div>
              )}
            </div>
          </section>

          {/* ── 2. ลูกค้า ── */}
          <section>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs">2</span>
              ข้อมูลลูกค้า
            </h4>
            <div className="flex rounded-lg border border-gray-200 mb-3 overflow-hidden">
              <button type="button" onClick={() => setCustomerMode('existing')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${customerMode === 'existing' ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                ลูกค้าเดิม
              </button>
              <button type="button" onClick={() => setCustomerMode('new')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${customerMode === 'new' ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                + ลูกค้าใหม่
              </button>
            </div>
            {customerMode === 'existing' ? (
              <select name="customer_id" value={form.customer_id} onChange={set} className={inputCls}>
                <option value="">-- เลือกลูกค้า --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                  <input name="name" value={newCustomer.name} onChange={setNC} placeholder="ชื่อ นามสกุล" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">เบอร์โทร</label>
                    <input name="phone" value={newCustomer.phone} onChange={setNC} placeholder="0812345678" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">LINE ID</label>
                    <input name="line_id" value={newCustomer.line_id} onChange={setNC} placeholder="@lineid" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">เลขบัตรประชาชน</label>
                  <input name="id_card" value={newCustomer.id_card} onChange={setNC} placeholder="1-xxxx-xxxxx-xx-x" maxLength={13} className={inputCls} />
                </div>
              </div>
            )}
          </section>

          {/* ── 3. วันที่และเวลา ── */}
          <section>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs">3</span>
              วันที่และเวลา
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">วันรับกล้อง <span className="text-red-500">*</span></label>
                <input type="date" name="start_date" value={form.start_date} onChange={set} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">วันคืนกล้อง (คำนวณอัตโนมัติ)</label>
                <input type="date" name="end_date" value={form.end_date} onChange={set} min={form.start_date} className={`${inputCls} bg-gray-50`} readOnly />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">เวลารับกล้อง</label>
                <input type="time" name="pickup_time" value={form.pickup_time} onChange={set} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">เวลาคืนกล้อง</label>
                <input type="time" name="return_time" value={form.return_time} onChange={set} className={inputCls} />
              </div>
            </div>
          </section>

          {/* ── 4. สถานที่ ── */}
          <section>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs">4</span>
              สถานที่
            </h4>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">สถานที่รับกล้อง</label>
                <input name="pickup_location" value={form.pickup_location} onChange={set} placeholder="เช่น ร้าน HICHAO.CNX / ส่งถึงที่" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">สถานที่คืนกล้อง</label>
                <input name="return_location" value={form.return_location} onChange={set} placeholder="เช่น ร้าน HICHAO.CNX / รับถึงที่" className={inputCls} />
              </div>
            </div>
          </section>

          {/* ── 5. ราคา ── */}
          <section>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs">5</span>
              ราคา
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ค่าจองมัดจำ (฿)</label>
                <input type="number" name="deposit" value={form.deposit} onChange={set} min="0" placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ค่าส่ง (฿)</label>
                <input type="number" name="delivery_fee" value={form.delivery_fee} onChange={set} min="0" placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ส่วนลด (฿)</label>
                <input type="number" name="discount" value={form.discount} onChange={set} min="0" placeholder="0" className={inputCls} />
              </div>
            </div>

            {/* สรุปยอด */}
            {rentalPrice > 0 && (
              <div className="mt-3 bg-brand-50 rounded-xl p-4 space-y-2 text-sm border border-brand-100">
                <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-2">สรุปยอด</p>
                <div className="flex justify-between text-gray-600">
                  <span>ราคาเช่า ({days} วัน)</span>
                  <span className="font-medium text-gray-800">฿{rentalPrice.toLocaleString()}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>ส่วนลด</span>
                    <span>− ฿{discountAmt.toLocaleString()}</span>
                  </div>
                )}
                {depositAmt > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>หัก: ค่าจองมัดจำ</span>
                    <span>− ฿{depositAmt.toLocaleString()}</span>
                  </div>
                )}
                {insuranceAmt > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>บวก: ค่าประกัน</span>
                    <span>+ ฿{insuranceAmt.toLocaleString()}</span>
                  </div>
                )}
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>บวก: ค่าส่ง</span>
                    <span>+ ฿{deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t-2 border-brand-300 pt-3 mt-1">
                  <p className="font-bold text-gray-900">จ่ายวันรับกล้อง</p>
                  <span className="text-2xl font-bold text-brand-600">฿{dueOnPickup.toLocaleString()}</span>
                </div>
              </div>
            )}
          </section>

          {/* ── หมายเหตุ ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">หมายเหตุ</label>
            <textarea name="notes" value={form.notes} onChange={set} rows={2} placeholder="หมายเหตุเพิ่มเติม..." className={`${inputCls} resize-none`} />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-4 sm:pb-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">ยกเลิก</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2">
              {saving
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />บันทึก...</>
                : isEdit ? 'บันทึกการแก้ไข' : 'สร้างรายการเช่า'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
