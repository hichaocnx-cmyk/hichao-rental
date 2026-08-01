-- ============================================================
-- 02_schema_selfhost.sql  —  สร้างโครงฐานข้อมูลบน VPS
--
-- ต่างจาก supabase/schema.sql อย่างไร:
--   · ตัด RLS policy ทั้งหมด — บน VPS จะเช็คสิทธิ์ที่ API server แทน
--     (เบราว์เซอร์ต่อ Postgres ตรงไม่ได้อีกแล้ว จึงไม่ต้องพึ่ง RLS)
--   · ตัด storage.buckets — รูปเก็บเป็นไฟล์บนดิสก์ nginx เสิร์ฟเอง
--   · เพิ่มตาราง app_users สำหรับ auth (แทน auth.users ของ Supabase)
--   · โครงตาราง 4 ตารางหลัก "เหมือนเดิมเป๊ะ" — JSON ที่ export มา import ได้ตรงๆ
--
-- วิธีใช้บน VPS:
--   sudo -u postgres psql -c "create database hichao"
--   sudo -u postgres psql -c "create user hichao with password 'ตั้งรหัสเอง'"
--   sudo -u postgres psql -d hichao -f 02_schema_selfhost.sql
--   sudo -u postgres psql -d hichao -c "grant all on all tables in schema public to hichao"
--   sudo -u postgres psql -d hichao -c "grant all on schema public to hichao"
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;   -- gen_random_uuid + crypt() สำหรับ hash รหัสผ่าน

-- ============================================================
-- ผู้ใช้ระบบ (แทน auth.users ของ Supabase)
-- ============================================================
create table if not exists app_users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  password_hash  text not null,          -- argon2id จาก API server (ห้ามเก็บรหัสดิบ)
  name           text,
  role           text not null default 'admin' check (role in ('admin','staff')),
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- session แบบ refresh token (revoke ได้ ต่างจาก JWT ลอยๆ)
create table if not exists app_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app_users(id) on delete cascade,
  token_hash  text not null unique,      -- เก็บ hash ไม่เก็บ token จริง
  user_agent  text,
  ip          inet,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_app_sessions_user    on app_sessions(user_id);
create index if not exists idx_app_sessions_expires on app_sessions(expires_at);

-- ============================================================
-- 4 ตารางหลัก — โครงเหมือน Supabase เดิมทุกคอลัมน์
-- (รวม pickup_reminded / return_reminded จาก migration_004)
-- ============================================================
create table if not exists cameras (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  brand           text,
  model           text,
  serial_number   text,
  price_per_day   numeric(10,2) not null default 0,
  insurance       numeric(10,2) not null default 0,
  deposit         numeric(10,2) not null default 0,
  status          text not null default 'available'
                    check (status in ('available','rented','returned','maintenance')),
  image_url       text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  line_id     text,
  id_card     text,
  address     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists rentals (
  id                   uuid primary key default gen_random_uuid(),
  camera_id            uuid references cameras(id)   on delete set null,
  customer_id          uuid references customers(id) on delete set null,
  start_date           date not null,
  end_date             date not null,
  pickup_time          time,
  return_time          time,
  pickup_location      text,
  return_location      text,
  price_per_day        numeric(10,2) not null default 0,
  insurance            numeric(10,2) not null default 0,
  deposit              numeric(10,2) not null default 0,
  delivery_fee         numeric(10,2) not null default 0,
  discount             numeric(10,2) not null default 0,
  total_price          numeric(10,2) not null default 0,
  due_on_pickup        numeric(10,2) not null default 0,
  insurance_returned   boolean not null default false,
  pickup_reminded      boolean not null default false,
  return_reminded      boolean not null default false,
  status               text not null default 'booked'
                         check (status in ('booked','active','returned','cancelled')),
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  category    text not null,
  note        text not null,
  amount      numeric(10,2) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_rentals_status      on rentals(status);
create index if not exists idx_rentals_start_date  on rentals(start_date);
create index if not exists idx_rentals_end_date    on rentals(end_date);
create index if not exists idx_rentals_camera_id   on rentals(camera_id);
create index if not exists idx_rentals_customer_id on rentals(customer_id);
create index if not exists idx_expenses_date       on expenses(date);
create index if not exists idx_customers_phone     on customers(phone);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['cameras','customers','rentals','expenses','app_users'] loop
    execute format('drop trigger if exists %I_updated_at on %I', t, t);
    execute format('create trigger %I_updated_at before update on %I
                    for each row execute function update_updated_at()', t, t);
  end loop;
end $$;

-- ============================================================
-- เวลา: Supabase เก็บเป็น UTC เหมือนกัน จึง import ตรงๆ ได้
-- แต่ตั้ง timezone ของ DB เป็นเวลาไทยไว้ให้ query มือสะดวก
-- ============================================================
-- alter database hichao set timezone to 'Asia/Bangkok';
