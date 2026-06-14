-- ============================================================
-- migration_003.sql
-- Auto ส่งกล้อง (booked -> active) และ คืนกล้อง (active -> returned)
-- ทำงานบน server ตลอด 24/7 ด้วย pg_cron (รันทุก 1 นาที)
-- + ยิงแจ้งเตือน LINE ผ่าน Edge Function send-line (ที่ deploy อยู่แล้ว)
-- เวลาเทียบตามโซน Asia/Bangkok (UTC+7)
--
-- วิธีรัน: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run  (รันซ้ำได้ ปลอดภัย)
-- ============================================================

-- 1) extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;   -- สำหรับเรียก Edge Function (ยิง LINE)

-- 2) ฟังก์ชันหลัก: อัปเดตสถานะตามเวลา + ยิง LINE ต่อรายการ
create or replace function auto_update_rental_status()
returns void
language plpgsql
security definer
as $$
declare
  now_local timestamp := (now() at time zone 'Asia/Bangkok');
  -- Edge Function send-line (รับ body { "message": "..." })
  fn_url  text := 'https://ceutmrmtebnprbkotqzy.supabase.co/functions/v1/send-line';
  -- anon key (public — เป็น key เดียวกับที่ frontend ใช้)
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldXRtcm10ZWJucHJia290cXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjAyNjIsImV4cCI6MjA5NTY5NjI2Mn0._1wHTiFkTCyto2ip8YohENmBnsqdFiBgt-tdgDXbH3E';
  rec record;
  msg text;
begin
  ----------------------------------------------------------------
  -- ส่งกล้อง: booked -> active เมื่อถึงเวลา pickup
  -- (ไม่ได้ตั้ง pickup_time = ต้นวันของ start_date)
  ----------------------------------------------------------------
  for rec in
    select r.id, r.end_date,
           c.id  as cam_id,  c.name  as cam_name,
           cu.name as cust_name
      from rentals r
      left join cameras   c  on c.id  = r.camera_id
      left join customers cu on cu.id = r.customer_id
     where r.status = 'booked'
       and (r.start_date + coalesce(r.pickup_time, '00:00:00'::time)) <= now_local
  loop
    update rentals set status = 'active', updated_at = now() where id = rec.id;
    if rec.cam_id is not null then
      update cameras set status = 'rented', updated_at = now() where id = rec.cam_id;
    end if;

    msg := '[HICHAO.CNX] 🟠 ส่งกล้องอัตโนมัติ' || chr(10) ||
           '📷 ' || coalesce(rec.cam_name, 'กล้อง') || chr(10) ||
           '👤 ' || coalesce(rec.cust_name, '—')   || chr(10) ||
           '🗓 คืนวันที่ ' || rec.end_date;

    perform net.http_post(
      url     := fn_url,
      headers := jsonb_build_object('Content-Type','application/json',
                                    'Authorization','Bearer ' || anon_key),
      body    := jsonb_build_object('message', msg)
    );
  end loop;

  ----------------------------------------------------------------
  -- คืนกล้อง: active -> returned เมื่อถึงเวลา return
  -- (ไม่ได้ตั้ง return_time = สิ้นวันของ end_date)
  ----------------------------------------------------------------
  for rec in
    select r.id, r.insurance,
           c.id  as cam_id,  c.name  as cam_name,
           cu.name as cust_name
      from rentals r
      left join cameras   c  on c.id  = r.camera_id
      left join customers cu on cu.id = r.customer_id
     where r.status = 'active'
       and (r.end_date + coalesce(r.return_time, '23:59:00'::time)) <= now_local
  loop
    update rentals
       set status = 'returned',
           insurance_returned = case when rec.insurance > 0 then true else insurance_returned end,
           updated_at = now()
     where id = rec.id;
    if rec.cam_id is not null then
      update cameras set status = 'available', updated_at = now() where id = rec.cam_id;
    end if;

    msg := '[HICHAO.CNX] ✅ คืนกล้องอัตโนมัติ' || chr(10) ||
           '📷 ' || coalesce(rec.cam_name, 'กล้อง') || chr(10) ||
           '👤 ' || coalesce(rec.cust_name, '—');

    perform net.http_post(
      url     := fn_url,
      headers := jsonb_build_object('Content-Type','application/json',
                                    'Authorization','Bearer ' || anon_key),
      body    := jsonb_build_object('message', msg)
    );
  end loop;
end;
$$;

-- 3) ตั้ง cron รันทุก 1 นาที (ลบของเดิมก่อน กันซ้ำ)
do $$
begin
  perform cron.unschedule('auto-rental-status');
exception when others then
  null;
end $$;

select cron.schedule(
  'auto-rental-status',
  '* * * * *',
  $$ select auto_update_rental_status(); $$
);

-- ============================================================
-- ตรวจสอบ / จัดการ (รันแยกเมื่อต้องการ)
--   ทดสอบทันที:    select auto_update_rental_status();
--   ดู job:        select * from cron.job;
--   ดู log ล่าสุด: select * from cron.job_run_details order by start_time desc limit 20;
--   ดูผล http:     select * from net._http_response order by created desc limit 10;
--   ปิด job:       select cron.unschedule('auto-rental-status');
-- ============================================================
