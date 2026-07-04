-- ============================================================
-- migration_007.sql  —  HICHAO.CNX
-- เปลี่ยนเวลาส่งสรุปคิวประจำวัน (LINE) จาก 08:00 น. เวลาไทย
-- ให้เป็น "เที่ยงคืน" (00:00 น. เวลาไทย = 17:00 UTC ของวันก่อนหน้า)
--
-- วิธีรัน: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run (รันซ้ำได้ ปลอดภัย)
-- ============================================================

-- ลบ cron เดิมก่อน กันซ้ำ
do $$ begin perform cron.unschedule('daily-summary'); exception when others then null; end $$;

-- สรุปคิวประจำวัน: 00:00 น. เวลาไทย (เที่ยงคืน) = 17:00 UTC
select cron.schedule('daily-summary', '0 17 * * *', $$ select send_daily_summary(); $$);

-- ============================================================
-- ตรวจสอบ (รันแยกเมื่อต้องการ)
--   ดู cron job:      select * from cron.job where jobname = 'daily-summary';
--   ทดสอบสรุปทันที:   select send_daily_summary();
-- ============================================================
