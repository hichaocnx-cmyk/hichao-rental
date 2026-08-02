-- ============================================================
-- migration_010.sql — กันจองกล้องซ้อนกัน ที่ระดับฐานข้อมูล
--
-- ที่มา: เดิมเช็คคิวชนเฉพาะฝั่งหน้าเว็บ (RentalModal) ซึ่งกันได้ไม่หมด
--   · เปิด 2 แท็บพร้อมกัน ทั้งคู่ผ่านการเช็คแล้วบันทึกซ้อนกันได้
--   · ฟอร์มโหลดรายการเช่าตอนเปิดครั้งเดียว เปิดค้างไว้แล้วมีคนจองแทรก = เช็คไม่เจอ
--   · ยิงเข้า API ตรงๆ ข้ามหน้าเว็บได้เลย
-- สแกนข้อมูลจริงเมื่อ 2 ส.ค. 2569 พบคิวทับกันหลุดเข้ามาแล้ว 3 คู่
--
-- constraint นี้เป็นด่านสุดท้าย ต่อให้โค้ดฝั่งหน้าเว็บพลาด ฐานข้อมูลจะปฏิเสธเอง
--
-- วิธีรัน: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

-- ต้องมี btree_gist ถึงจะใช้ '=' ร่วมกับ '&&' ใน exclude ได้
create extension if not exists btree_gist;


-- ── ตรวจก่อนว่ามีข้อมูลเดิมที่จะติด constraint ไหม ──────────────
-- ต้องได้ 0 แถว ถ้าไม่ใช่ ให้แก้ข้อมูลก่อนแล้วค่อยรันส่วนล่าง
select
  a.id as รายการA, b.id as รายการB,
  c.name as กล้อง,
  a.start_date || ' → ' || a.end_date as ช่วงA,
  b.start_date || ' → ' || b.end_date as ช่วงB
from rentals a
join rentals b
  on a.camera_id = b.camera_id
 and a.id < b.id
 and daterange(a.start_date, greatest(a.end_date, a.start_date + 1), '[)')
  && daterange(b.start_date, greatest(b.end_date, b.start_date + 1), '[)')
left join cameras c on c.id = a.camera_id
where a.status in ('booked','active')
  and b.status in ('booked','active');


-- ── ตัว constraint ────────────────────────────────────────────
-- ช่วงที่กล้อง "ถูกครอบครองจริง" = [วันรับ, วันคืน)  — ปลายเปิด
--   เช่า 18 → 19 = ครอบครองแค่วันที่ 18
--   ดังนั้นคืนวันที่ 19 เช้า แล้วส่งต่อให้อีกคนรับวันที่ 19 บ่าย = จองได้ ✅
--
-- greatest(end_date, start_date + 1) กันเคสเช่าวันเดียว (รับ-คืนวันเดียวกัน)
--   ถ้าไม่มีบรรทัดนี้ 19 → 19 จะกลายเป็นช่วงว่าง แล้วจองซ้อนได้ไม่จำกัด
--   ใส่แล้ว 19 → 19 = [19, 20) = ครอบครองวันที่ 19 เต็มวัน ✅
--
-- where (...) = บังคับเฉพาะคิวที่ยังไม่จบ
--   รายการที่ returned/cancelled ไม่นับ (กล้องคืนมาแล้ว ให้จองทับได้)
--   และไม่ไปติดข้อมูลเก่า 3 คู่ที่ทับกันอยู่ (ทั้งหมดสถานะ returned)
alter table rentals
  drop constraint if exists rentals_no_camera_overlap;

alter table rentals
  add constraint rentals_no_camera_overlap
  exclude using gist (
    camera_id with =,
    daterange(start_date, greatest(end_date, start_date + 1), '[)') with &&
  )
  where (status in ('booked','active') and camera_id is not null);


-- ============================================================
-- ทดสอบว่าใช้งานได้จริง (รันแยก — จะ error ตามคาด แล้ว rollback)
-- ============================================================
-- begin;
--   -- หยิบคิวที่ยังไม่จบมา 1 อัน แล้วลองจองทับ
--   insert into rentals (camera_id, customer_id, start_date, end_date, status)
--   select camera_id, customer_id, start_date, end_date, 'booked'
--   from rentals where status in ('booked','active') limit 1;
--   -- ต้องขึ้น: ERROR ... conflicting key value violates exclusion constraint
-- rollback;


-- ============================================================
-- ถ้าต้องการยกเลิก constraint นี้ในอนาคต
--   alter table rentals drop constraint rentals_no_camera_overlap;
-- ============================================================
