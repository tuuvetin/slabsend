-- ============================================================
-- Slabsend MVP migration — aja Supabase SQL Editorissa
-- ============================================================

-- 1. profiles: lisää osoitetiedot
alter table profiles
  add column if not exists address_street text,
  add column if not exists address_postcode text,
  add column if not exists address_city text,
  add column if not exists address_country text default 'FI',
  add column if not exists phone text;

-- 2. listings: lisää paino
alter table listings
  add column if not exists weight_kg numeric,
  add column if not exists shipping_from_country text default 'FI';

-- 3. orders: lisää uudet kentät (jos taulu on jo olemassa)
alter table orders
  add column if not exists buyer_address_street text,
  add column if not exists buyer_address_postcode text,
  add column if not exists buyer_address_city text,
  add column if not exists buyer_country text,
  add column if not exists buyer_phone text,
  add column if not exists buyer_email text,
  add column if not exists item_price_cents integer,
  add column if not exists shipping_cost_cents integer,
  add column if not exists service_fee_cents integer,
  add column if not exists total_cents integer,
  add column if not exists shipping_zone text,
  add column if not exists matkahuolto_activation_code text,
  add column if not exists matkahuolto_tracking_code text,
  add column if not exists label_created_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists payout_sent_at timestamptz;

-- Päivitä status-arvot (paid | label_created | shipped | delivered | completed)
-- Vanha: paid | confirmed | refunded pysyy myös toimivana
