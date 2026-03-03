-- Fix the users table id column to properly auto-generate UUIDs
-- The current id column has null default instead of uuid_generate_v4()

-- First, enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fix the id column to have proper UUID default
ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Also fix any other tables that might have the same issue
ALTER TABLE properties ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE units ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE bookings ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE payments ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE reviews ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE admin_logs ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE date_blockages ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE seasonal_pricing ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE coupons ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE amenities ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE email_logs ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE sessions ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE password_resets ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Verify the fix
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND table_schema = 'public'
    AND column_name = 'id';
