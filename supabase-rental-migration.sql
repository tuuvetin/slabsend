-- Rental improvements migration
-- Run this in Supabase → SQL Editor

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS pickup_location TEXT,
  ADD COLUMN IF NOT EXISTS weekly_discount_pct INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_discount_pct INTEGER DEFAULT 0;
