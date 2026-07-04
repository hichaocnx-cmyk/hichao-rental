-- ============================================================
-- HICHAO.CNX — Migration 006
-- Re-sync camera status after changing booked rentals to no longer
-- mark cameras as rented before the actual pickup/active period.
--
-- Safe to run again. Maintenance cameras are preserved.
-- ============================================================

update cameras c
   set status = case
     when exists (
       select 1
         from rentals r
        where r.camera_id = c.id
          and r.status = 'active'
     ) then 'rented'
     else 'available'
   end,
       updated_at = now()
 where c.status <> 'maintenance';

