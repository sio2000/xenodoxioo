-- ============================================================
--  ΑΛΛΑΓΗ ΚΩΔΙΚΟΥ ADMIN  (production / Supabase)
-- ============================================================
--  Πού: Supabase Dashboard -> SQL Editor -> New query -> Paste -> Run
--
--  Νέα στοιχεία σύνδεσης admin:
--      email:    admin@booking.com
--      password: Laralary6817
--
--  Σημείωση ασφαλείας: ο κωδικός ΔΕΝ αποθηκεύεται ποτέ σε plaintext.
--  Παρακάτω είναι το bcrypt hash του "Laralary6817" (one-way, δεν
--  μπορεί να αντιστραφεί). Το ίδιο το hash μπορεί να μπει με ασφάλεια
--  στο git/Supabase.
-- ============================================================

UPDATE public.users
SET
  password   = '$2b$10$MdwtK8Sggo0nJ8N/MpQ.mu3v8bsZFmeAWjGaMsIo4STjOT6nKmNl2',
  role       = 'ADMIN',
  status     = 'ACTIVE',
  updated_at = NOW()
WHERE lower(email) = 'admin@booking.com';

-- Έλεγχος (πρέπει να επιστρέψει 1 γραμμή με role = ADMIN):
SELECT id, email, role, status FROM public.users
WHERE lower(email) = 'admin@booking.com';
