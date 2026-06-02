import { useState } from 'react'
import { createCustomer, updateCustomer } from '../lib/customers'

const DEFAULT = { name: '', phone: '', line_id: '', id_card: '', address: '', notes: '' }

export default function CustomerModal({ customer, onClose, onSaved }) {
  const isEdit = !!customer
  const [form, setForm] = useState(isEdit ? {
    name: customer.name || '', phone: customer.phone || '', line_id: customer.line_id || '',
    id_card: customer.id_card || '', address: customer.address || '', notes: customer.notes || ''
  } : DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const payload = { name: form.name.trim(), phone: form.phone.trim() || null, line_id: form.line_id.trim() || null, id_card: form.id_card.trim() || null, address: form.address.trim() || null, notes: form.notes.trim() || null }
      isEdit ? await updateCustomer(customer.id, payload) : await createCustomer(payload)
      onSaved()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{isEdit ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
            <input name="name" value={form.name} onChange={handleChange} required placeholder="ชื่อ นามสกุล" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">เบอร์โทร</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="0812345678" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">LINE ID</label>
              <input name="line_id" value={form.line_id} onChange={handleChange} placeholder="@lineid" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">เลขบัตรประชาชน</label>
            <input name="id_card" value={form.id_card} onChange={handleChange} placeholder="1-xxxx-xxxxx-xx-x" maxLength={13} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ที่อยู่</label>
            <textarea name="address" value={form.address} onChange={handleChange} rows={2} placeholder="ที่อยู่..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">หมายเหตุ</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="หมายเหตุ..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">ยกเลิก</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />บันทึก...</> : isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
