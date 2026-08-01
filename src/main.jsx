import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ── ล้างข้อมูลของฟีเจอร์ที่ถอดออกไปแล้ว ────────────────────────
// Recipes (สูตรสีกล้อง) ถูกถอดออกจากระบบ — ข้อมูลเก็บใน localStorage
// ของแต่ละเครื่อง ไม่ได้อยู่ในฐานข้อมูล จึงต้องล้างฝั่ง client
// โค้ดนี้ทำงานครั้งเดียวต่อเครื่อง แล้วจำไว้ว่าล้างแล้ว
try {
  if (!localStorage.getItem('hichao_cleanup_recipes')) {
    localStorage.removeItem('hichao_recipes_v2')
    localStorage.removeItem('hichao_recipes')     // เผื่อ key เวอร์ชันเก่า
    localStorage.setItem('hichao_cleanup_recipes', '1')
  }
} catch { /* โหมดส่วนตัว / storage เต็ม — ข้ามไป ไม่ critical */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
