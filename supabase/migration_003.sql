-- ============================================================
-- migration_003.sql
-- Auto ส่งกล้อง (booked -> active) และ คืนกล้อง (active -> returned)
-- ทำงานบน server ตลอด 24/7 ด้วย pg_cron (รันทุก 1 นาที)
-- เวลาเทียบตามโซน Asia/Bangkok (UTC+7)
--
-- วิธีรัน: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run
-- (รันซ้ำได้ ปลอดภัย — idempotent)
-- ============================================================

-- 1) เปิด extension ที่ต้องใช้
create extension if not exists pg_cron;

-- 2) ฟังก์ชันอัปเดตสถานะตามเวลา
create or replace function auto_update_rental_status()
returns void
language plpgsql
security definer
as $$
declare
  now_local timestamp := (now() at time zone 'Asia/Bangkok');
begin
  ----------------------------------------------------------------
  -- ส่งกล้อง: booked -> active เมื่อถึงเวลา pickup
  -- (ถ้าไม่ได้ตั้ง pickup_time = ต้นวันของ start_date)
  ----------------------------------------------------------------
  update cameras c
     set status = 'rented', updated_at = now()
    from rentals r
   where r.camera_id = c.id
     and r.status = 'booked'
     and (r.start_date + coalesce(r.pickup_time, '00:00:00'::time)) <= now_local;

  update rentals r
     set status = 'active', updated_at = now()
   where r.status = 'booked'
     and (r.start_date + coalesce(r.pickup_time, '00:00:00'::time)) <= now_local;

  ----------------------------------------------------------------
  -- คืนกล้อง: active -> returned เมื่อถึงเวลา return
  -- (ถ้าไม่ได้ตั้ง return_time = สิ้นวันของ end_date)
  ----------------------------------------------------------------
  update cameras c
     set status = 'available', updated_at = now()
    from rentals r
   where r.camera_id = c.id
     and r.status = 'active'
     and (r.end_date + coalesce(r.return_time, '23:59:00'::time)) <= now_local;

  update rentals r
     set status = 'returned',
         insurance_returned = case when r.insurance > 0 then true else r.insurance_returned end,
         updated_at = now()
   where r.status = 'active'
     and (r.end_date + coalesce(r.return_time, '23:59:00'::time)) <= now_local;
end;
$$;

-- 3) ตั้ง cron ให้รันทุก 1 นาที (ลบของเดิมก่อนถ้ามี กันซ้ำ)
do $$
begin
  perform cron.unschedule('auto-rental-status');
exception when others then
  null; -- ยังไม่เคยตั้ง ไม่ต้องทำอะไร
end $$;

select cron.schedule(
  'auto-rental-status',
  '* * * * *',
  $$ select auto_update_rental_status(); $$
);

-- ============================================================
-- ตรวจสอบ / จัดการ (รันแยกเมื่อต้องการ)
--   ดู job:        select * from cron.job;
--   ดู log ล่าสุด: select * from cron.job_run_details order by start_time desc limit 20;
--   ทดสอบทันที:    select auto_update_rental_status();
--   ปิด job:       select cron.unschedule('auto-rental-status');
-- ============================================================

-- ------------------------------------------------------------
-- (ตัวเลือกเสริม) แจ้งเตือน LINE จาก server เมื่อ auto เปลี่ยนสถานะ
-- ค่าเริ่มต้น: ฝั่งเว็บ (แบบ A) จะยิง LINE ให้อยู่แล้วตอนเปิดแอป
-- ถ้าต้องการให้ server ยิง LINE เองตอนแอปไม่ได้เปิด ให้:
--   1) create extension if not exists pg_net;
--   2) เก็บ LINE token + function URL แล้วเรียก Edge Function ด้วย
--      net.http_post(...) ภายในฟังก์ชันด้านบน
-- แจ้งผมได้ถ้าต้องการให้เขียนส่วนนี้ให้ (ต้องใช้ service key/secret)
-- ------------------------------------------------------------
