-- Custom checkout offers: admin creates link with custom dates + price for inquiry guests
-- Booking is created ONLY after guest pays via the link
-- Run in Supabase SQL Editor

-- Ensure guest user exists (required for payments.user_id FK on offer bookings)
INSERT INTO public.users (id, email, first_name, last_name, password, role, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'guest-system@leonidion-houses.com', 'Guest', 'User', 'no-login-placeholder', 'CUSTOMER', 'INACTIVE')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.custom_checkout_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  check_in_date timestamptz NOT NULL,
  check_out_date timestamptz NOT NULL,
  guests integer NOT NULL DEFAULT 2,
  custom_total_eur numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  CONSTRAINT custom_checkout_offers_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pending_offer_checkouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  offer_token text NOT NULL REFERENCES public.custom_checkout_offers(token) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pending_offer_checkouts_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_offers_token ON public.custom_checkout_offers(token);
CREATE INDEX IF NOT EXISTS idx_pending_offer_stripe ON public.pending_offer_checkouts(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_custom_offers_inquiry ON public.custom_checkout_offers(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_custom_offers_used ON public.custom_checkout_offers(used_at) WHERE used_at IS NULL;

ALTER TABLE public.custom_checkout_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_offer_checkouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role - custom_offers" ON public.custom_checkout_offers;
CREATE POLICY "Allow all for service role - custom_offers" ON public.custom_checkout_offers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service role - pending_offer" ON public.pending_offer_checkouts;
CREATE POLICY "Allow all for service role - pending_offer" ON public.pending_offer_checkouts FOR ALL USING (true) WITH CHECK (true);
