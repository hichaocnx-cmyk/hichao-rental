import { useState, useEffect } from 'react'

// ──────────────────────────────────────────────
// Default sample recipes (โหลดครั้งแรกถ้าไม่มีใน localStorage)
// ──────────────────────────────────────────────
const SAMPLE_RECIPES = [
  {
    id: '1',
    name: 'Golden Hour',
    emoji: '🌅',
    camera: 'Ricoh GR III',
    description: 'โทนส้มอบอุ่น สีสัน rich ถ่ายแสงเย็น',
    imageControl: 'Positive Film',
    whiteBalance: 'Daylight',
    wbShift: 'A3 G0',
    saturation: '+2',
    hue: '+1',
    contrast: '0',
    sharpness: '-1',
    highlight: '-1',
    shadow: '+1',
    filterEffect: '',
    toning: '',
    notes: 'เหมาะกับแสง Golden Hour 17:00-19:00 น. ถ่ายพอร์ตเทรตหรือ Street ที่มีแสงอบอุ่น',
    tags: ['Portrait', 'Travel'],
    tagColors: ['amber', 'pink'],
    isFavorite: true,
    imgSeed: 'golden1',
    filterClass: 'sepia(30%) saturate(140%) hue-rotate(-10deg) brightness(108%)',
    bgGradient: 'linear-gradient(135deg,#F4A261,#E76F51,#264653)',
  },
  {
    id: '2',
    name: 'Street Mono',
    emoji: '🖤',
    camera: 'Ricoh GR III',
    description: 'ขาวดำ contrast สูง เงาชัด คมแบบ classic',
    imageControl: 'Monotone',
    whiteBalance: 'Auto',
    wbShift: '—',
    saturation: '—',
    hue: '—',
    contrast: '+1',
    sharpness: '+2',
    highlight: '0',
    shadow: '0',
    filterEffect: 'Yellow',
    toning: 'None',
    notes: 'ถ่าย Street กลางวัน เน้น shadow และ texture ชัดเจน',
    tags: ['Street', 'Documentary'],
    tagColors: ['slate', 'violet'],
    isFavorite: true,
    imgSeed: 'city88',
    filterClass: 'grayscale(100%) contrast(130%) brightness(95%)',
    bgGradient: 'linear-gradient(135deg,#2D3748,#718096,#E2E8F0)',
  },
  {
    id: '3',
    name: 'Soft Portrait',
    emoji: '🌸',
    camera: 'Ricoh GR IIIx',
    description: 'พาสเทล นุ่ม เหมาะถ่ายคน ในวันมีเมฆ',
    imageControl: 'Standard',
    whiteBalance: 'Cloudy',
    wbShift: 'B1 M1',
    saturation: '-1',
    hue: '0',
    contrast: '-1',
    sharpness: '-1',
    highlight: '+1',
    shadow: '-1',
    filterEffect: '',
    toning: '',
    notes: 'วันที่มีเมฆหรือแสง diffused สีพาสเทลนุ่ม เหมาะพอร์ตเทรตสาว',
    tags: ['Portrait', 'Lifestyle'],
    tagColors: ['pink', 'teal'],
    isFavorite: false,
    imgSeed: 'flower22',
    filterClass: 'saturate(70%) brightness(112%) contrast(88%)',
    bgGradient: 'linear-gradient(135deg,#FDE8E8,#FFDDE4,#E8D5F5)',
  },
  {
    id: '4',
    name: 'Film Vintage',
    emoji: '🎞',
    camera: 'Ricoh GR III',
    description: 'จำลองฟิล์ม tone น้ำตาล คลาสสิก',
    imageControl: 'Cross Process',
    whiteBalance: 'Auto',
    wbShift: 'A1 G0',
    saturation: '-1',
    hue: '-1',
    contrast: '-1',
    sharpness: '0',
    highlight: '0',
    shadow: '+1',
    filterEffect: '',
    toning: '',
    notes: 'จำลองฟิล์ม slide ย้อนยุค เหมาะถ่าย landscape หรือ object มีพื้นผิว',
    tags: ['Vintage', 'Film'],
    tagColors: ['amber', 'orange'],
    isFavorite: false,
    imgSeed: 'oldtown7',
    filterClass: 'sepia(45%) saturate(75%) contrast(90%) brightness(97%)',
    bgGradient: 'linear-gradient(135deg,#D4A96A,#A0785A,#6B4F3A)',
  },
  {
    id: '5',
    name: 'Travel Vivid',
    emoji: '🏝',
    camera: 'Ricoh GR IIIx',
    description: 'สีสดจัด เต็มตา เหมาะถ่าย landscape',
    imageControl: 'Vivid',
    whiteBalance: 'Auto',
    wbShift: '—',
    saturation: '+3',
    hue: '0',
    contrast: '+1',
    sharpness: '+1',
    highlight: '-1',
    shadow: '0',
    filterEffect: '',
    toning: '',
    notes: 'สีสดจัด เหมาะถ่าย landscape ท้องฟ้า ทะเล หรือสีสันของตลาด',
    tags: ['Landscape', 'Nature'],
    tagColors: ['blue', 'green'],
    isFavorite: false,
    imgSeed: 'ocean33',
    filterClass: 'saturate(185%) contrast(110%) brightness(103%)',
    bgGradient: 'linear-gradient(135deg,#3B82F6,#06B6D4,#10B981)',
  },
  {
    id: '6',
    name: 'Night Cinema',
    emoji: '🌃',
    camera: 'Ricoh GR III',
    description: 'กลางคืน ไฟถนน moody สีเข้ม',
    imageControl: 'Monotone',
    whiteBalance: 'Tungsten',
    wbShift: '—',
    saturation: '—',
    hue: '—',
    contrast: '+2',
    sharpness: '+1',
    highlight: '-2',
    shadow: '+1',
    filterEffect: '',
    toning: 'Warm',
    notes: 'Toning: Warm. ถ่ายกลางคืนไฟถนน neon แนะนำ ISO 3200-6400',
    tags: ['Night', 'Street'],
    tagColors: ['violet', 'slate'],
    isFavorite: false,
    imgSeed: 'nightcity5',
    filterClass: 'grayscale(80%) contrast(135%) brightness(55%) sepia(20%) hue-rotate(220deg)',
    bgGradient: 'linear-gradient(135deg,#1E1B4B,#3730A3,#6D28D9)',
  },
]

const STORAGE_KEY = 'hichao_recipes'

const TAG_COLORS = {
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700'  },
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-600'   },
  slate:  { bg: 'bg-slate-100', text: 'text-slate-600'  },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700'   },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700'   },
  green:  { bg: 'bg-green-50',  text: 'text-green-700'  },
}

const CAMERAS = ['Ricoh GR III', 'Ricoh GR IIIx']
const IMAGE_CONTROLS = ['Standard', 'Vivid', 'Monotone', 'Positive Film', 'Cross Process', 'Bleach Bypass', 'Retro', 'HDR Tone']
const FILTER_EFFECTS = ['', 'Red', 'Orange', 'Yellow', 'Green', 'Blue']
const TONINGS = ['', 'None', 'Warm', 'Cool', 'Sepia', 'Red', 'Green', 'Blue', 'Purple']
const ADJ_RANGE = ['—', '-4', '-3', '-2', '-1', '0', '+1', '+2', '+3', '+4']

function ValChip({ value }) {
  if (!value || value === '0' || value === '—') {
    return <span className="text-xs font-semibold text-gray-400">{value || '—'}</span>
  }
  const isPos = value.startsWith('+')
  const isNeg = value.startsWith('-')
  return (
    <span className={`text-xs font-bold ${isPos ? 'text-green-600' : isNeg ? 'text-red-500' : 'text-gray-700'}`}>
      {value}
    </span>
  )
}

function RecipeModal({ recipe, onClose, onSave }) {
  const isEdit = !!recipe?.id
  const [form, setForm] = useState(recipe || {
    name: '', emoji: '📷', camera: 'Ricoh GR III', description: '',
    imageControl: 'Standard', whiteBalance: 'Auto', wbShift: '—',
    saturation: '0', hue: '0', contrast: '0', sharpness: '0',
    highlight: '0', shadow: '0', filterEffect: '', toning: '',
    notes: '', tags: [], tagColors: [], isFavorite: false,
    imgSeed: '', filterClass: '', bgGradient: 'linear-gradient(135deg,#FF6B9D,#a78bfa)',
  })
  const [tagInput, setTagInput] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim()) return
    onSave({ ...form, id: form.id || String(Date.now()) })
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (!t || form.tags.includes(t)) return
    set('tags', [...(form.tags || []), t])
    set('tagColors', [...(form.tagColors || []), 'pink'])
    setTagInput('')
  }

  const removeTag = (i) => {
    set('tags', form.tags.filter((_, idx) => idx !== i))
    set('tagColors', form.tagColors.filter((_, idx) => idx !== i))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'แก้ไข Recipe' : 'สร้าง Recipe ใหม่'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Name + Emoji */}
          <div className="flex gap-3">
            <div className="w-16">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Emoji</label>
              <input
                value={form.emoji}
                onChange={e => set('emoji', e.target.value)}
                className="w-full text-center text-2xl border border-gray-200 rounded-xl px-2 py-2 focus:outline-none focus:border-brand-400"
                maxLength={2}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">ชื่อ Recipe *</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="เช่น Golden Hour"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
              />
            </div>
          </div>

          {/* Camera */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">กล้อง</label>
            <select
              value={form.camera}
              onChange={e => set('camera', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white"
            >
              {CAMERAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">คำอธิบาย</label>
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="สั้นๆ เช่น โทนอบอุ่น เหมาะถ่าย Portrait"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
            />
          </div>

          {/* Image Control + WB */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Image Control</label>
              <select
                value={form.imageControl}
                onChange={e => set('imageControl', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white"
              >
                {IMAGE_CONTROLS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">White Balance</label>
              <input
                value={form.whiteBalance}
                onChange={e => set('whiteBalance', e.target.value)}
                placeholder="Auto / Daylight / Cloudy..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
              />
            </div>
          </div>

          {/* WB Shift + Filter Effect + Toning */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">WB Shift</label>
              <input
                value={form.wbShift}
                onChange={e => set('wbShift', e.target.value)}
                placeholder="A3 G0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Filter Effect</label>
              <select
                value={form.filterEffect}
                onChange={e => set('filterEffect', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white"
              >
                {FILTER_EFFECTS.map(f => <option key={f} value={f}>{f || '—'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Toning</label>
              <select
                value={form.toning}
                onChange={e => set('toning', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white"
              >
                {TONINGS.map(t => <option key={t} value={t}>{t || '—'}</option>)}
              </select>
            </div>
          </div>

          {/* Tone adjustments */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Tone Adjustments</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'saturation', label: 'Saturation' },
                { key: 'hue',        label: 'Hue' },
                { key: 'contrast',   label: 'Contrast' },
                { key: 'sharpness',  label: 'Sharpness' },
                { key: 'highlight',  label: 'Highlight' },
                { key: 'shadow',     label: 'Shadow' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1">{label}</label>
                  <select
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-brand-400 bg-white"
                  >
                    {ADJ_RANGE.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tags (สไตล์/ใช้งาน)</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {(form.tags || []).map((tag, i) => (
                <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-500 text-xs font-medium rounded-full">
                  {tag}
                  <button onClick={() => removeTag(i)} className="text-brand-300 hover:text-brand-500">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="Portrait, Street, Landscape..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 bg-brand-500 text-white text-sm font-medium rounded-xl hover:bg-brand-600 transition-colors"
              >
                เพิ่ม
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">หมายเหตุ / เคล็ดลับ</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="สถานการณ์ที่เหมาะ, ISO แนะนำ, เวลาถ่าย..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
          >
            {isEdit ? 'บันทึก' : 'สร้าง Recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : SAMPLE_RECIPES
    } catch {
      return SAMPLE_RECIPES
    }
  })
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null) // null | 'new' | recipe object
  const [search, setSearch] = useState('')

  // บันทึกลง localStorage ทุกครั้งที่ recipes เปลี่ยน
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  }, [recipes])

  // เลือก recipe แรกเป็น default
  useEffect(() => {
    if (!selected && recipes.length > 0) setSelected(recipes[0])
  }, [recipes, selected])

  const save = (recipe) => {
    setRecipes(prev => {
      const idx = prev.findIndex(r => r.id === recipe.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = recipe; return next
      }
      return [...prev, recipe]
    })
    setSelected(recipe)
    setModal(null)
  }

  const remove = (id) => {
    setRecipes(prev => prev.filter(r => r.id !== id))
    if (selected?.id === id) setSelected(recipes.find(r => r.id !== id) || null)
  }

  const toggleFav = (id) => {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    if (selected?.id === id) setSelected(s => ({ ...s, isFavorite: !s.isFavorite }))
  }

  const filtered = recipes.filter(r => {
    const matchFilter =
      filter === 'all' ? true :
      filter === 'fav' ? r.isFavorite :
      r.camera === filter
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const counts = {
    all: recipes.length,
    'Ricoh GR III': recipes.filter(r => r.camera === 'Ricoh GR III').length,
    'Ricoh GR IIIx': recipes.filter(r => r.camera === 'Ricoh GR IIIx').length,
    fav: recipes.filter(r => r.isFavorite).length,
  }

  return (
    <div className="flex gap-4 h-full min-h-0">

      {/* ── Left: grid + header ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-brand-500">
                <svg className="w-6 h-6 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
              </span>
              Camera Recipes
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">บันทึกการตั้งค่ากล้อง Ricoh สำหรับแต่ละสไตล์ · {recipes.length} recipes</p>
          </div>
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            สร้าง Recipe ใหม่
          </button>
        </div>

        {/* Filter bar + search */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'all', label: `ทั้งหมด (${counts.all})` },
            { key: 'Ricoh GR III', label: `GR III (${counts['Ricoh GR III']})` },
            { key: 'Ricoh GR IIIx', label: `GR IIIx (${counts['Ricoh GR IIIx']})` },
            { key: 'fav', label: `❤️ Favorites (${counts.fav})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                filter === key
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-brand-200 hover:text-brand-500'
              }`}
            >
              {label}
            </button>
          ))}

          <div className="flex items-center gap-2 ml-auto bg-white border border-gray-200 rounded-full px-3 py-1.5">
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา recipe..."
              className="text-xs text-gray-600 outline-none bg-transparent w-32 placeholder-gray-300"
            />
          </div>
        </div>

        {/* Recipe grid */}
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-3">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            <p className="text-sm">ยังไม่มี recipe — กด "สร้าง Recipe ใหม่"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto pb-2">
            {filtered.map(r => {
              const isActive = selected?.id === r.id
              return (
                <div
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`bg-white rounded-2xl overflow-hidden cursor-pointer transition-all border ${
                    isActive
                      ? 'border-brand-400 shadow-md ring-1 ring-brand-200'
                      : 'border-gray-100 hover:border-brand-100 hover:shadow-sm'
                  }`}
                >
                  {/* Photo with filter */}
                  <div className="h-24 relative overflow-hidden">
                    {r.imgSeed ? (
                      <img
                        src={`https://picsum.photos/seed/${r.imgSeed}/300/200`}
                        alt={r.name}
                        className="w-full h-full object-cover"
                        style={{ filter: r.filterClass || 'none' }}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full" style={{ background: r.bgGradient }} />
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {/* Mode badge */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-gray-700 backdrop-blur-sm">
                      {r.imageControl}
                    </span>
                    {/* Fav button */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleFav(r.id) }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/85 flex items-center justify-center backdrop-blur-sm"
                    >
                      <svg
                        className={`w-3.5 h-3.5 ${r.isFavorite ? 'text-brand-500 fill-brand-500' : 'text-gray-300'}`}
                        viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                      </svg>
                    </button>
                    {/* Camera badge */}
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-gray-700">
                      {r.camera.replace('Ricoh ', '')}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-3">
                    <div className="font-bold text-sm text-gray-800 mb-0.5">{r.emoji} {r.name}</div>
                    <div className="text-xs text-gray-400 mb-2 line-clamp-1">{r.description}</div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-50 text-brand-500">
                        {r.imageControl}
                      </span>
                      {r.saturation && r.saturation !== '—' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-50 text-gray-500">
                          Sat {r.saturation}
                        </span>
                      )}
                      {r.contrast && r.contrast !== '0' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-50 text-gray-500">
                          Con {r.contrast}
                        </span>
                      )}
                    </div>
                    {(r.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {r.tags.slice(0, 2).map((tag, i) => {
                          const color = TAG_COLORS[r.tagColors?.[i]] || TAG_COLORS.pink
                          return (
                            <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${color.bg} ${color.text}`}>
                              {tag}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Right: detail panel ── */}
      {selected && (
        <div className="w-64 xl:w-72 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {/* Photo */}
          <div className="h-36 relative overflow-hidden flex-shrink-0">
            {selected.imgSeed ? (
              <img
                src={`https://picsum.photos/seed/${selected.imgSeed}/400/300`}
                alt={selected.name}
                className="w-full h-full object-cover"
                style={{ filter: selected.filterClass || 'none' }}
              />
            ) : (
              <div className="w-full h-full" style={{ background: selected.bgGradient }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-3">
              <p className="text-white font-bold text-base">{selected.emoji} {selected.name}</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-gray-700">
                {selected.camera}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Image Control */}
            <div className="mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Image Control</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Mode', value: selected.imageControl, special: true },
                  { label: 'White Balance', value: selected.whiteBalance },
                  { label: 'WB Shift', value: selected.wbShift },
                  ...(selected.filterEffect ? [{ label: 'Filter Effect', value: selected.filterEffect }] : []),
                  ...(selected.toning ? [{ label: 'Toning', value: selected.toning }] : []),
                ].map(({ label, value, special }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className={`text-xs font-semibold ${special ? 'text-brand-500' : 'text-gray-700'}`}>
                      {value || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tone adjustments */}
            <div className="mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tone Adjustments</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Saturation', key: 'saturation' },
                  { label: 'Hue',        key: 'hue' },
                  { label: 'Contrast',   key: 'contrast' },
                  { label: 'Sharpness',  key: 'sharpness' },
                  { label: 'Highlight',  key: 'highlight' },
                  { label: 'Shadow',     key: 'shadow' },
                ].map(({ label, key }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{label}</span>
                    <ValChip value={selected[key]} />
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {selected.notes && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">หมายเหตุ</p>
                <p className="text-xs text-gray-500 leading-relaxed">{selected.notes}</p>
              </div>
            )}

            {/* Tags */}
            {(selected.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selected.tags.map((tag, i) => {
                  const color = TAG_COLORS[selected.tagColors?.[i]] || TAG_COLORS.pink
                  return (
                    <span key={i} className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${color.bg} ${color.text}`}>
                      {tag}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-3 border-t border-gray-50 space-y-2 flex-shrink-0">
            <button
              onClick={() => setModal(selected)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
              </svg>
              แก้ไข Recipe
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const copy = { ...selected, id: String(Date.now()), name: selected.name + ' (copy)' }
                  setRecipes(prev => [...prev, copy])
                  setSelected(copy)
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 text-gray-500 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                </svg>
                Copy
              </button>
              <button
                onClick={() => { if (confirm('ลบ recipe นี้?')) remove(selected.id) }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-100 text-red-400 text-xs font-semibold rounded-xl hover:bg-red-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <RecipeModal
          recipe={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}
    </div>
  )
}
