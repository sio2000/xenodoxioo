-- Supabase: Δημιουργία bucket "uploads" και admin user
-- Τρέξτε στο Supabase Dashboard → SQL Editor
-- (Εναλλακτικά: το script upload-images-to-supabase δημιουργεί το bucket αυτόματα)

-- 1. Δημιουργία bucket "uploads" (public) για εικόνες
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policy: Public read για uploads bucket (αν δεν υπάρχει)
DO $$
BEGIN
  CREATE POLICY "Public read for uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Admin user (admin@booking.com)
-- Χρησιμοποιήστε αν δεν υπάρχει ήδη admin. Ο κωδικός είναι bcrypt hash (όχι plaintext).
INSERT INTO public.users (id, email, first_name, last_name, password, role, status, is_email_verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@booking.com',
  'Admin',
  'User',
  '$2b$10$MdwtK8Sggo0nJ8N/MpQ.mu3v8bsZFmeAWjGaMsIo4STjOT6nKmNl2',
  'ADMIN',
  'ACTIVE',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  role = 'ADMIN',
  updated_at = NOW();
