-- ══════════════════════════════════════════════════════════════
-- migration_015 — เช่าหลายตัวในครั้งเดียว (group_id)
--
-- ปัญหา: ตาราง rentals มี camera_id ช่องเดียว → 1 รายการ = 1 กล้อง
-- ลูกค้าเช่าทีละ 3 ตัว ต้องสร้าง 3 รายการแยกกัน ไม่รู้ว่าเป็นชุดเดียวกัน
-- สัญญาก็พิมพ์ได้ทีละตัว
--
-- วิธีแก้: ยังเก็บ "1 แถว = 1 กล้อง" เหมือนเดิม (ตัวเช็คกล้องชนคิว
-- สถานะกล้อง ปฏิทิน และรายงาน จึงทำงานถูกต้องรายตัวเหมือนเดิมทุกอย่าง)
-- แต่เพิ่ม group_id ให้แถวที่เช่าพร้อมกันผูกกันไว้ หน้าจอกับสัญญา
-- จะรวมแถวที่ group_id เดียวกันเป็นชุดเดียว
--
-- ⚠️ migration นี้ "เพิ่มอย่างเดียว" ไม่แก้ ไม่ลบข้อมูลเดิมแม้แต่แถวเดียว
--    รายการเก่าทั้งหมด group_id = null = เช่าตัวเดียว (ถูกต้องตามจริง)
--
-- วิธีรัน: เปิด Supabase → SQL Editor → วางทั้งไฟล์ → Run
-- รันซ้ำได้ ไม่พัง (ใช้ if not exists ทุกคำสั่ง)
-- ══════════════════════════════════════════════════════════════

alter table rentals
  add column if not exists group_id uuid;

comment on column rentals.group_id is
  'รหัสชุดการเช่า — แถวที่ลูกค้าเช่าพร้อมกันหลายตัวจะใช้ค่าเดียวกัน, null = เช่าตัวเดียว';

-- ดึงทั้งชุดทีเดียวตอนเปิดสัญญา/การ์ดรายการ
create index if not exists rentals_group_id_idx
  on rentals (group_id)
  where group_id is not null;

-- ── ตรวจผลหลังรัน ─────────────────────────────────────────────
-- ควรเห็น group_id เป็น uuid, is_nullable = YES
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_name = 'rentals' and column_name = 'group_id';

-- ควรได้ 0 ทุกค่า (ยังไม่มีการเช่าแบบหลายตัว — ปกติ)
select count(*) as แถวที่อยู่ในชุด
  from rentals
 where group_id is not null;

-- ── ถ้าอยากย้อนกลับ ───────────────────────────────────────────
-- (ไม่กระทบข้อมูลเช่าเดิม เพราะ group_id เป็นแค่ตัวจัดกลุ่ม)
--   drop index if exists rentals_group_id_idx;
--   alter table rentals drop column if exists group_id;
