-- ========================================
-- DATA CONSISTENCY FIXES FOR MIGRATION
-- ========================================

-- 1. FIX EMPTY SLUGS FOR PROPERTIES
UPDATE properties 
SET slug = 
  CASE 
    WHEN slug IS NULL OR slug = '' THEN 
      'property-' || LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, ' ', '-'), '.', ''), ',', ''), '''', ''), '"', ''))
    ELSE slug
  END
WHERE slug IS NULL OR slug = '';

-- 2. FIX EMPTY SLUGS FOR UNITS
UPDATE units 
SET slug = 
  CASE 
    WHEN slug IS NULL OR slug = '' THEN 
      'unit-' || LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, ' ', '-'), '.', ''), ',', ''), '''', ''), '"', ''))
    ELSE slug
  END
WHERE slug IS NULL OR slug = '';

-- 3. ENSURE ALL PROPERTIES HAVE UNIQUE SLUGS
DO $$
DECLARE
    prop RECORD;
    counter INTEGER := 1;
BEGIN
    FOR prop IN 
        SELECT id, name, slug FROM properties 
        WHERE slug IN (
            SELECT slug FROM properties 
            GROUP BY slug 
            HAVING COUNT(*) > 1
        )
        ORDER BY created_at
    LOOP
        UPDATE properties 
        SET slug = prop.slug || '-' || counter
        WHERE id = prop.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- 4. ENSURE ALL UNITS HAVE UNIQUE SLUGS WITHIN PROPERTY
DO $$
DECLARE
    unit RECORD;
    counter INTEGER := 1;
BEGIN
    FOR unit IN 
        SELECT u.id, u.name, u.slug, u.property_id 
        FROM units u
        WHERE EXISTS (
            SELECT 1 FROM units u2 
            WHERE u2.property_id = u.property_id 
            AND u2.slug = u.slug 
            AND u2.id != u.id
        )
        ORDER BY u.created_at
    LOOP
        UPDATE units 
        SET slug = unit.slug || '-' || counter
        WHERE id = unit.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- 5. FIX CORRUPTED GREEK CHARACTERS (requires manual intervention)
-- This would need to be done via Supabase dashboard with proper UTF-8 handling
-- The following is a placeholder for the fix that needs to be applied:

-- Example of what would need to be done (run via dashboard):
-- UPDATE properties SET name = 'λακασ' WHERE name = '?????';
-- UPDATE properties SET city = 'λακασ' WHERE city = '?????';
-- UPDATE properties SET location = 'νινι' WHERE location = '????';

-- 6. VERIFY ALL FOREIGN KEY CONSTRAINTS
SELECT 
    'properties' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN slug IS NULL OR slug = '' THEN 1 END) as null_slugs,
    COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as null_names
FROM properties

UNION ALL

SELECT 
    'units' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN slug IS NULL OR slug = '' THEN 1 END) as null_slugs,
    COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as null_names
FROM units

UNION ALL

SELECT 
    'bookings' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN unit_id IS NULL THEN 1 END) as null_unit_ids,
    COUNT(CASE WHEN booking_number IS NULL OR booking_number = '' THEN 1 END) as null_booking_numbers
FROM bookings;

-- 7. CHECK FOR ORPHANED RECORDS
-- Units without properties
SELECT COUNT(*) as orphaned_units 
FROM units u 
LEFT JOIN properties p ON u.property_id = p.id 
WHERE p.id IS NULL;

-- Bookings without units
SELECT COUNT(*) as orphaned_bookings 
FROM bookings b 
LEFT JOIN units u ON b.unit_id = u.id 
WHERE u.id IS NULL;

-- Bookings without users (excluding guest bookings)
SELECT COUNT(*) as orphaned_user_bookings 
FROM bookings b 
LEFT JOIN users u ON b.user_id = u.id 
WHERE u.id IS NULL AND b.user_id IS NOT NULL;

-- 8. FIX ORPHANED RECORDS (CAREFUL - REVIEW BEFORE RUNNING)
-- Delete orphaned units
-- DELETE FROM units WHERE property_id NOT IN (SELECT id FROM properties);

-- Delete orphaned bookings
-- DELETE FROM bookings WHERE unit_id NOT IN (SELECT id FROM units);

-- Set user_id to NULL for bookings with non-existent users
-- UPDATE bookings SET user_id = NULL WHERE user_id NOT IN (SELECT id FROM users);

-- 9. ENSURE CONSISTENT TIMESTAMP FORMATS
UPDATE properties SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE units SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE bookings SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE payments SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE reviews SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE seasonal_pricing SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE coupons SET updated_at = created_at WHERE updated_at IS NULL;

-- 10. VERIFY DATA INTEGRITY AFTER FIXES
SELECT 
    'Data Integrity Check' as check_type,
    (SELECT COUNT(*) FROM properties WHERE slug IS NOT NULL AND slug != '') as properties_with_slugs,
    (SELECT COUNT(*) FROM units WHERE slug IS NOT NULL AND slug != '') as units_with_slugs,
    (SELECT COUNT(*) FROM bookings WHERE booking_number IS NOT NULL AND booking_number != '') as bookings_with_numbers,
    (SELECT COUNT(*) FROM units WHERE property_id IN (SELECT id FROM properties)) as units_with_valid_properties,
    (SELECT COUNT(*) FROM bookings WHERE unit_id IN (SELECT id FROM units)) as bookings_with_valid_units;
