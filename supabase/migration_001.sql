-- ============================================================
-- HICHAO.CNX — Migration 001
-- วิธีใช้: รันใน Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. เพิ่ม due_on_pickup ในตาราง rentals
ALTER TABLE rentals
  ADD COLUMN IF NOT EXISTS due_on_pickup numeric(10,2) NOT NULL DEFAULT 0;

-- 2. เพิ่ม deposit ในตาราง cameras
ALTER TABLE cameras
  ADD COLUMN IF NOT EXISTS deposit numeric(10,2) NOT NULL DEFAULT 0;

-- 3. เพิ่ม address ในตาราง customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS address text;

-- 4. แก้ expenses: rename description → note
--    (ถ้ามีข้อมูลเก่าอยู่แล้ว ข้อมูลจะถูก preserve ไว้)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'description'
  ) THEN
    ALTER TABLE expenses RENAME COLUMN description TO note;
  END IF;
END $$;

-- 5. ถ้า note ยังไม่มี constraint NOT NULL ให้เปลี่ยน
ALTER TABLE expenses
  ALTER COLUMN note SET NOT NULL;
