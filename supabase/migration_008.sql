-- ============================================================
-- migration_008.sql  —  HICHAO.CNX
-- รวมลูกค้าที่ซ้ำกัน (เบอร์โทรเดียวกัน) ให้เหลือคนเดียว
--
-- ที่มา: เดิมตอนสร้างรายการเช่าใหม่ ระบบสร้างลูกค้าใหม่ทุกครั้ง
-- แม้เบอร์โทรซ้ำ ทำให้มีลูกค้าซ้ำหลายแถว ประวัติการเช่ากระจัดกระจาย
-- (ฝั่งแอปแก้แล้ว: เช็คเบอร์ก่อนสร้าง — migration นี้ล้างของเก่า)
--
-- สิ่งที่ทำ (ต่อกลุ่มเบอร์ที่ซ้ำ):
--   1. เก็บลูกค้าคนแรกสุด (created_at เก่าสุด) ไว้เป็นตัวจริง
--   2. เติมข้อมูลที่ตัวจริงยังขาด (บัตร ปชช./ที่อยู่/LINE/หมายเหตุ) จากแถวซ้ำ
--   3. ย้ายรายการเช่าทั้งหมดของแถวซ้ำ มาชี้ที่ตัวจริง
--   4. ลบแถวซ้ำทิ้ง
--
-- วิธีรัน: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run
-- (รันซ้ำได้ ปลอดภัย — รอบสองจะไม่เจออะไรให้รวมแล้ว)
-- ============================================================

do $$
declare
  rec record;
  keeper_id uuid;
  dup record;
begin
  -- หากลุ่มเบอร์โทร (ตัวเลขล้วน) ที่มีลูกค้ามากกว่า 1 คน
  for rec in
    select regexp_replace(phone, '\D', '', 'g') as p
    from customers
    where phone is not null
      and length(regexp_replace(phone, '\D', '', 'g')) >= 9
    group by 1
    having count(*) > 1
  loop
    -- ตัวจริง = คนที่สร้างก่อนสุด
    select id into keeper_id
    from customers
    where regexp_replace(phone, '\D', '', 'g') = rec.p
    order by created_at asc
    limit 1;

    -- เติมข้อมูลที่ตัวจริงยังว่าง จากแถวซ้ำ (เอาค่าแรกที่ไม่ว่าง)
    for dup in
      select * from customers
      where regexp_replace(phone, '\D', '', 'g') = rec.p and id <> keeper_id
      order by created_at asc
    loop
      update customers k set
        id_card = coalesce(nullif(k.id_card, ''), nullif(dup.id_card, '')),
        address = coalesce(nullif(k.address, ''), nullif(dup.address, '')),
        line_id = coalesce(nullif(k.line_id, ''), nullif(dup.line_id, '')),
        notes   = coalesce(nullif(k.notes,   ''), nullif(dup.notes,   ''))
      where k.id = keeper_id;
    end loop;

    -- ย้ายรายการเช่าของแถวซ้ำ มาชี้ที่ตัวจริง
    update rentals set customer_id = keeper_id
    where customer_id in (
      select id from customers
      where regexp_replace(phone, '\D', '', 'g') = rec.p and id <> keeper_id
    );

    -- ลบแถวซ้ำ
    delete from customers
    where regexp_replace(phone, '\D', '', 'g') = rec.p and id <> keeper_id;

    raise notice 'รวมลูกค้าเบอร์ % เรียบร้อย (เหลือ id=%)', rec.p, keeper_id;
  end loop;
end $$;

-- ============================================================
-- ตรวจสอบหลังรัน (รันแยกเมื่อต้องการ)
--   เช็คว่ายังมีเบอร์ซ้ำไหม (ควรได้ 0 แถว):
--     select regexp_replace(phone,'\D','','g') p, count(*)
--     from customers where phone is not null
--     group by 1 having count(*) > 1;
--   นับลูกค้าทั้งหมด: select count(*) from customers;
-- ============================================================
