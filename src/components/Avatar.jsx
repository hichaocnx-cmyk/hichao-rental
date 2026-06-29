// วงกลมย่อชื่อแบบมีสี (สีคงที่จากชื่อ)
const RAMP = [
  'bg-brand-100 text-brand-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
]
function hash(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}
export default function Avatar({ name = '', size = 44, className = '' }) {
  const initials = (name.trim()[0] || '?').toUpperCase()
  const tone = RAMP[hash(name) % RAMP.length]
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold flex-shrink-0 ${tone} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials}
    </span>
  )
}
