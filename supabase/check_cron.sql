-- ============================================================
-- check_cron.sql — ตรวจว่าระบบ "คืนกล้อง/ส่งกล้องอัตโนมัติ" ยังทำงานอยู่ไหม
--
-- ทำไมต้องตรวจ: ตาราง cron.* อ่านผ่าน API ของแอปไม่ได้ ต้องรันที่นี่เท่านั้น
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทีละบล็อก → Run
-- ============================================================


-- ═══ 1. extension ติดตั้งครบไหม ═══════════════════════════════
-- ต้องเห็น pg_cron และ pg_net ถ้าไม่เห็น = ระบบอัตโนมัติไม่เคยทำงานเลย
select extname, extversion
from pg_extension
where extname in ('pg_cron', 'pg_net')
order by extname;


-- ═══ 2. มี job ตั้งไว้ไหม และเปิดอยู่หรือเปล่า ══════════════════
-- ควรเห็น 3 job: auto-rental-status (ทุกนาที) · queue-reminders (ทุก 5 นาที)
--                daily-summary (วันละครั้ง)
-- ดูคอลัมน์ active ต้องเป็น true
select jobid, jobname, schedule, active, command
from cron.job
order by jobname;


-- ═══ 3. รันจริงหรือเปล่า และผลเป็นยังไง ════════════════════════
-- ⭐ บล็อกนี้สำคัญที่สุด
-- ถ้าว่างเปล่า = cron ไม่เคยทำงานเลย
-- ถ้า status = 'failed' = ทำงานแต่พัง ดู return_message ว่าพังเพราะอะไร
select
  j.jobname,
  d.status,
  d.start_time at time zone 'Asia/Bangkok' as เวลาไทย,
  d.return_message
from cron.job_run_details d
join cron.job j on j.jobid = d.jobid
order by d.start_time desc
limit 30;


-- ═══ 4. สรุปว่าแต่ละ job สำเร็จ/ล้มเหลวกี่ครั้ง ═════════════════
select
  j.jobname,
  d.status,
  count(*) as ครั้ง,
  max(d.start_time at time zone 'Asia/Bangkok') as ล่าสุด
from cron.job_run_details d
join cron.job j on j.jobid = d.jobid
group by j.jobname, d.status
order by j.jobname, d.status;


-- ═══ 5. ทดสอบเรียกฟังก์ชันตรงๆ (ไม่ผ่าน cron) ══════════════════
-- ถ้าบรรทัดนี้ error = ตัวฟังก์ชันเองมีปัญหา ไม่ใช่เรื่อง cron
select auto_update_rental_status();

-- ดูว่ามีรายการไหนเปลี่ยนสถานะไหมหลังเรียก
select r.status, c.name as กล้อง, r.end_date, r.return_time,
       r.updated_at at time zone 'Asia/Bangkok' as แก้ล่าสุด
from rentals r left join cameras c on c.id = r.camera_id
where r.status in ('active','booked')
order by r.end_date;


-- ============================================================
-- ถ้าผลออกมาว่า "ไม่มี extension" หรือ "ไม่มี job" → รันชุดนี้เพื่อติดตั้งใหม่
-- (ปลดคอมเมนต์แล้วรัน — ปลอดภัย รันซ้ำได้)
-- ============================================================

-- -- 1) เปิด extension  (ถ้า error ให้ไปเปิดที่ Dashboard → Database → Extensions
-- --    ค้นหา pg_cron และ pg_net แล้วกดเปิด จากนั้นค่อยกลับมารันข้อ 2)
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;

-- -- 2) ตั้ง job ใหม่ทั้ง 3 ตัว
-- do $$ begin perform cron.unschedule('auto-rental-status'); exception when others then null; end $$;
-- select cron.schedule('auto-rental-status', '* * * * *', $$ select auto_update_rental_status(); $$);

-- do $$ begin perform cron.unschedule('queue-reminders'); exception when others then null; end $$;
-- select cron.schedule('queue-reminders', '*/5 * * * *', $$ select send_queue_reminders(); $$);

-- do $$ begin perform cron.unschedule('daily-summary'); exception when others then null; end $$;
-- select cron.schedule('daily-summary', '0 17 * * *', $$ select send_daily_summary(); $$);

-- -- 3) รอ 2 นาที แล้วรันข้อ 3 ด้านบนอีกครั้ง — ต้องเห็น status = 'succeeded'
