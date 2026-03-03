-- Test RLS with minimal policies to identify the issue

-- Enable RLS on one table at a time
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Test simple policy
CREATE POLICY "Test users policy" ON users
  FOR SELECT USING (auth.uid() = id);

-- If this works, the issue is elsewhere. If it fails, we know the problem is with users table.
