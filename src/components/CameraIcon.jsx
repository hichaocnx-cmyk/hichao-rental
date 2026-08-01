// ── ไอคอนกล้อง (แทนรูปถ่ายจริง) ────────────────────────────────
// เดิมเก็บรูปกล้องเป็นไฟล์ใน Supabase Storage — วัดจริงแล้วมีแค่ 8 รูป
// แต่รวม 63 MB (PNG ดิบ เฉลี่ย 7.9 MB/ใบ) และตั้ง cache แค่ 1 ชั่วโมง
// เปิดหน้าทีนึงโหลด 63 MB → กินโควตา bandwidth 5 GB/เดือนหมดในไม่กี่วัน
//
// ระบบนี้เป็นหลังบ้านใช้กันเอง ไม่ได้ต้องโชว์รูปสินค้าให้ลูกค้าดู
// เปลี่ยนมาใช้ emoji จึงเหลือ egress = 0 และตัดโค้ดเรื่องรูปออกได้ทั้งชุด
export default function CameraIcon({ className = '', size = 'text-xl' }) {
  return (
    <div
      className={`${className} flex items-center justify-center bg-gray-100 select-none leading-none`}
      aria-hidden="true"
    >
      <span className={size}>📷</span>
    </div>
  )
}
