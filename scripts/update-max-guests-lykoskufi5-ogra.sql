-- Update max_guests to 10 for Lykoskufi 5 and Ogra House (tiered pricing: 6 and 10 guests)
-- Run this in Supabase SQL Editor or via psql

UPDATE units
SET max_guests = 10
WHERE LOWER(name) IN ('lykoskufi 5', 'ogra house');
