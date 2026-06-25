-- ============================================================
-- migration_005.sql  —  HICHAO.CNX
-- ลดการใช้โควต้า LINE: ตัดแจ้งเตือน "ส่งกล้อง/คืนกล้อง อัตโนมัติ" ออก
-- (ยังอัปเดตสถานะ booked->active->returned ตามเวลาเหมือนเดิม
--  แต่ไม่ยิง LINE ต่อรายการแล้ว — เก็บไว้แค่ เตือนคิว + สรุปประจำวัน)
--
-- วิธีรัน: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run (รันซ้ำได้ ปลอดภัย)
-- ============================================================

create or replace function auto_update_rental_status()
returns void
language plpgsql
security definer
as $$
declare
  now_local timestamp := (now() at time zone 'Asia/Bangkok');
  rec record;
begin
  -- ส่งกล้อง: booked -> active เมื่อถึงเวลา pickup (ไม่ยิง LINE)
  for rec in
    select r.id, c.id as cam_id
      from rentals r
      left join cameras c on c.id = r.camera_id
     where r.status = 'booked'
       and (r.start_date + coalesce(r.pickup_time, '00:00:00'::time)) <= now_local
  loop
    update rentals set status = 'active', updated_at = now() where id = rec.id;
    if rec.cam_id is not null then
      update cameras set status = 'rented', updated_at = now() where id = rec.cam_id;
    end if;
  end loop;

  -- คืนกล้อง: active -> returned เมื่อถึงเวลา return (ไม่ยิง LINE)
  for rec in
    select r.id, r.insurance, c.id as cam_id
      from rentals r
      left join cameras c on c.id = r.camera_id
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
  end loop;
end;
$$;

-- cron 'auto-rental-status' เดิมยังเรียกฟังก์ชันนี้อยู่ (ไม่ต้องตั้งใหม่)
