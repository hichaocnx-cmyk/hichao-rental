-- ============================================================
-- HICHAO.CNX Camera Rental — Supabase Schema
-- วิธีใช้: รันไฟล์นี้ใน Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE: cameras
-- ============================================================
create table if not exists cameras (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  brand           text,
  model           text,
  serial_number   text,
  price_per_day   numeric(10,2) not null default 0,
  insurance       numeric(10,2) not null default 0,
  status          text not null default 'available'
                    check (status in ('available','rented','returned','maintenance')),
  image_url       text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- TABLE: customers
-- ============================================================
create table if not exists customers (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  phone       text,
  line_id     text,
  id_card     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- TABLE: rentals
-- ============================================================
create table if not exists rentals (
  id               uuid primary key default uuid_generate_v4(),
  camera_id        uuid references cameras(id) on delete set null,
  customer_id      uuid references customers(id) on delete set null,
  start_date       date not null,
  end_date         date not null,
  pickup_time      time,
  return_time      time,
  pickup_location  text,
  return_location  text,
  price_per_day    numeric(10,2) not null default 0,
  insurance        numeric(10,2) not null default 0,
  deposit          numeric(10,2) not null default 0,
  delivery_fee     numeric(10,2) not null default 0,
  discount         numeric(10,2) not null default 0,
  total_price      numeric(10,2) not null default 0,
  status           text not null default 'booked'
                     check (status in ('booked','active','returned','cancelled')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- TABLE: expenses
-- ============================================================
create table if not exists expenses (
  id          uuid primary key default uuid_generate_v4(),
  date        date not null,
  category    text not null,
  description text not null,
  amount      numeric(10,2) not null default 0,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- STORAGE BUCKET: camera-images
-- ============================================================
insert into storage.buckets (id, name, public)
values ('camera-images', 'camera-images', true)
on conflict (id) do nothing;

-- Storage policy: ทุกคนดูได้, เฉพาะ authenticated upload/delete
create policy "Public read camera images"
  on storage.objects for select
  using (bucket_id = 'camera-images');

create policy "Authenticated upload camera images"
  on storage.objects for insert
  with check (bucket_id = 'camera-images' and auth.role() = 'authenticated');

create policy "Authenticated delete camera images"
  on storage.objects for delete
  using (bucket_id = 'camera-images' and auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKET: daily-queue (สรุปคิวประจำวัน image cards)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('daily-queue', 'daily-queue', true)
on conflict (id) do nothing;

create policy "Public read daily queue images"
  on storage.objects for select
  using (bucket_id = 'daily-queue');

create policy "Authenticated upload daily queue images"
  on storage.objects for insert
  with check (bucket_id = 'daily-queue' and auth.role() = 'authenticated');

create policy "Authenticated delete daily queue images"
  on storage.objects for delete
  using (bucket_id = 'daily-queue' and auth.role() = 'authenticated');

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table cameras   enable row level security;
alter table customers enable row level security;
alter table rentals   enable row level security;
alter table expenses  enable row level security;

-- Cameras
create policy "Authenticated full access cameras"
  on cameras for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Customers
create policy "Authenticated full access customers"
  on customers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Rentals
create policy "Authenticated full access rentals"
  on rentals for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Expenses
create policy "Authenticated full access expenses"
  on expenses for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================
-- INDEXES (performance)
-- ============================================================
create index if not exists idx_rentals_status     on rentals(status);
create index if not exists idx_rentals_start_date on rentals(start_date);
create index if not exists idx_rentals_end_date   on rentals(end_date);
create index if not exists idx_rentals_camera_id  on rentals(camera_id);
create index if not exists idx_expenses_date      on expenses(date);

-- ============================================================
-- AUTO-UPDATE updated_at trigger
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cameras_updated_at   before update on cameras   for each row execute function update_updated_at();
create trigger customers_updated_at before update on customers for each row execute function update_updated_at();
create trigger rentals_updated_at   before update on rentals   for each row execute function update_updated_at();
create trigger expenses_updated_at  before update on expenses  for each row execute function update_updated_at();
