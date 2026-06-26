// สถานะว่างแบบน่ารัก — แมวขันเงินตัวจิ๋ว + ข้อความ
export default function EmptyState({ title = 'ยังไม่มีรายการ', subtitle, icon, children }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="hc-bob mb-4">
        {icon || (
          <svg width="92" height="92" viewBox="0 0 92 92" fill="none">
            <ellipse cx="46" cy="84" rx="26" ry="4" fill="#000" opacity="0.05" />
            <circle cx="46" cy="48" r="30" fill="#FFF0F6" />
            <path d="M24 30 L18 14 L34 22 Z" fill="#FFD6E8" />
            <path d="M68 30 L74 14 L58 22 Z" fill="#FFD6E8" />
            <path d="M24 28 L20 17 L32 22 Z" fill="#FFB3D1" />
            <path d="M68 28 L72 17 L60 22 Z" fill="#FFB3D1" />
            <circle cx="37" cy="46" r="3.4" fill="#7B1D45" />
            <circle cx="55" cy="46" r="3.4" fill="#7B1D45" />
            <circle cx="36" cy="45" r="1" fill="#fff" />
            <circle cx="54" cy="45" r="1" fill="#fff" />
            <path d="M44 53 L46 55.5 L48 53 Q46 57 44 53 Z" fill="#FF6B9D" />
            <circle cx="31" cy="52" r="3.5" fill="#FFC2D6" opacity="0.7" />
            <circle cx="61" cy="52" r="3.5" fill="#FFC2D6" opacity="0.7" />
            <path d="M20 47 H30 M20 50 H30" stroke="#FFB3D1" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M62 47 H72 M62 50 H72" stroke="#FFB3D1" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1 max-w-xs">{subtitle}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
