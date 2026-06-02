import { useState, useRef } from 'react'
import { createCamera, updateCamera, uploadCameraImage } from '../lib/cameras'

const DEFAULT_FORM = { name: '', brand: '', model: '', price_per_day: '', deposit: '', insurance: '', status: 'available', notes: '' }

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
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(camera?.image_url || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleImage = e => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        model: form.model.trim() || null,
        price_per_day: parseFloat(form.price_per_day) || 0,
        deposit: parseFloat(form.deposit) || 0,
        insurance: parseFloat(form.insurance) || 0,
        status: form.status,
        notes: form.notes.trim() || null,
        image_url: camera?.image_url || null,
      }

      let savedId = camera?.id
      if (isEdit) {
        const saved = await updateCamera(camera.id, payload)
        savedId = saved.id
      } else {
        const saved = await createCamera(payload)
        savedId = saved.id
      }

      // Upload image ถ้ามี
      if (imageFile && savedId) {
        const url = await uploadCameraImage(imageFile, savedId)
        await updateCamera(savedId, { image_url: url })
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

          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">รูปกล้อง</label>
            <div
              onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="w-full h-36 object-contain rounded-lg" />
              ) : (
                <div className="py-4">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-gray-500">คลิกเพื่ออัปโหลดรูป</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG ขนาดไม่เกิน 5MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </div>

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
