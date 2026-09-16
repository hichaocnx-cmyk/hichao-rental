import { useState } from 'react'
import { createCamera, updateCamera } from '../lib/cameras'
import { LADDER_DAYS, MAX_LADDER_DAYS } from '../lib/ladder'

const DEFAULT_FORM = { name: '', brand: '', model: '', price_per_day: '', deposit: '', insurance: '', status: 'available', notes: '' }

// ── ตารางราคาขั้นบันได ─────────────────────────────────────────
// เก็บใน cameras.price_ladder เป็น {"1":600,"2":1200,...,"15":6000}
// คีย์ = จำนวนวัน, ค่า = "ราคารวม" ของจำนวนวันนั้น (ไม่ใช่ราคาต่อวัน)
// เว้นวันไหนว่างไว้ได้ — ถ้าไม่ตั้งเลยสักวัน ระบบจะคิดราคาจาก
// "ราคาเช่า/วัน" ด้านบน × จำนวนวันแทนอัตโนมัติตอนสร้างรายการเช่า
// จำนวนวันสูงสุดอยู่ที่ src/lib/ladder.js (ใช้ร่วมกับ RentalModal)
const EMPTY_LADDER = Object.fromEntries(LADDER_DAYS.map(d => [d, '']))

function buildInitialLadder(camera) {
  const base = { ...EMPTY_LADDER }
  const existing = camera?.price_ladder
  if (existing && typeof existing === 'object') {
    for (const d of LADDER_DAYS) {
      const v = existing[String(d)]
      if (v != null) base[d] = String(v)
    }
  }
  return base
}

export default function CameraModal({ camera, onClose, onSaved }) {
  const isEdit = !!camera
  const [form, setForm] = useState(isEdit ? {
    name: camera.name || '',
    brand: camera.brand || '',
    model: camera.model || '',
    price_per_day: camera.price_per_day || '',
    deposit: camera.deposit || '',
    insurance: camera.insurance || '',
    status: camera.status || 'available',
    notes: camera.notes || '',
  } : DEFAULT_FORM)
  const [ladder, setLadder] = useState(() => buildInitialLadder(camera))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const handleLadderChange = (day, value) => setLadder(l => ({ ...l, [day]: value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      // เก็บเฉพาะวันที่กรอกเป็นตัวเลข > 0 — วันที่เว้นว่างไว้ = ไม่ตั้งราคาขั้นบันไดวันนั้น
      const ladderPayload = {}
      for (const d of LADDER_DAYS) {
        const raw = ladder[d]
        if (raw === '' || raw == null) continue
        const num = parseFloat(raw)
        if (!Number.isNaN(num) && num > 0) ladderPayload[String(d)] = num
      }

      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        model: form.model.trim() || null,
        price_per_day: parseFloat(form.price_per_day) || 0,
        deposit: parseFloat(form.deposit) || 0,
        insurance: parseFloat(form.insurance) || 0,
        status: form.status,
        notes: form.notes.trim() || null,
        // ไม่มีวันไหนตั้งเลย → null (ไม่ใช้ตารางราคา ระบบคิดจาก price_per_day × จำนวนวันแทน)
        price_ladder: Object.keys(ladderPayload).length ? ladderPayload : null,
      }

      const save = async (body) => {
        if (isEdit) await updateCamera(camera.id, body)
        else        await createCamera(body)
      }

      try {
        await save(payload)
      } catch (err) {
        // ฐานข้อมูลยังไม่มีคอลัมน์ price_ladder (ยังไม่ได้รัน migration_014)
        // → บันทึกข้อมูลกล้องส่วนที่เหลือให้สำเร็จไว้ก่อน แล้วค่อยบอกว่าตารางราคายังไม่ถูกเก็บ
        // ลบ try/catch ชั้นนี้ทิ้งได้เมื่อรัน migration_014 บน production แล้ว
        const msg = String(err?.message || '') + String(err?.details || '')
        const columnMissing = msg.includes('price_ladder') &&
          /column|schema cache|does not exist/i.test(msg)
        if (!columnMissing) throw err

        const { price_ladder, ...withoutLadder } = payload
        await save(withoutLadder)
        setError('บันทึกข้อมูลกล้องแล้ว แต่ยังเก็บ "ตารางราคาขั้นบันได" ไม่ได้ ' +
          'เพราะฐานข้อมูลยังไม่มีคอลัมน์ price_ladder — ให้รัน supabase/migration_014.sql ก่อน')
        setSaving(false)
        return
      }

      onSaved()
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{isEdit ? 'แก้ไขกล้อง' : 'เพิ่มกล้องใหม่'}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อกล้อง <span className="text-red-500">*</span></label>
            <input name="name" value={form.name} onChange={handleChange} required placeholder="เช่น Canon EOS R5" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
          </div>

          {/* Brand + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand <span className="text-red-500">*</span></label>
              <input name="brand" value={form.brand} onChange={handleChange} required placeholder="Canon, Sony..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">รุ่น</label>
              <input name="model" value={form.model} onChange={handleChange} placeholder="EOS R5, A7IV..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
            </div>
          </div>

          {/* Price + Deposit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ราคาเช่า/วัน (฿) <span className="text-red-500">*</span></label>
              <input name="price_per_day" type="number" min="0" value={form.price_per_day} onChange={handleChange} required placeholder="0" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ค่ามัดจำ (฿)</label>
              <input name="deposit" type="number" min="0" value={form.deposit} onChange={handleChange} placeholder="0" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
            </div>
          </div>

          {/* Insurance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ค่าประกัน (฿)</label>
            <input name="insurance" type="number" min="0" value={form.insurance} onChange={handleChange} placeholder="0" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
          </div>

          {/* ตารางราคาขั้นบันได */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">ตารางราคาขั้นบันได (ไม่บังคับ)</label>
              <button type="button" onClick={() => setLadder({ ...EMPTY_LADDER })}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                ล้างตาราง
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              ใส่ "ราคารวม" ของแต่ละจำนวนวัน (ไม่ใช่ราคา/วัน) ตั้งได้ถึง {MAX_LADDER_DAYS} วัน
              เว้นช่องไหนว่างไว้ได้ — ถ้าไม่ตั้งเลยสักวัน ระบบจะคิดจาก "ราคาเช่า/วัน" ด้านบน
              × จำนวนวันแทนอัตโนมัติ
            </p>
            <div className="grid grid-cols-5 gap-2">
              {LADDER_DAYS.map(d => (
                <div key={d}>
                  <label className="block text-[10px] text-gray-400 mb-1 text-center">{d} วัน</label>
                  <input
                    type="number" min="0" inputMode="numeric"
                    value={ladder[d]}
                    onChange={e => handleLadderChange(d, e.target.value)}
                    placeholder="—"
                    className="w-full px-2 py-1.5 text-xs text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">สถานะ</label>
            <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
              <option value="available">ว่าง</option>
              <option value="rented">ถูกเช่า</option>
              <option value="returned">คืนแล้ว</option>
              <option value="maintenance">ซ่อม</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">หมายเหตุ</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="รายละเอียดเพิ่มเติม..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none" />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              ยกเลิก
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />กำลังบันทึก...</>
              ) : isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มกล้อง'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
