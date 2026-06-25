-- ============================================================
-- migration_004.sql  —  HICHAO.CNX
-- ย้าย "แจ้งเตือนก่อนคิว (อีก X นาที)" + "สรุปคิวประจำวัน"
-- มาทำงานฝั่ง server 24/7 ด้วย pg_cron + pg_net (ยิงผ่าน send-line)
-- ไม่ต้องเปิดหน้าเว็บค้างไว้อีกต่อไป และกันส่งซ้ำด้วย flag
--
-- วิธีรัน: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run (รันซ้ำได้ ปลอดภัย)
-- ต้องรัน migration_003.sql มาก่อน (ติดตั้ง pg_cron / pg_net แล้ว)
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1) flag กันส่งเตือนซ้ำ (เตือนครั้งเดียวต่อคิว)
alter table rentals add column if not exists pickup_reminded boolean not null default false;
alter table rentals add column if not exists return_reminded boolean not null default false;

-- ============================================================
-- 2) ฟังก์ชัน: เตือนก่อนคิว ~60 นาที (รับ/คืนกล้อง)
-- ============================================================
create or replace function send_queue_reminders()
returns void
language plpgsql
security definer
as $$
declare
  now_local timestamp := (now() at time zone 'Asia/Bangkok');
  fn_url   text := 'https://ceutmrmtebnprbkotqzy.supabase.co/functions/v1/send-line';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldXRtcm10ZWJucHJia290cXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjAyNjIsImV4cCI6MjA5NTY5NjI2Mn0._1wHTiFkTCyto2ip8YohENmBnsqdFiBgt-tdgDXbH3E';
  rec record;
  msg text;
  diff_min int;
begin
  -- ── คิวรับกล้อง ───────────────────────────────────────────
  for rec in
    select r.id, r.pickup_time, r.pickup_location, r.start_date,
           c.name as cam_name, cu.name as cust_name
      from rentals r
      left join cameras   c  on c.id  = r.camera_id
      left join customers cu on cu.id = r.customer_id
     where r.status in ('booked','active')
       and r.pickup_reminded = false
       and r.pickup_time is not null
       and r.start_date = now_local::date
  loop
    diff_min := round(extract(epoch from ((rec.start_date + rec.pickup_time) - now_local)) / 60);
    if diff_min > 0 and diff_min <= 60 then
      msg := '[HICHAO.CNX] ⏰ อีก ' || diff_min || ' นาที — รับกล้อง' || chr(10) ||
             '📷 ' || coalesce(rec.cam_name, '—') || chr(10) ||
             '👤 ' || coalesce(rec.cust_name, '—') || chr(10) ||
             '🕐 ' || to_char(rec.pickup_time, 'HH24:MI') ||
             coalesce(chr(10) || '📍 ' || rec.pickup_location, '');
      perform net.http_post(
        url     := fn_url,
        headers := jsonb_build_object('Content-Type','application/json',
                                      'Authorization','Bearer ' || anon_key),
        body    := jsonb_build_object('message', msg)
      );
      update rentals set pickup_reminded = true where id = rec.id;
    end if;
  end loop;

  -- ── คิวคืนกล้อง ───────────────────────────────────────────
  for rec in
    select r.id, r.return_time, r.return_location, r.end_date,
           c.name as cam_name, cu.name as cust_name
      from rentals r
      left join cameras   c  on c.id  = r.camera_id
      left join customers cu on cu.id = r.customer_id
     where r.status = 'active'
       and r.return_reminded = false
       and r.return_time is not null
       and r.end_date = now_local::date
  loop
    diff_min := round(extract(epoch from ((rec.end_date + rec.return_time) - now_local)) / 60);
    if diff_min > 0 and diff_min <= 60 then
      msg := '[HICHAO.CNX] ⏰ อีก ' || diff_min || ' นาที — คืนกล้อง' || chr(10) ||
             '📷 ' || coalesce(rec.cam_name, '—') || chr(10) ||
             '👤 ' || coalesce(rec.cust_name, '—') || chr(10) ||
             '🕐 ' || to_char(rec.return_time, 'HH24:MI') ||
             coalesce(chr(10) || '📍 ' || rec.return_location, '');
      perform net.http_post(
        url     := fn_url,
        headers := jsonb_build_object('Content-Type','application/json',
                                      'Authorization','Bearer ' || anon_key),
        body    := jsonb_build_object('message', msg)
      );
      update rentals set return_reminded = true where id = rec.id;
    end if;
  end loop;
end;
$$;

-- ============================================================
-- 3) ฟังก์ชัน: สรุปคิวประจำวัน (ส่งเช้า 08:00 น. เวลาไทย)
-- ============================================================
create or replace function send_daily_summary()
returns void
language plpgsql
security definer
as $$
declare
  now_local timestamp := (now() at time zone 'Asia/Bangkok');
  today     date := now_local::date;
  fn_url    text := 'https://ceutmrmtebnprbkotqzy.supabase.co/functions/v1/send-line';
  anon_key  text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldXRtcm10ZWJucHJia290cXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjAyNjIsImV4cCI6MjA5NTY5NjI2Mn0._1wHTiFkTCyto2ip8YohENmBnsqdFiBgt-tdgDXbH3E';
  th_months text[] := array['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                            'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  rec record;
  msg text;
  n_pick int;
  n_ret  int;
  idx int;
begin
  select count(*) into n_pick from rentals
   where start_date = today and status in ('booked','active');
  select count(*) into n_ret from rentals
   where end_date = today and status = 'active' and start_date <> today;

  msg := '[HICHAO.CNX] 📋 คิวประจำวัน' || chr(10) ||
         extract(day from today) || ' ' ||
         th_months[extract(month from today)::int] || ' ' ||
         (extract(year from today)::int + 543) || chr(10);

  -- รับกล้องวันนี้
  msg := msg || chr(10) || '📦 รับกล้องวันนี้ (' || n_pick || ' รายการ)' || chr(10);
  if n_pick = 0 then
    msg := msg || '  — ไม่มีรายการ' || chr(10);
  else
    idx := 0;
    for rec in
      select r.pickup_time, r.pickup_location, c.name as cam_name, cu.name as cust_name, cu.phone
        from rentals r
        left join cameras   c  on c.id  = r.camera_id
        left join customers cu on cu.id = r.customer_id
       where r.start_date = today and r.status in ('booked','active')
       order by r.pickup_time nulls last
    loop
      idx := idx + 1;
      msg := msg || '  ' || idx || '. 📷 ' || coalesce(rec.cam_name,'—') ||
             ' · ' || coalesce(rec.cust_name,'—') ||
             coalesce(' · 🕐 ' || to_char(rec.pickup_time,'HH24:MI'), '') ||
             coalesce(' · 📍 ' || rec.pickup_location, '') || chr(10);
    end loop;
  end if;

  -- คืนกล้องวันนี้
  msg := msg || chr(10) || '🔄 คืนกล้องวันนี้ (' || n_ret || ' รายการ)' || chr(10);
  if n_ret = 0 then
    msg := msg || '  — ไม่มีรายการ' || chr(10);
  else
    idx := 0;
    for rec in
      select r.return_time, r.return_location, c.name as cam_name, cu.name as cust_name, cu.phone
        from rentals r
        left join cameras   c  on c.id  = r.camera_id
        left join customers cu on cu.id = r.customer_id
       where r.end_date = today and r.status = 'active' and r.start_date <> today
       order by r.return_time nulls last
    loop
      idx := idx + 1;
      msg := msg || '  ' || idx || '. 📷 ' || coalesce(rec.cam_name,'—') ||
             ' · ' || coalesce(rec.cust_name,'—') ||
             coalesce(' · 🕐 ' || to_char(rec.return_time,'HH24:MI'), '') ||
             coalesce(' · 📍 ' || rec.return_location, '') || chr(10);
    end loop;
  end if;

  msg := msg || chr(10) || 'รวม ' || (n_pick + n_ret) || ' รายการ';

  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer ' || anon_key),
    body    := jsonb_build_object('message', msg)
  );
end;
$$;

-- ============================================================
-- 4) ตั้ง cron (ลบของเดิมก่อน กันซ้ำ)
-- ============================================================
do $$ begin perform cron.unschedule('queue-reminders'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('daily-summary');   exception when others then null; end $$;

-- เตือนก่อนคิว: เช็คทุก 5 นาที
select cron.schedule('queue-reminders', '*/5 * * * *', $$ select send_queue_reminders(); $$);

-- สรุปคิวประจำวัน: 08:00 น. เวลาไทย = 01:00 UTC
select cron.schedule('daily-summary', '0 1 * * *', $$ select send_daily_summary(); $$);

-- ============================================================
-- ตรวจสอบ / ทดสอบ (รันแยกเมื่อต้องการ)
--   ทดสอบเตือนทันที:  select send_queue_reminders();
--   ทดสอบสรุปทันที:   select send_daily_summary();
--   ดู cron job:      select * from cron.job;
--   ดู log ล่าสุด:    select * from cron.job_run_details order by start_time desc limit 20;
--   ดูผล http:        select * from net._http_response order by created desc limit 10;
-- ============================================================
