-- ============================================================
-- 01_export_db.sql  —  ดึงข้อมูลทุกตารางออกจาก Supabase เป็น JSON
--
-- ใช้ได้แม้โปรเจกต์ถูกระงับ (402) เพราะ SQL Editor ไม่ผ่าน API gateway
-- ที่ถูกบล็อก — มันต่อ Postgres ตรง
--
-- วิธีใช้:
--   1. เปิด https://supabase.com/dashboard → เลือกโปรเจกต์ → SQL Editor
--   2. รัน "ขั้นที่ 1" ก่อน จดจำนวนแถวไว้ (ไว้เทียบทีหลังว่าข้อมูลครบ)
--   3. รัน "ขั้นที่ 2" → กดปุ่มคัดลอกค่าในเซลล์ → วางลงไฟล์
--      ตั้งชื่อ  hichao-backup-YYYYMMDD.json  เก็บไว้หลายที่
--   4. รัน "ขั้นที่ 3" เพื่อได้รายชื่อไฟล์รูปที่ต้องไปดึงต่อ
-- ============================================================


-- ═══ ขั้นที่ 1: นับแถว (จดไว้เทียบตอน import) ═══════════════════
select 'cameras'   as table_name, count(*) as rows from cameras
union all select 'customers', count(*) from customers
union all select 'rentals',   count(*) from rentals
union all select 'expenses',  count(*) from expenses
order by table_name;


-- ═══ ขั้นที่ 2: ดัมป์ทุกตารางเป็น JSON ก้อนเดียว ════════════════
-- to_jsonb เก็บชนิดข้อมูลไว้ครบ (date, numeric, boolean, uuid, null)
-- ไม่เพี้ยนเหมือน export CSV แล้ว import กลับ
select jsonb_pretty(jsonb_build_object(
  'app',         'HICHAO.CNX Camera Rental',
  'source',      'supabase:ceutmrmtebnprbkotqzy',
  'exported_at', now(),
  'counts', jsonb_build_object(
    'cameras',   (select count(*) from cameras),
    'customers', (select count(*) from customers),
    'rentals',   (select count(*) from rentals),
    'expenses',  (select count(*) from expenses)
  ),
  'data', jsonb_build_object(
    'cameras',   (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from cameras   t),
    'customers', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from customers t),
    'rentals',   (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from rentals   t),
    'expenses',  (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from expenses  t)
  )
)) as backup_json;


-- ═══ ขั้นที่ 3: รายชื่อไฟล์รูปใน Storage ════════════════════════
-- ตาราง storage.objects อยู่ใน Postgres จึงอ่านได้แม้ถูกระงับ
-- (แต่ "ตัวไฟล์" อยู่ใน S3 — ต้องใช้ API ดึง ดู 03_export_storage.html)
select
  name,
  pg_size_pretty((metadata->>'size')::bigint)  as size,
  metadata->>'mimetype'                        as mime,
  metadata->>'cacheControl'                    as cache_control,  -- 'max-age=3600' = ตัวกิน egress
  created_at
from storage.objects
where bucket_id = 'camera-images'
order by name;


-- ═══ ขั้นที่ 3b: สรุปขนาดรวมต่อ bucket ══════════════════════════
select
  bucket_id,
  count(*)                                            as files,
  pg_size_pretty(sum((metadata->>'size')::bigint))    as total_size
from storage.objects
group by bucket_id
order by bucket_id;


-- ═══ ขั้นที่ 4: บัญชีผู้ใช้ที่มีอยู่ (เอาไปสร้างใหม่บน VPS) ═══════
-- ⚠️ password hash ของ Supabase เป็น bcrypt — ย้ายมาใช้ต่อได้
--    แต่แนะนำให้ "ตั้งรหัสใหม่" บน VPS จะสะอาดกว่า
--    ตรงนี้ดึงมาแค่ให้รู้ว่ามีบัญชีอะไรอยู่
select id, email, created_at, last_sign_in_at
from auth.users
order by created_at;


-- ============================================================
-- ถ้าขั้นที่ 2 ได้ผลลัพธ์ใหญ่เกินกว่าจะคัดลอกในหน้าเดียว
-- ให้รันแยกทีละตารางแทน แล้วเก็บเป็น 4 ไฟล์:
--
--   select jsonb_pretty(coalesce(jsonb_agg(to_jsonb(t)), '[]')) from cameras   t;
--   select jsonb_pretty(coalesce(jsonb_agg(to_jsonb(t)), '[]')) from customers t;
--   select jsonb_pretty(coalesce(jsonb_agg(to_jsonb(t)), '[]')) from rentals   t;
--   select jsonb_pretty(coalesce(jsonb_agg(to_jsonb(t)), '[]')) from expenses  t;
-- ============================================================
