-- Add cancellation token and related fields to bookings table
-- Run this migration in Supabase SQL Editor

-- Add cancellation_token for secure email link cancellation
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_token VARCHAR(255);

-- Optional: token expiration (NULL = no expiry)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- is_cancelled for explicit flag (status='CANCELLED' also indicates cancellation)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;

-- cancelled_at may already exist; ensure it exists
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_token ON bookings(cancellation_token) WHERE cancellation_token IS NOT NULL;
