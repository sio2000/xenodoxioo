-- Check and fix foreign key constraints on users table
-- The error shows 'users_id_fkey' constraint is blocking inserts

-- Check current foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'users';

-- Drop the problematic foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_id_fkey' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_id_fkey;
        RAISE NOTICE 'Dropped users_id_fkey constraint';
    ELSE
        RAISE NOTICE 'users_id_fkey constraint not found';
    END IF;
END $$;

-- Make sure id is properly set as primary key (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'PRIMARY KEY' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users ADD PRIMARY KEY (id);
        RAISE NOTICE 'Added primary key to users table';
    ELSE
        RAISE NOTICE 'Primary key already exists on users table';
    END IF;
END $$;

-- Verify the fix
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name
FROM information_schema.table_constraints AS tc 
WHERE tc.table_name = 'users'
    AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY');
