-- ============================================================
-- migration_011.sql — ซ่อมระบบคืน/ส่งกล้องอัตโนมัติ (รันไปแล้วเมื่อ 2 ส.ค. 2569)
--
-- ⚠️ ไฟล์นี้บันทึกสิ่งที่รันไปแล้วบน production เพื่อให้โค้ดกับ DB ตรงกัน
--
-- ── สิ่งที่ตรวจพบ ──────────────────────────────────────────────
-- 1) cron job 'auto-rental-status' หายไปจากระบบ
--    มีแค่ queue-reminders กับ daily-summary
--    → ระบบคืน/ส่งกล้องอัตโนมัติ "ไม่เคยทำงานเลย"
--
-- 2) พอสร้าง job กลับมา ฟังก์ชันก็ยัง error ทุกนาที:
--      COALESCE types text and time without time zone cannot be matched
--
-- 3) ต้นตอจริง: คอลัมน์ pickup_time / return_time ในฐานข้อมูลเป็น **text**
--    ไม่ใช่ time ตามที่ supabase/schema.sql เขียนไว้
--    (ปัญหาตระกูลเดียวกับ cameras.serial_number ที่ทำให้ทุกหน้าว่างเปล่า)
--    บั๊กนี้ยังทำให้ queue-reminders พังไป 8,400 ครั้งด้วย
--    ("operator does not exist: date + text")
-- ============================================================


-- ── 1) ซ่อมฟังก์ชัน: cast text → time ให้ถูกชนิด ───────────────
create or replace function auto_update_rental_status()
returns void language plpgsql security definer as $fn$
declare
  now_local timestamp := (now() at time zone 'Asia/Bangkok');
  rec record;
begin
  -- ⚠️ pickup_time / return_time เก็บเป็น text ต้อง cast เอง
  --    nullif(...,'') กันค่าว่างที่ cast ไม่ได้
  for rec in
    select r.id, c.id as cam_id
      from rentals r left join cameras c on c.id = r.camera_id
     where r.status = 'booked'
       and (r.start_date + coalesce(nullif(r.pickup_time,'')::time, '00:00:00'::time)) <= now_local
  loop
    update rentals set status = 'active', updated_at = now() where id = rec.id;
    if rec.cam_id is not null then
      update cameras set status = 'rented', updated_at = now() where id = rec.cam_id;
    end if;
  end loop;

  for rec in
    select r.id, r.insurance, c.id as cam_id
      from rentals r left join cameras c on c.id = r.camera_id
     where r.status = 'active'
       and (r.end_date + coalesce(nullif(r.return_time,'')::time, '23:59:00'::time)) <= now_local
  loop
    update rentals
       set status = 'returned',
           insurance_returned = case when coalesce(r_ins.insurance,0) > 0 then true else insurance_returned end,
           updated_at = now()
      from (select rec.insurance as insurance) r_ins
     where rentals.id = rec.id;
    if rec.cam_id is not null then
      update cameras set status = 'available', updated_at = now() where id = rec.cam_id;
    end if;
  end loop;
end $fn$;


-- ── 2) ตั้ง cron job ที่หายไปกลับมา (ทุก 1 นาที) ───────────────
do $$ begin perform cron.unschedule('auto-rental-status'); exception when others then null; end $$;
select cron.schedule('auto-rental-status', '* * * * *', $$ select auto_update_rental_status(); $$);


-- ============================================================
-- ตรวจผลหลังรัน (รอ 2 นาทีแล้วรัน)
--   ต้องเห็น status = 'succeeded'
-- ============================================================
-- select to_char(d.start_time at time zone 'Asia/Bangkok','HH24:MI') as run_at,
--        d.status, left(coalesce(d.return_message,''),60) as msg
-- from cron.job_run_details d join cron.job j on j.jobid = d.jobid
-- where j.jobname = 'auto-rental-status'
-- order by d.start_time desc limit 5;


-- ============================================================
-- ⚠️ ยังเหลือให้ทำ: แก้ schema.sql ให้ตรงกับฐานข้อมูลจริง
--    ชนิดคอลัมน์ที่ไฟล์เขียนผิด:
--      rentals.pickup_time  → จริงเป็น text (ไฟล์เขียน time)
--      rentals.return_time  → จริงเป็น text (ไฟล์เขียน time)
--      cameras.serial_number → ไม่มีอยู่จริง
--    ตรวจของจริงได้ด้วย:
--      select column_name, data_type from information_schema.columns
--       where table_name = 'rentals' order by ordinal_position;
-- ============================================================
