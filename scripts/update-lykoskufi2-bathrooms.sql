-- Lykoskufi 2: two bathrooms (ground floor shower + upper floor bathtub).
-- Run in Supabase SQL Editor (public.units).

UPDATE public.units
SET bathrooms = 2,
    updated_at = now()
WHERE slug = 'lykoskufi-2';

-- Verify: expect bathrooms = 2
-- SELECT id, name, slug, bathrooms FROM public.units WHERE slug = 'lykoskufi-2';
