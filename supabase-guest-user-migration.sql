-- Guest user for guest checkout (payments without registered account)
-- Run in Supabase SQL Editor if guest checkout is used
-- The payment.service uses GUEST_USER_ID = '00000000-0000-0000-0000-000000000001'

INSERT INTO public.users (
  id,
  email,
  first_name,
  last_name,
  password,
  role,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'guest-system@leonidion-houses.com',
  'Guest',
  'User',
  'no-login-placeholder',
  'CUSTOMER',
  'INACTIVE'
)
ON CONFLICT (id) DO NOTHING;
