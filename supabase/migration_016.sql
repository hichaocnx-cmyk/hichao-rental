-- ============================================================
-- migration_016.sql — HICHAO.CNX
-- แจ้งเตือนเด้งบนหน้าล็อค iPhone (Web Push) — ดูขั้นตอนทั้งหมดใน PUSH-SETUP.md
--
-- สร้าง 2 ตาราง + ตั้ง cron เรียก Edge Function `push-notify` ทุก 5 นาที
--   push_subscriptions — เครื่องที่กด "เปิดการแจ้งเตือน" ในแอป (1 แถว/เครื่อง)
--   push_log           — บันทึกว่าส่งอะไรไปแล้ว กันส่งซ้ำ (แยกจาก flag ของระบบเตือน LINE เดิม)
--
-- วิธีรัน: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run (รันซ้ำได้ ปลอดภัย)
-- ต้อง deploy Edge Function `push-notify` ก่อน ไม่งั้น cron จะเรียกแล้วเจอ 404 (ไม่พังอะไร แค่ยังไม่ทำงาน)
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── 1) เครื่องที่รับแจ้งเตือน ─────────────────────────────────
create table if not exists push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  endpoint        text not null unique,      -- ที่อยู่ของเครื่องบนระบบแจ้งเตือนของ Apple/Google
  p256dh          text not null,             -- กุญแจเข้ารหัสของเครื่อง (สาธารณะ)
  auth            text not null,
  user_id         uuid default auth.uid(),
  device          text,                      -- เช่น "iPhone" ไว้ดูว่าเครื่องไหน
  created_at      timestamptz not null default now(),
  last_success_at timestamptz,
  last_error      text
);

alter table push_subscriptions enable row level security;

-- ผู้ใช้ที่ล็อกอินแล้ว (เจ้าของร้าน/พนักงาน) เพิ่ม/ลบ/ดูเครื่องได้ — คนนอกแตะไม่ได้
do $$ begin
  create policy "Authenticated manage push_subscriptions"
    on push_subscriptions for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');
exception when duplicate_object then null;
end $$;

-- ── 2) บันทึกการส่ง (กันส่งซ้ำ) ──────────────────────────────
-- key เช่น 'summary:2026-10-20' · 'pickup:<id ชุดเช่า>:2026-10-20'
-- เขียนด้วย service role ใน Edge Function เท่านั้น → เปิด RLS ไว้โดยไม่มี policy = แอปแตะไม่ได้
create table if not exists push_log (
  key     text primary key,
  sent_at timestamptz not null default now()
);
alter table push_log enable row level security;
create index if not exists idx_push_log_sent on push_log(sent_at);

-- ── 3) cron: เรียก push-notify ทุก 5 นาที ───────────────────
-- ฟังก์ชันตัดสินใจเองว่าจะส่งอะไร (สรุปเช้า 08:00 / เตือนก่อนรับ-คืน 60 นาที)
-- ถ้ายังไม่มีเครื่องไหนเปิดรับ ฟังก์ชันจะจบทันทีไม่ทำอะไร
do $$ begin perform cron.unschedule('push-notify'); exception when others then null; end $$;

select cron.schedule(
  'push-notify',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://ceutmrmtebnprbkotqzy.supabase.co/functions/v1/push-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- anon key ตัวเดียวกับ cron ตัวอื่น (public key ไม่ใช่ความลับ)
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldXRtcm10ZWJucHJia290cXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjAyNjIsImV4cCI6MjA5NTY5NjI2Mn0._1wHTiFkTCyto2ip8YohENmBnsqdFiBgt-tdgDXbH3E'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- ตรวจสอบ / จัดการ (รันแยกเมื่อต้องการ)
--   เครื่องที่เปิดรับแจ้งเตือน:  select device, created_at, last_success_at, last_error from push_subscriptions;
--   ส่งอะไรไปแล้วบ้าง:          select * from push_log order by sent_at desc limit 20;
--   ผลการเรียกล่าสุด:            select status_code, content, created from net._http_response order by created desc limit 5;
--   ดู job:                       select * from cron.job where jobname = 'push-notify';
--   ปิดแจ้งเตือนทั้งระบบชั่วคราว: select cron.unschedule('push-notify');
-- ============================================================
