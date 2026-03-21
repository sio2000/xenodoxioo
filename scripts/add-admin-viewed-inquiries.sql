-- Add columns for unread badge: when admin last viewed, when guest last messaged
-- Run in Supabase SQL Editor
ALTER TABLE public.inquiries
ADD COLUMN IF NOT EXISTS admin_last_viewed_at timestamptz;

ALTER TABLE public.inquiries
ADD COLUMN IF NOT EXISTS last_guest_message_at timestamptz;

-- Backfill last_guest_message_at from existing messages (run once)
UPDATE public.inquiries i
SET last_guest_message_at = sub.max_at
FROM (
  SELECT inquiry_id, MAX(created_at) AS max_at
  FROM public.inquiry_messages
  WHERE sender_type = 'guest'
  GROUP BY inquiry_id
) sub
WHERE i.id = sub.inquiry_id AND (i.last_guest_message_at IS NULL OR i.last_guest_message_at < sub.max_at);

-- Function to count unread inquiries (NEW unseen, or GUEST_REPLIED with new message since admin viewed)
CREATE OR REPLACE FUNCTION count_unread_inquiries()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT count(*)::integer FROM public.inquiries
  WHERE status = 'NEW' AND admin_last_viewed_at IS NULL
  OR (status = 'GUEST_REPLIED' AND (
    admin_last_viewed_at IS NULL
    OR last_guest_message_at IS NULL
    OR admin_last_viewed_at < last_guest_message_at
  ));
$$;
