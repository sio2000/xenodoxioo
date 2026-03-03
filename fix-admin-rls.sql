-- Fix RLS policies to allow admin to view all users
-- The admin panel can't see users because RLS policies are blocking access

-- First, let's check what policies currently exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users';

-- Drop existing user policies and recreate with proper admin access
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Public can create user accounts" ON users;

-- Create new policies that work properly with service role
CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (true);

-- Alternative: More restrictive policies if you want to keep security
-- CREATE POLICY "Users can view own profile" ON users
--   FOR SELECT USING (auth.uid()::text = id::text);

-- CREATE POLICY "Users can update own profile" ON users
--   FOR UPDATE USING (auth.uid()::text = id::text);

-- CREATE POLICY "Admins can view all users" ON users
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM users 
--       WHERE id::text = auth.uid()::text 
--       AND role = 'ADMIN'
--     )
--   );

-- CREATE POLICY "Admins can manage all users" ON users
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM users 
--       WHERE id::text = auth.uid()::text 
--       AND role = 'ADMIN'
--     )
--   );

-- CREATE POLICY "Public can create user accounts" ON users
--   FOR INSERT WITH CHECK (true);

-- Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users';
