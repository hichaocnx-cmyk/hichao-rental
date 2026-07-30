-- ============================================================
-- migration_009.sql  —  HICHAO.CNX
-- ลบ bucket 'daily-queue' ที่ไม่มีโค้ดใช้แล้ว (คืนพื้นที่ + ลด egress)
--
-- ที่มา: schema.sql สร้าง bucket นี้ไว้ตอนที่วางแผนจะส่ง "การ์ดสรุปคิวประจำวัน"
-- เป็นรูปเข้า LINE แต่ปัจจุบัน Edge Function daily-summary / queue-reminder
-- ส่งเป็น "ข้อความ" ล้วน ไม่มีที่ไหนแตะ storage เลย (ตรวจแล้วทั้ง 3 functions)
-- ไฟล์รูปที่เคยอัปไว้จึงค้างกินพื้นที่เปล่าๆ และถ้ามีใครยังเปิดลิงก์เก่าอยู่
-- ก็ยังกิน Cached Egress ต่อ
--
-- ⚠️ รันเมื่อยืนยันแล้วว่าไม่มีลิงก์รูปจาก bucket นี้ที่ยังต้องใช้
--    (เช็คก่อนด้วย query ในส่วน "ตรวจสอบ" ด้านล่าง)
-- วิธีรัน: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run
-- ============================================================

-- ── ขั้นที่ 0: ดูก่อนว่ามีไฟล์อะไรอยู่กี่ไฟล์ (รันแยกก่อนก็ได้) ──
-- select count(*) as files,
--        pg_size_pretty(sum((metadata->>'size')::bigint)) as total_size
--   from storage.objects
--  where bucket_id = 'daily-queue';

-- ── ขั้นที่ 1: ลบไฟล์ทั้งหมดใน bucket ────────────────────────
delete from storage.objects where bucket_id = 'daily-queue';

-- ── ขั้นที่ 2: ลบ policy ที่ผูกกับ bucket นี้ ──────────────────
drop policy if exists "Public read daily queue images"          on storage.objects;
drop policy if exists "Authenticated upload daily queue images"  on storage.objects;
drop policy if exists "Authenticated delete daily queue images"  on storage.objects;

-- ── ขั้นที่ 3: ลบตัว bucket ───────────────────────────────────
delete from storage.buckets where id = 'daily-queue';

-- ============================================================
-- ตรวจสอบหลังรัน
--   select * from storage.buckets;                    -- ต้องเหลือแค่ camera-images
--   select count(*) from storage.objects
--    where bucket_id = 'camera-images';               -- รูปกล้อง + thumb/ ต้องยังอยู่ครบ
-- ============================================================

-- ============================================================
-- หมายเหตุเพิ่มเติม: ตั้ง cache-control ให้ไฟล์ที่มีอยู่
-- ไฟล์ที่อัปโหลดก่อนหน้านี้ได้ cacheControl = 3600 (1 ชม.)
-- ทำให้เบราว์เซอร์โหลดรูปเต็มใหม่ทุกชั่วโมง = ต้นเหตุ Cached Egress
--
-- SQL แก้ metadata ตรงๆ ไม่ได้ (CDN อ่านจาก header ตอน upload)
-- ต้องใช้ปุ่ม "จัดระเบียบรูป" ในหน้า "กล้องทั้งหมด" ของแอปแทน
-- (มันจะ re-upload ทับด้วย cacheControl 1 ปี + สร้าง thumbnail ให้ด้วย)
--
-- ดูของเดิมได้ด้วย:
--   select name, metadata->>'cacheControl' as cache_control
--     from storage.objects
--    where bucket_id = 'camera-images'
--    order by name;
-- ============================================================
