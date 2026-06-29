// ป้ายสถานะการเช่า — สีนุ่มเป็นชุดเดียวกัน
const CFG = {
  booked:    { label: 'จอง',         dot: 'bg-amber-400',   cls: 'bg-amber-50 text-amber-700' },
  active:    { label: 'กำลังเช่า',   dot: 'bg-emerald-400', cls: 'bg-emerald-50 text-emerald-700' },
  returned:  { label: 'คืนแล้ว',     dot: 'bg-gray-300',    cls: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'ยกเลิก',      dot: 'bg-gray-300',    cls: 'bg-gray-100 text-gray-400' },
  overdue:   { label: 'เกินกำหนด',   dot: 'bg-red-500',     cls: 'bg-red-50 text-red-600' },
}

export default function StatusBadge({ status, overdue = false }) {
  const cfg = overdue ? CFG.overdue : (CFG[status] || CFG.booked)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${overdue ? 'cute-pulse' : ''}`} />
      {cfg.label}
    </span>
  )
}
