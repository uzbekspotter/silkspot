-- ============================================================
-- SILKSPOT — Migration 005
-- Add is_banned column to user_profiles
-- ============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
