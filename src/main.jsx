import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ── ล้าง localStorage ของฟีเจอร์ที่ถอดออกไปแล้ว ─────────────────
// ฟีเจอร์บางอย่างเก็บ state ไว้ในเครื่องผู้ใช้ ไม่ได้อยู่ในฐานข้อมูล
// พอถอดฟีเจอร์ออก key พวกนี้จะค้างอยู่ถาวรโดยไม่มีใครอ่าน
//
// ที่ล้างรอบนี้:
//   · hichao_recipes_v2  — สูตรสีกล้อง (Recipes) ที่ถอดออกไปแล้ว
//   · nc_brief_*         — แมว NekoCat ใช้กันประกาศเตือนคิวซ้ำ (สะสมวันละ key)
//   · sent_queue_noti    — แจ้งเตือนคิวฝั่ง client ที่ย้ายไปทำบน server แล้ว
//
// ใช้เลขเวอร์ชันแทน flag แบบ boolean เพื่อให้เพิ่มรายการล้างรอบหน้าได้
// โดยเครื่องที่เคยล้างรอบก่อนจะกลับมาล้างรอบใหม่ให้เอง
const CLEANUP_VERSION = 'v2'
try {
  if (localStorage.getItem('hichao_cleanup') !== CLEANUP_VERSION) {
    // key ตายตัว
    ;[
      'hichao_recipes_v2',
      'hichao_recipes',           // key เวอร์ชันเก่าของ Recipes
      'sent_queue_noti',
      'hichao_cleanup_recipes',   // flag รุ่นเก่า แทนที่ด้วย hichao_cleanup แล้ว
    ].forEach(k => localStorage.removeItem(k))

    // key ที่มี prefix (NekoCat สร้าง nc_brief_YYYY-MM-DD วันละอัน)
    // Object.keys คืน snapshot จึงลบระหว่างวนได้ปลอดภัย
    Object.keys(localStorage)
      .filter(k => k.startsWith('nc_'))
      .forEach(k => localStorage.removeItem(k))

    localStorage.setItem('hichao_cleanup', CLEANUP_VERSION)
  }
} catch { /* โหมดส่วนตัว / storage เต็ม — ข้ามไป ไม่ critical */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
