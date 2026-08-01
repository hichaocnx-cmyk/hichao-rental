-- ============================================================
-- 03_import_db.sql  —  ยัด JSON ที่ export มา เข้า Postgres บน VPS
--
-- วิธีรัน (บน VPS, ต้องรัน 02_schema_selfhost.sql มาก่อน):
--
--   psql -d hichao -v backup="$(cat hichao-backup-20260730.json)" -f 03_import_db.sql
--
--   ^ ใช้ psql variable แทนการ hardcode JSON ลงไฟล์
--     :'backup' จะถูก quote ให้ถูกต้องอัตโนมัติ ไม่ต้องกลัว escape เพี้ยน
--
-- ปลอดภัยที่จะรันซ้ำ: on conflict (id) do nothing
-- ถ้าจะ "ล้างแล้วยัดใหม่" ให้ปลดคอมเมนต์บล็อก TRUNCATE ด้านล่างก่อน
-- ============================================================

\set ON_ERROR_STOP on

begin;

-- ── โหลด JSON เข้า temp table ────────────────────────────────
create temp table _backup (doc jsonb) on commit drop;
insert into _backup values (:'backup'::jsonb);

-- ── แสดงว่าไฟล์นี้มาจากไหน มีอะไรอยู่ ────────────────────────
select
  doc->>'source'                as source,
  doc->>'exported_at'           as exported_at,
  doc->'counts'                 as counts_in_file
from _backup;

-- ── ล้างก่อน import (ปลดคอมเมนต์ถ้าต้องการเริ่มใหม่หมด) ─────
-- ⚠️ ลบข้อมูลทั้งหมดในเครื่องนี้ ไม่กระทบ Supabase
-- truncate rentals, expenses, cameras, customers restart identity cascade;

-- ── ลำดับสำคัญ: cameras/customers ก่อน แล้วค่อย rentals ──────
--    เพราะ rentals มี FK ชี้ไปทั้งสองตาราง

-- ⚠️ สำคัญ: jsonb_populate_recordset ใส่ NULL ให้คอลัมน์ที่ JSON ไม่มีคีย์
--    มัน "ไม่" ใช้ค่า DEFAULT ของตาราง → คอลัมน์ not null จะ insert พัง
--    เช่นถ้า Supabase ยังไม่ได้รัน migration_004 จะไม่มี pickup_reminded/return_reminded
--    วิธีกัน: เอา object ค่า default มา || กับข้อมูลจริง (ขวาชนะ) ก่อน populate
create or replace function _with_defaults(items jsonb, defaults jsonb)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(defaults || elem), '[]'::jsonb)
  from jsonb_array_elements(coalesce(items, '[]'::jsonb)) as elem
$$;

insert into cameras
select * from jsonb_populate_recordset(null::cameras, _with_defaults(
  (select doc->'data'->'cameras' from _backup),
  '{"price_per_day":0,"insurance":0,"deposit":0,"status":"available"}'::jsonb
))
on conflict (id) do nothing;

insert into customers
select * from jsonb_populate_recordset(null::customers, _with_defaults(
  (select doc->'data'->'customers' from _backup),
  '{}'::jsonb
))
on conflict (id) do nothing;

insert into rentals
select * from jsonb_populate_recordset(null::rentals, _with_defaults(
  (select doc->'data'->'rentals' from _backup),
  '{"price_per_day":0,"insurance":0,"deposit":0,"delivery_fee":0,"discount":0,
    "total_price":0,"due_on_pickup":0,"insurance_returned":false,
    "pickup_reminded":false,"return_reminded":false,"status":"booked"}'::jsonb
))
on conflict (id) do nothing;

insert into expenses
select * from jsonb_populate_recordset(null::expenses, _with_defaults(
  (select doc->'data'->'expenses' from _backup),
  '{"amount":0}'::jsonb
))
on conflict (id) do nothing;

drop function _with_defaults(jsonb, jsonb);

commit;


-- ============================================================
-- ตรวจว่าครบ — ตัวเลขต้องตรงกับ "ขั้นที่ 1" ใน 01_export_db.sql
-- ============================================================
select 'cameras'   as table_name, count(*) as rows from cameras
union all select 'customers', count(*) from customers
union all select 'rentals',   count(*) from rentals
union all select 'expenses',  count(*) from expenses
order by table_name;

-- ── เช็คว่าไม่มี rental ที่ FK หลุด (ชี้ไปกล้อง/ลูกค้าที่ไม่มีอยู่) ──
select count(*) as orphan_rentals
from rentals r
where (r.camera_id   is not null and not exists (select 1 from cameras   c where c.id = r.camera_id))
   or (r.customer_id is not null and not exists (select 1 from customers c where c.id = r.customer_id));

-- ── รูปที่ยังชี้ไป Supabase (ต้องแก้ทีหลังหลังย้ายไฟล์รูปเสร็จ) ──
select count(*) as images_still_on_supabase
from cameras
where image_url like '%supabase.co%';


-- ============================================================
-- ขั้นถัดไป: หลังย้ายไฟล์รูปขึ้น VPS แล้ว แก้ URL ให้ชี้ที่ใหม่
-- (รันเมื่อไฟล์รูปอยู่ใน /var/www/hichao/uploads/ เรียบร้อยแล้ว)
--
--   update cameras
--      set image_url = regexp_replace(
--            image_url,
--            '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/camera-images/',
--            '/uploads/'
--          )
--    where image_url like '%supabase.co%';
--
-- ผลลัพธ์: 'https://xxx.supabase.co/storage/v1/object/public/camera-images/abc.jpg'
--       → '/uploads/abc.jpg'          (thumb → '/uploads/thumb/abc.jpg')
-- โค้ด getThumbUrl() ใน src/lib/images.js ต้องแก้ marker จาก
-- '/camera-images/' เป็น '/uploads/' ด้วย
-- ============================================================

-- ── สร้างบัญชี admin แรก (ตั้งรหัสจริงผ่าน API ทีหลัง) ────────
-- API server จะ hash ด้วย argon2 — ตรงนี้ใส่ placeholder ไว้ก่อน
-- แล้วใช้คำสั่ง `node scripts/set-password.mjs <email>` ตั้งรหัส
--
--   insert into app_users (email, password_hash, name, role)
--   values ('onezero10.studio@gmail.com', 'SET_ME', 'Armmy', 'admin')
--   on conflict (email) do nothing;
