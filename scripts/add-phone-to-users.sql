-- Add phone column to users table for profile storage
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
