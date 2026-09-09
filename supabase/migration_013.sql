-- ============================================================
-- migration_013.sql — HICHAO.CNX
-- สำรองข้อมูลอัตโนมัติทุกวันขึ้น Google Drive ผ่าน Edge Function
-- `daily-backup` + ตาราง backup_log เก็บประวัติ (ทั้งอัตโนมัติ
-- และตอนกดปุ่ม "สำรองข้อมูล" เองในแอป — เห็นรวมกันในที่เดียว)
--
-- ก่อนรันไฟล์นี้ ต้องทำให้ครบก่อน (ดูขั้นตอนละเอียดใน BACKUP-AUTO-SETUP.md):
--   1) สร้าง Google Service Account + แชร์โฟลเดอร์ Drive ปลายทางให้มันแล้ว
--   2) ตั้ง secret ให้ Edge Function daily-backup ครบ 3 ตัว:
--        GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID
--   3) deploy ฟังก์ชันแล้ว: supabase functions deploy daily-backup
--
-- วิธีรัน: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run (รันซ้ำได้ ปลอดภัย)
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ============================================================
-- TABLE: backup_log — ประวัติการสำรองข้อมูล
-- ============================================================
create table if not exists backup_log (
  id            uuid primary key default uuid_generate_v4(),
  source        text not null check (source in ('auto', 'manual')),
  status        text not null check (status in ('success', 'error')) default 'success',
  counts        jsonb,
  file_name     text,
  drive_file_id text,
  error_text    text,
  created_at    timestamptz not null default now()
);

alter table backup_log enable row level security;

-- authenticated อ่านได้ทุกแถว — ใช้แสดงป้าย "สำรองล่าสุด" ในแอป
do $$ begin
  create policy "Authenticated read backup_log"
    on backup_log for select
    using (auth.role() = 'authenticated');
exception when duplicate_object then null;
end $$;

-- authenticated เพิ่มแถวได้ — ใช้ตอนกด "สำรองข้อมูล" เองในแอป
-- (ฝั่ง auto เขียนด้วย service role key ใน Edge Function อยู่แล้ว ไม่ผ่าน RLS นี้)
do $$ begin
  create policy "Authenticated insert backup_log"
    on backup_log for insert
    with check (auth.role() = 'authenticated');
exception when duplicate_object then null;
end $$;

create index if not exists idx_backup_log_created on backup_log(created_at desc);

-- ============================================================
-- CRON: เรียก Edge Function daily-backup ทุกวัน
-- 04:00 น. เวลาไทย = 21:00 UTC (ของคืนก่อนหน้า) — ร้านปิดแล้ว ข้อมูลนิ่ง
-- ============================================================
do $$ begin perform cron.unschedule('daily-backup'); exception when others then null; end $$;

select cron.schedule(
  'daily-backup',
  '0 21 * * *',
  $$
  select net.http_post(
    url     := 'https://ceutmrmtebnprbkotqzy.supabase.co/functions/v1/daily-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- anon key เดียวกับที่ใช้เรียก Edge Function อื่นๆ ในไฟล์นี้ (public key อยู่แล้ว ไม่ใช่ความลับ)
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldXRtcm10ZWJucHJia290cXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjAyNjIsImV4cCI6MjA5NTY5NjI2Mn0._1wHTiFkTCyto2ip8YohENmBnsqdFiBgt-tdgDXbH3E'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- ตรวจสอบ / จัดการ (รันแยกเมื่อต้องการ)
--   ทดสอบทันทีไม่ต้องรอ cron: select net.http_post(
--     url := 'https://ceutmrmtebnprbkotqzy.supabase.co/functions/v1/daily-backup',
--     headers := jsonb_build_object('Content-Type','application/json'),
--     body := '{}'::jsonb
--   );
--   (หรือกด "Invoke" ที่หน้า Edge Functions > daily-backup ใน Dashboard ก็ได้ — ง่ายกว่า)
--
--   ดู job:            select * from cron.job where jobname = 'daily-backup';
--   ดู log รันล่าสุด:  select * from cron.job_run_details
--                       where jobid = (select jobid from cron.job where jobname = 'daily-backup')
--                       order by start_time desc limit 5;
--   ดูประวัติ backup:  select * from backup_log order by created_at desc limit 20;
--   ปิด job:           select cron.unschedule('daily-backup');
-- ============================================================
