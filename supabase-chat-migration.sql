-- Chat improvements migration
-- Run this in Supabase → SQL Editor

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_url TEXT;
