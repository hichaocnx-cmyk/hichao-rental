-- ============================================================
-- migration_014.sql — HICHAO.CNX
-- เพิ่มตารางราคาขั้นบันไดต่อ "กล้องแต่ละตัว" (สูงสุด 10 วัน)
-- แก้ไขได้จากหน้าเว็บ (กล้องทั้งหมด → แก้ไขกล้อง) ไม่ต้องแก้โค้ด/deploy ใหม่อีกต่อไป
--
-- ก่อนหน้านี้ตารางราคาแบบขั้นบันไดถูก hardcode ไว้ใน src/components/RentalModal.jsx
-- (ตัวแปร CAMERA_PRICES) จับคู่ด้วยการ "เดาชื่อกล้อง" เช่น ชื่อมีคำว่า "GR IIIx"
-- ถึงจะใช้ตารางราคานี้ — เปราะบาง เผลอเปลี่ยนชื่อกล้องแล้วราคาขั้นบันไดหายเงียบๆ
-- โดยไม่มีอะไรฟ้อง (fallback ไปคิดราคา/วัน × จำนวนวันแทนทันที)
--
-- ย้ายมาเก็บที่ cameras.price_ladder แทน (ผูกกับกล้องแต่ละตัวโดยตรงด้วย id
-- ไม่ใช่เดาจากชื่อ) รูปแบบ JSON: {"1": 600, "2": 1200, ..., "10": 4100}
-- คีย์ = จำนวนวัน, ค่า = "ราคารวม" สำหรับจำนวนวันนั้น (ไม่ใช่ราคาต่อวัน)
-- กล้องที่ไม่ได้ตั้งตารางไว้ (price_ladder เป็น null) ระบบจะคิดราคาจาก
-- price_per_day × จำนวนวันแทนอัตโนมัติ เหมือนพฤติกรรมเดิม
--
-- วิธีรัน: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run (รันซ้ำได้ ปลอดภัย)
-- ============================================================

alter table cameras add column if not exists price_ladder jsonb;

-- ── ย้ายตารางราคาเดิม (CAMERA_PRICES ใน RentalModal.jsx) มาใส่ให้กล้องที่มีอยู่แล้ว ──
-- จับคู่ด้วยชื่อแบบเดียวกับโค้ดเดิมทุกประการ (ลำดับความสำคัญเดียวกัน: griiix/griv ก่อน
-- griii เสมอ เพราะ "gr iii" เป็น substring ของ "gr iiix" ด้วย) กันของเดิมหาย
-- รันซ้ำได้ปลอดภัย — เงื่อนไข price_ladder is null กันไม่ให้ทับตารางที่ตั้งเองไปแล้ว

update cameras set price_ladder =
  '{"1":700,"2":1400,"3":2000,"4":2200,"5":2500,"6":3000,"7":3500,"8":3800,"9":3990,"10":4200}'::jsonb
where price_ladder is null
  and (lower(name) like '%gr iiix%' or lower(name) like '%gr3x%' or lower(name) like '%griiix%');

update cameras set price_ladder =
  '{"1":790,"2":1500,"3":2000,"4":2500,"5":3000,"6":3500,"7":3990,"8":4200,"9":4400,"10":4500}'::jsonb
where price_ladder is null
  and (lower(name) like '%gr iv%' or lower(name) like '%gr4%' or lower(name) like '%griv%');

update cameras set price_ladder =
  '{"1":600,"2":1200,"3":1500,"4":2000,"5":2500,"6":3000,"7":3200,"8":3600,"9":3900,"10":4100}'::jsonb
where price_ladder is null
  and (lower(name) like '%gr iii%' or lower(name) like '%gr3%' or lower(name) like '%griii%');

update cameras set price_ladder =
  '{"1":299,"2":499,"3":699,"4":850,"5":1000,"6":1200,"7":1400}'::jsonb
where price_ladder is null
  and lower(name) like '%ixy%';

update cameras set price_ladder =
  '{"1":450,"2":900,"3":1200,"4":1600,"5":1900,"6":2200,"7":2500,"8":2800,"9":3000,"10":3300}'::jsonb
where price_ladder is null
  and (lower(name) like '%osmo%' or lower(name) like '%pocket%');

-- ============================================================
-- ตรวจสอบหลังรัน
--   ดูว่ากล้องตัวไหนได้ตารางราคาไปแล้วบ้าง (ควรตรงกับ 7 ตัวที่มีอยู่ ยกเว้น Flash ที่ไม่มีในตารางเดิม):
--     select name, price_ladder from cameras order by name;
--   กล้องตัวไหน price_ladder เป็น null แปลว่าไม่ตรงกับ pattern เดิมเลย (เช่น Flash Medalight)
--   ระบบจะคิดราคาจาก price_per_day × จำนวนวันไปตามปกติ — ไม่ผิดอะไร แค่ยังไม่มีตารางขั้นบันได
--   ตั้งเพิ่มเองได้จากหน้าเว็บ กล้องทั้งหมด → แก้ไขกล้อง เมื่อไหร่ก็ได้
-- ============================================================
