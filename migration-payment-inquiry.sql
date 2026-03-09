-- ===========================================
-- MIGRATION: Payment Settings + Inquiry System
-- Run in Supabase SQL Editor
-- ===========================================

-- 1. Payment Settings Table
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deposit_percentage numeric NOT NULL DEFAULT 25,
  balance_charge_days_before integer NOT NULL DEFAULT 21,
  full_payment_threshold_days integer NOT NULL DEFAULT 21,
  refund_deposit_on_cancel boolean NOT NULL DEFAULT false,
  currency text NOT NULL DEFAULT 'EUR',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payment_settings_pkey PRIMARY KEY (id)
);

INSERT INTO public.payment_settings (deposit_percentage, balance_charge_days_before, full_payment_threshold_days, refund_deposit_on_cancel, currency)
SELECT 25, 21, 21, false, 'EUR'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_settings WHERE is_active = true);

-- 2. Add missing columns to bookings if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'stripe_payment_method_id') THEN
    ALTER TABLE public.bookings ADD COLUMN stripe_payment_method_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'stripe_setup_intent_id') THEN
    ALTER TABLE public.bookings ADD COLUMN stripe_setup_intent_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'payment_type') THEN
    ALTER TABLE public.bookings ADD COLUMN payment_type text NOT NULL DEFAULT 'DEPOSIT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'scheduled_charge_date') THEN
    ALTER TABLE public.bookings ADD COLUMN scheduled_charge_date timestamp with time zone;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'remaining_amount') THEN
    ALTER TABLE public.bookings ADD COLUMN remaining_amount numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 3. Inquiries Table
CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  checkin_date timestamp with time zone NOT NULL,
  checkout_date timestamp with time zone NOT NULL,
  guests integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'NEW',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT inquiries_pkey PRIMARY KEY (id),
  CONSTRAINT inquiries_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);

-- 4. Inquiry Messages Table
CREATE TABLE IF NOT EXISTS public.inquiry_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('guest', 'host')),
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT inquiry_messages_pkey PRIMARY KEY (id),
  CONSTRAINT inquiry_messages_inquiry_id_fkey FOREIGN KEY (inquiry_id) REFERENCES public.inquiries(id) ON DELETE CASCADE
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inquiries_property_id ON public.inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiry_messages_inquiry_id ON public.inquiry_messages(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_charge ON public.bookings(scheduled_charge_date) WHERE payment_status = 'DEPOSIT_PAID' AND status != 'CANCELLED';
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON public.payments(stripe_payment_intent_id);

-- 6. RLS Policies for new tables
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role - payment_settings" ON public.payment_settings;
CREATE POLICY "Allow all for service role - payment_settings" ON public.payment_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service role - inquiries" ON public.inquiries;
CREATE POLICY "Allow all for service role - inquiries" ON public.inquiries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service role - inquiry_messages" ON public.inquiry_messages;
CREATE POLICY "Allow all for service role - inquiry_messages" ON public.inquiry_messages FOR ALL USING (true) WITH CHECK (true);
