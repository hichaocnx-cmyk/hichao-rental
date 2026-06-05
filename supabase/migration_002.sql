-- ============================================================
-- HICHAO.CNX — Migration 002
-- เพิ่ม insurance_returned สำหรับ track การคืนเงินประกัน
-- วิธีใช้: รันใน Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE rentals
  ADD COLUMN IF NOT EXISTS insurance_returned boolean NOT NULL DEFAULT false;
