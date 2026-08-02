-- ============================================================
-- migration_012.sql — ถอด constraint กันจองทับ (รันไปแล้วเมื่อ 2 ส.ค. 2569)
--
-- ⚠️ ไฟล์นี้ "ยกเลิก" สิ่งที่ migration_010.sql ทำไว้ โดยตั้งใจ
--
-- เหตุผล: ทางร้านต้องการให้ "จองทับกันได้ แค่เตือน" ไม่ใช่บล็อก
--   เพราะหน้างานจริงมีเคสที่ต้องจองทับ เช่น
--     · ลูกค้าคืนเร็วกว่ากำหนด แล้วมีคิวถัดไปมารับต่อ
--     · ลูกค้า 2 รายนัดส่งต่อกันเอง ไม่ผ่านร้าน
--     · จองเผื่อไว้ก่อน แล้วค่อยไปเคลียร์คิวทีหลัง
--
-- constraint แบบ exclusion เป็นการ "ห้ามเด็ดขาด" ไม่มีทางข้าม
-- จึงไม่เหมาะกับรูปแบบการทำงานของร้าน
--
-- ตอนนี้เหลือการเตือน 2 จุดในหน้าเว็บ (ไม่บล็อก):
--   1. กรอบเหลืองในฟอร์มทันทีที่เลือกกล้อง+วันครบ
--   2. toast เตือนหลังบันทึกสำเร็จ ว่าคิวนี้ทับกับใคร ช่วงไหน
-- ============================================================

alter table rentals drop constraint if exists rentals_no_camera_overlap;


-- ── ตรวจว่าถอดแล้วจริง (ต้องได้ 0) ────────────────────────────
select count(*) as constraint_still_there
from pg_constraint
where conname = 'rentals_no_camera_overlap';


-- ============================================================
-- ถ้าวันหนึ่งเปลี่ยนใจอยากกลับไปบล็อกเด็ดขาด
--   → รัน migration_010.sql อีกครั้ง
--   → และแก้ RentalModal.jsx ให้ throw error ตอนเจอ conflict
--     (ตอนนี้เก็บผลไว้เตือนเฉยๆ ไม่ได้ขวางการบันทึก)
--
-- ถ้าอยากรู้ว่าตอนนี้มีคิวทับกันอยู่กี่คู่
--   select c.name as camera,
--          a.start_date || ' → ' || a.end_date as range_a,
--          b.start_date || ' → ' || b.end_date as range_b
--     from rentals a
--     join rentals b on a.camera_id = b.camera_id and a.id < b.id
--      and daterange(a.start_date, greatest(a.end_date, a.start_date + 1), '[)')
--       && daterange(b.start_date, greatest(b.end_date, b.start_date + 1), '[)')
--     left join cameras c on c.id = a.camera_id
--    where a.status in ('booked','active') and b.status in ('booked','active');
-- ============================================================
