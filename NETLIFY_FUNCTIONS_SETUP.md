# Netlify Functions — Payment Setup

Όπως στο άλλο project σου, δημιουργήθηκαν ξεχωριστές Netlify Functions για τις πληρωμές.

## Νέες Functions

| Function | Path | Λειτουργία |
|----------|------|------------|
| `stripe-webhook` | `/api/payments/webhook` | Λαμβάνει Stripe events, ενημερώνει DB, στέλνει emails μέσω Resend |
| `create-guest-payment-intent` | `/api/payments/create-guest-intent` | Δημιουργεί Stripe PaymentIntent για guest checkout |
| `confirm-payment-status` | `/api/payments/confirm-status/:id` | Fallback όταν το webhook αργεί — ενημερώνει booking |

## Stripe Webhook URL

Άλλαξε το webhook URL στο **Stripe Dashboard** σε:

```
https://www.leonidion-houses.com/api/payments/webhook
```

(Όχι πλέον το Render URL.)

## ⚠️ Σημαντικό: VITE_API_URL

**Αφαιρέστε** το `VITE_API_URL` από τα Netlify env vars. Όταν είναι ορισμένο (π.χ. Render URL), το frontend στέλνει αιτήματα εκεί και εμφανίζεται CORS error. Το API τρέχει πλέον στο Netlify (same origin), οπότε το `VITE_API_URL` δεν χρειάζεται.

Μετά την αλλαγή: **Trigger deploy → Clear cache and deploy site**.

---

## Environment Variables στο Netlify

Πρόσθεσε/έλεγξε στο **Netlify → Site settings → Environment variables**:

| Variable | Value |
|----------|-------|
| ~~`VITE_API_URL`~~ | **ΜΗΝ ορίζετε** — αφαιρέστε αν υπάρχει (CORS fix) |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `RESEND_API_KEY` | `re_...` |
| `FRONTEND_URL` | `https://www.leonidion-houses.com` |
| `FROM_EMAIL` | `onboarding@resend.dev` |
| `FROM_NAME` | `LEONIDIONHOUSES` |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |

## Deploy

Μετά τις αλλαγές:

1. Commit & push στο GitHub
2. Netlify θα κάνει αυτόματο deploy
3. Ή: **Deploys → Trigger deploy → Clear cache and deploy site**

## Δοκιμή

1. Κάνε μια δοκιμαστική κράτηση στο www.leonidion-houses.com
2. Χρησιμοποίησε test card: `4242 4242 4242 4242`
3. Έλεγξε: Stripe Dashboard → Webhooks → Recent deliveries (status 200)
4. Έλεγξε: Resend → Emails (booking confirmation + payment receipt)
