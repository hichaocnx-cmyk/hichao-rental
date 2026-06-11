import { useState, useEffect } from 'react'

// ──────────────────────────────────────────────
// Recipes จริงของร้าน HICHAO
// ──────────────────────────────────────────────
const SAMPLE_RECIPES = [
  {
    id: 'nb',
    name: 'Negative Blue',
    emoji: '🔵',
    camera: 'Ricoh GR III',
    description: 'โทนเย็น ฟ้า เข้มลึก เหมาะถ่าย Street กลางคืน',
    imageControl: 'Negative',
    whiteBalance: 'Auto',
    wbShift: 'A6',
    saturation: '+1',
    hue: '-2',
    highLow: '+2',
    contrast: '+1',
    highlight: '+1',
    shadow: '-1',
    sharpness: '0',
    filterEffect: '',
    toning: '',
    exposureMode: 'Av',
    peripheralCorr: 'OFF',
    dRangeCorr: 'OFF | LOW',
    noiseReduction: 'AUTO | LOW',
    notes: 'โทนฟ้าเย็น สวย ใช้ WB A6 ให้สีอบอุ่นขึ้นแล้ว Hue -2 ดึงกลับเป็นโทนเย็น ให้ความรู้สึก cinematic',
    tags: ['Street', 'Night', 'Cinematic'],
    tagColors: ['blue', 'violet', 'slate'],
    isFavorite: true,
    imgSeed: 'bluecity9',
    filterClass: 'hue-rotate(200deg) saturate(125%) brightness(88%) contrast(115%)',
    bgGradient: 'linear-gradient(135deg,#0c1445,#1a56db,#93c5fd)',
  },
  {
    id: 'nw',
    name: 'Negative White',
    emoji: '🤍',
    camera: 'Ricoh GR III',
    description: 'สว่าง อากาศ high-key นุ่มละมุน',
    imageControl: 'Negative',
    whiteBalance: 'Manual',
    wbShift: 'M2:B4',
    saturation: '+1',
    hue: '+1',
    highLow: '+2',
    contrast: '0',
    highlight: '+4',
    shadow: '-1',
    sharpness: '0',
    filterEffect: '',
    toning: '',
    exposureMode: 'Av',
    peripheralCorr: 'ON',
    dRangeCorr: 'AUTO',
    noiseReduction: 'AUTO | LOW',
    notes: 'WB M2:B4 ให้สีเย็น clean มาก Highlight +4 ทำให้ภาพดูสว่าง airy เหมาะถ่ายวันแดดอ่อน หรือในร่ม',
    tags: ['Portrait', 'Airy', 'Minimal'],
    tagColors: ['pink', 'teal', 'slate'],
    isFavorite: true,
    imgSeed: 'softwhite3',
    filterClass: 'brightness(130%) saturate(75%) contrast(82%) hue-rotate(190deg)',
    bgGradient: 'linear-gradient(135deg,#e0f2fe,#f0f9ff,#fce7f3)',
  },
  {
    id: 'nj',
    name: 'Negative Japan',
    emoji: '🎌',
    camera: 'Ricoh GR III',
    description: 'High contrast สีสด ดราม่า สไตล์ญี่ปุ่น',
    imageControl: 'Negative',
    whiteBalance: 'Auto',
    wbShift: 'A6',
    saturation: '+2',
    hue: '-1',
    highLow: '+1',
    contrast: '+4',
    highlight: '-4',
    shadow: '-1',
    sharpness: '+2',
    filterEffect: '',
    toning: '',
    exposureMode: 'Av',
    peripheralCorr: 'OFF',
    dRangeCorr: 'AUTO',
    noiseReduction: 'OFF | OFF',
    notes: 'Contrast +4 + Highlight -4 ทำให้ภาพ punch มากขึ้น สีสด Sharp +2 เหมาะถ่าย Street ญี่ปุ่น หรือตลาดสีสัน',
    tags: ['Street', 'Japan', 'Vivid'],
    tagColors: ['orange', 'amber', 'pink'],
    isFavorite: false,
    imgSeed: 'japanstreet1',
    filterClass: 'contrast(155%) saturate(160%) brightness(88%) hue-rotate(-10deg)',
    bgGradient: 'linear-gradient(135deg,#1f2937,#b91c1c,#fbbf24)',
  },
]

const STORAGE_KEY = 'hichao_recipes_v2'

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
const IMAGE_CONTROLS = ['Negative', 'Standard', 'Vivid', 'Monotone', 'Positive Film', 'Cross Process', 'Bleach Bypass', 'Retro', 'HDR Tone']
const ADJ_RANGE = ['—', '-4', '-3', '-2', '-1', '0', '+1', '+2', '+3', '+4']
const FILTER_EFFECTS = ['', 'Red', 'Orange', 'Yellow', 'Green', 'Blue']
const TONINGS = ['', 'None', 'Warm', 'Cool', 'Sepia', 'Red', 'Green', 'Blue', 'Purple']
const EXPOSURE_MODES = ['Av', 'Tv', 'M', 'P', 'TAv', 'AUTO']
const ON_OFF_OPTIONS = ['—', 'ON', 'OFF']

function ValChip({ value, special }) {
  if (!value || value === '0' || value === '—') {
    return <span className="text-xs font-semibold text-gray-400">{value || '—'}</span>
  }
  if (special) {
    return <span className="text-xs font-bold text-brand-500">{value}</span>
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
    imageControl: 'Negative', whiteBalance: 'Auto', wbShift: '—',
    saturation: '0', hue: '0', highLow: '0', contrast: '0',
    sharpness: '0', highlight: '0', shadow: '0',
    filterEffect: '', toning: '',
    exposureMode: 'Av', peripheralCorr: 'OFF',
    dRangeCorr: 'AUTO', noiseReduction: 'AUTO | LOW',
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
    if (!t || (form.tags || []).includes(t)) return
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
              <input value={form.emoji} onChange={e => set('emoji', e.target.value)}
                className="w-full text-center text-2xl border border-gray-200 rounded-xl px-2 py-2 focus:outline-none focus:border-brand-400" maxLength={2} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">ชื่อ Recipe *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="เช่น Negative Blue"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
          </div>

          {/* Camera */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">กล้อง</label>
              <select value={form.camera} onChange={e => set('camera', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white">
                {CAMERAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Exposure Mode</label>
              <select value={form.exposureMode} onChange={e => set('exposureMode', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white">
                {EXPOSURE_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">คำอธิบาย</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="เช่น โทนเย็น เหมาะถ่าย Street"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
          </div>

          {/* Image Control + WB */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Filter (Image Control)</label>
              <select value={form.imageControl} onChange={e => set('imageControl', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white">
                {IMAGE_CONTROLS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">White Balance</label>
              <input value={form.whiteBalance} onChange={e => set('whiteBalance', e.target.value)}
                placeholder="Auto / Manual..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
          </div>

          {/* WB Shift */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Auto WB Shift</label>
              <input value={form.wbShift} onChange={e => set('wbShift', e.target.value)}
                placeholder="A6 / M2:B4..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">High/Low</label>
              <select value={form.highLow} onChange={e => set('highLow', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white">
                {ADJ_RANGE.map(v => <option key={v}>{v}</option>)}
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
                { key: 'highlight',  label: 'Highlight' },
                { key: 'shadow',     label: 'Shadow' },
                { key: 'sharpness',  label: 'Sharpness' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1">{label}</label>
                  <select value={form[key]} onChange={e => set(key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-brand-400 bg-white">
                    {ADJ_RANGE.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Camera Settings */}
          <div className="bg-gray-50 rounded-xl p-3">
            <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Camera Settings</label>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-1">Peripheral Illumin. Corr.</label>
                <select value={form.peripheralCorr} onChange={e => set('peripheralCorr', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-brand-400 bg-white">
                  {ON_OFF_OPTIONS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-1">D-Range Correction</label>
                <input value={form.dRangeCorr} onChange={e => set('dRangeCorr', e.target.value)}
                  placeholder="OFF | LOW / AUTO..."
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-brand-400" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-1">Noise Reduction</label>
                <input value={form.noiseReduction} onChange={e => set('noiseReduction', e.target.value)}
                  placeholder="AUTO | LOW / OFF | OFF..."
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-brand-400" />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tags</label>
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
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="Street, Portrait, Japan..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
              <button onClick={addTag}
                className="px-3 py-2 bg-brand-500 text-white text-sm font-medium rounded-xl hover:bg-brand-600 transition-colors">
                เพิ่ม
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">หมายเหตุ / เคล็ดลับ</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={3} placeholder="สถานการณ์ที่เหมาะ, ISO แนะนำ, เวลาถ่าย..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
            ยกเลิก
          </button>
          <button onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors">
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
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  }, [recipes])

  useEffect(() => {
    if (!selected && recipes.length > 0) setSelected(recipes[0])
  }, [recipes, selected])

  const save = (recipe) => {
    setRecipes(prev => {
      const idx = prev.findIndex(r => r.id === recipe.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = recipe; return next }
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
    const matchFilter = filter === 'all' ? true : filter === 'fav' ? r.isFavorite : r.camera === filter
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

  // Mobile bottom sheet state
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleCardClick = (r) => {
    setSelected(r)
    setSheetOpen(true)
  }

  return (
    <div className="flex gap-4 h-full min-h-0">

      {/* ── Left ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="text-brand-500">
                <svg className="w-5 h-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
              </span>
              Camera Recipes
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">ตั้งค่ากล้อง Ricoh · {recipes.length} recipes</p>
          </div>
          <button onClick={() => setModal('new')}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 text-white text-xs font-semibold rounded-xl hover:bg-brand-600 transition-colors shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden sm:inline">สร้าง Recipe ใหม่</span>
            <span className="sm:hidden">เพิ่ม</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide">
          {[
            { key: 'all',          label: `ทั้งหมด (${counts.all})` },
            { key: 'Ricoh GR III', label: `GR III` },
            { key: 'Ricoh GR IIIx',label: `GR IIIx` },
            { key: 'fav',          label: `❤️ Favorites` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap flex-shrink-0 ${
                filter === key
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-brand-200 hover:text-brand-500'
              }`}>
              {label}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto bg-white border border-gray-200 rounded-full px-3 py-1.5 flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา..."
              className="text-xs text-gray-600 outline-none bg-transparent w-20 placeholder-gray-300" />
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-3">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            <p className="text-sm">ยังไม่มี recipe</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2.5 overflow-y-auto pb-2">
            {filtered.map(r => {
              const isActive = selected?.id === r.id
              return (
                <div key={r.id} onClick={() => handleCardClick(r)}
                  className={`bg-white rounded-2xl overflow-hidden cursor-pointer transition-all border ${
                    isActive
                      ? 'border-brand-400 shadow-md ring-1 ring-brand-200'
                      : 'border-gray-100 hover:border-brand-100 hover:shadow-sm'
                  }`}>
                  {/* Photo */}
                  <div className="h-28 relative overflow-hidden">
                    {r.imgSeed ? (
                      <img src={`https://picsum.photos/seed/${r.imgSeed}/300/200`} alt={r.name}
                        className="w-full h-full object-cover" style={{ filter: r.filterClass || 'none' }} loading="lazy" />
                    ) : (
                      <div className="w-full h-full" style={{ background: r.bgGradient }} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                    {/* Filter badge */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-gray-700 backdrop-blur-sm">
                      {r.imageControl}
                    </span>

                    {/* Fav button */}
                    <button onClick={e => { e.stopPropagation(); toggleFav(r.id) }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/85 flex items-center justify-center backdrop-blur-sm shadow-sm">
                      <svg className={`w-4 h-4 ${r.isFavorite ? 'text-brand-500 fill-brand-500' : 'text-gray-300'}`}
                        viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                      </svg>
                    </button>

                    {/* Camera + WB */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-gray-700">
                        {r.camera.replace('Ricoh ', '')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/40 text-white backdrop-blur-sm">
                        WB {r.wbShift}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-3">
                    <div className="font-bold text-sm text-gray-800 mb-0.5">{r.emoji} {r.name}</div>
                    <div className="text-xs text-gray-400 mb-2.5 line-clamp-1">{r.description}</div>

                    {/* Key settings row */}
                    <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                      {[
                        { label: 'Sat', value: r.saturation },
                        { label: 'Con', value: r.contrast },
                        { label: 'HL', value: r.highlight },
                        { label: 'Hue', value: r.hue },
                        { label: 'Shd', value: r.shadow },
                        { label: 'Sharp', value: r.sharpness },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-lg px-1.5 py-1 text-center">
                          <div className="text-[8px] text-gray-400 font-medium">{label}</div>
                          <div className={`text-[11px] font-bold leading-tight ${
                            value?.startsWith('+') ? 'text-green-600' :
                            value?.startsWith('-') ? 'text-red-500' :
                            'text-gray-400'
                          }`}>{value || '—'}</div>
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    {(r.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {r.tags.slice(0, 3).map((tag, i) => {
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

      {/* ── Right: Detail panel (desktop only) ── */}
      {selected && (
        <div className="hidden lg:flex w-64 xl:w-72 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex-col overflow-hidden">

          {/* Photo */}
          <div className="h-40 relative overflow-hidden flex-shrink-0">
            {selected.imgSeed ? (
              <img src={`https://picsum.photos/seed/${selected.imgSeed}/400/300`} alt={selected.name}
                className="w-full h-full object-cover" style={{ filter: selected.filterClass || 'none' }} />
            ) : (
              <div className="w-full h-full" style={{ background: selected.bgGradient }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-white font-bold text-base leading-tight">{selected.emoji} {selected.name}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/90 text-gray-700">{selected.camera}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/40 text-white backdrop-blur-sm">
                  WB {selected.wbShift}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">

              {/* Filter & WB */}
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Filter & White Balance</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Filter', value: selected.imageControl, special: true },
                    { label: 'White Balance', value: selected.whiteBalance },
                    { label: 'Auto WB Shift', value: selected.wbShift },
                  ].map(({ label, value, special }) => (
                    <div key={label} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className={`text-xs font-bold ${special ? 'text-brand-500' : 'text-gray-700'}`}>{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tone Adjustments</p>
                <div className="space-y-1">
                  {[
                    { label: 'Image Control', key: 'imageControl', special: true },
                    { label: 'Saturation',    key: 'saturation' },
                    { label: 'Hue',           key: 'hue' },
                    { label: 'High/Low',      key: 'highLow' },
                    { label: 'Contrast',      key: 'contrast' },
                    { label: 'Highlight',     key: 'highlight' },
                    { label: 'Shadow',        key: 'shadow' },
                    { label: 'Sharpness',     key: 'sharpness' },
                  ].map(({ label, key, special }) => (
                    <div key={key} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                      <span className="text-[11px] text-gray-400">{label}</span>
                      <ValChip value={selected[key]} special={special} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Camera Settings */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Camera Settings</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Exposure Mode', value: selected.exposureMode },
                    { label: 'Peripheral Corr.', value: selected.peripheralCorr },
                    { label: 'D-Range Corr.', value: selected.dRangeCorr },
                    { label: 'Noise Reduction', value: selected.noiseReduction },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between gap-2">
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{label}</span>
                      <span className="text-[11px] font-semibold text-gray-600 text-right">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selected.notes && (
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">หมายเหตุ</p>
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
          </div>

          {/* Actions */}
          <div className="p-3 border-t border-gray-50 space-y-2 flex-shrink-0">
            <button onClick={() => setModal(selected)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-colors">
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
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 text-gray-500 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                </svg>
                Copy
              </button>
              <button
                onClick={() => { if (confirm('ลบ recipe นี้?')) remove(selected.id) }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-100 text-red-400 text-xs font-semibold rounded-xl hover:bg-red-50 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom sheet ── */}
      {sheetOpen && selected && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSheetOpen(false)} />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Photo header */}
            <div className="h-36 relative overflow-hidden flex-shrink-0 mx-4 rounded-2xl mb-3">
              {selected.imgSeed ? (
                <img src={`https://picsum.photos/seed/${selected.imgSeed}/400/300`} alt={selected.name}
                  className="w-full h-full object-cover" style={{ filter: selected.filterClass || 'none' }} />
              ) : (
                <div className="w-full h-full" style={{ background: selected.bgGradient }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-2xl" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-bold text-lg">{selected.emoji} {selected.name}</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/90 text-gray-700">{selected.camera}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/40 text-white">WB {selected.wbShift}</span>
                </div>
              </div>
              <button onClick={() => setSheetOpen(false)}
                className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">

              {/* Tone grid */}
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tone Adjustments</p>
                <div className="space-y-1">
                  {[
                    { label: 'Image Control', key: 'imageControl', special: true },
                    { label: 'Saturation',    key: 'saturation' },
                    { label: 'Hue',           key: 'hue' },
                    { label: 'High/Low',      key: 'highLow' },
                    { label: 'Contrast',      key: 'contrast' },
                    { label: 'Highlight',     key: 'highlight' },
                    { label: 'Shadow',        key: 'shadow' },
                    { label: 'Sharpness',     key: 'sharpness' },
                  ].map(({ label, key, special }) => (
                    <div key={key} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                      <span className="text-[11px] text-gray-400">{label}</span>
                      <ValChip value={selected[key]} special={special} />
                    </div>
                  ))}
                </div>
              </div>

              {/* WB */}
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">White Balance</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-gray-50 rounded-xl p-2.5 text-center">
                    <div className="text-[9px] text-gray-400 mb-0.5">Mode</div>
                    <div className="text-xs font-bold text-gray-700">{selected.whiteBalance}</div>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl p-2.5 text-center">
                    <div className="text-[9px] text-gray-400 mb-0.5">Shift</div>
                    <div className="text-xs font-bold text-gray-700">{selected.wbShift}</div>
                  </div>
                </div>
              </div>

              {/* Camera settings */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Camera Settings</p>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
                  {[
                    { label: 'Exp. Mode', value: selected.exposureMode },
                    { label: 'Periph. Corr.', value: selected.peripheralCorr },
                    { label: 'D-Range', value: selected.dRangeCorr },
                    { label: 'Noise Reduc.', value: selected.noiseReduction },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-[9px] text-gray-400">{label}</div>
                      <div className="text-xs font-semibold text-gray-700">{value || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selected.notes && (
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">หมายเหตุ</p>
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

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setSheetOpen(false); setModal(selected) }}
                  className="flex-1 py-3 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-colors">
                  แก้ไข Recipe
                </button>
                <button onClick={() => {
                  const copy = { ...selected, id: String(Date.now()), name: selected.name + ' (copy)' }
                  setRecipes(prev => [...prev, copy])
                  setSelected(copy)
                  setSheetOpen(false)
                }}
                  className="px-4 py-3 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                  Copy
                </button>
              </div>
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
