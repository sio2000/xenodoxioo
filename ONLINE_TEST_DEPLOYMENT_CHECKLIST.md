# Online Test Mode Deployment Checklist

Πλήρης οδηγός για να βγει η ιστοσελίδα **www.leonidion-houses.com** online με **Stripe test mode** και **Resend emails**.

---

## Αρχιτεκτονική

| Στοιχείο | Πλατφόρμα | URL |
|----------|------------|-----|
| Frontend | Netlify | https://www.leonidion-houses.com |
| Backend API | Render | https://leonidion-houses-api.onrender.com |
| Database | Supabase | (managed) |
| Emails | Resend.com | (API) |

---

## Βήμα 1: Resend.com Setup

1. Δημιουργήστε λογαριασμό στο [resend.com](https://resend.com)
2. Πηγαίνετε στο **API Keys** και δημιουργήστε νέο key
3. Αντιγράψτε το key (ξεκινά με `re_`)
4. **Domain verification** (προαιρετικό για test):
   - Για δοκιμή: χρησιμοποιήστε `onboarding@resend.dev` ως FROM_EMAIL
   - Για production: επαληθεύστε το domain σας (π.χ. leonidion-houses.com)

---

## Βήμα 2: Stripe Test Mode (Webhook)

1. [Stripe Dashboard](https://dashboard.stripe.com) → βεβαιωθείτε ότι είστε σε **Test mode**
2. **Developers → Webhooks → Add endpoint**
3. **Endpoint URL:** `https://leonidion-houses-api.onrender.com/api/payments/webhook`
   - *(Αντικαταστήστε με το πραγματικό Render URL μετά το deploy)*
4. **Events:** `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.succeeded`, `charge.failed`, `charge.dispute.created`
5. Αντιγράψτε το **Signing secret** (`whsec_...`)

---

## Βήμα 3: Supabase Setup

### 3.1 Εκτέλεση migrations (αν δεν έχετε ήδη)

Στο **Supabase Dashboard → SQL Editor**, εκτελέστε με τη σειρά:

1. **supabase-schema.sql** — βασικά tables
2. **migration-payment-inquiry.sql** — payment_settings, inquiries
3. **supabase-guest-user-migration.sql** — guest user για guest checkout

### 3.2 Storage (για εικόνες)

- Δημιουργήστε bucket `uploads` αν δεν υπάρχει
- Ρυθμίστε **Public** access για το bucket
- RLS: επιτρέψτε read για όλους

### 3.3 Environment Variables

Από το Supabase project:
- **Settings → API** → Project URL, anon key, service_role key

---

## Βήμα 4: Deploy Backend στο Render

1. [Render Dashboard](https://dashboard.render.com) → **New → Web Service**
2. Σύνδεση με GitHub repo
3. **Root Directory:** `booking` (αν το repo έχει parent folder) ή αφήστε κενό
4. **Build Command:** `pnpm install && pnpm run build`
5. **Start Command:** `pnpm start`
6. **Instance Type:** Free (ή paid για καλύτερη απόδοση)

### 4.1 Environment Variables (Render)

| Key | Value | Secret |
|-----|-------|--------|
| `NODE_ENV` | `production` | No |
| `PORT` | `10000` | No |
| `SUPABASE_URL` | `https://xxx.supabase.co` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key | **Yes** |
| `STRIPE_SECRET_KEY` | `sk_test_xxx` | **Yes** |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_xxx` | No |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` | **Yes** |
| `RESEND_API_KEY` | `re_xxx` | **Yes** |
| `FRONTEND_URL` | `https://www.leonidion-houses.com` | No |
| `API_URL` | `https://leonidion-houses-api.onrender.com` | No |
| `JWT_SECRET` | random 32+ chars | **Yes** |
| `JWT_REFRESH_SECRET` | random 32+ chars | **Yes** |
| `ADMIN_EMAIL` | `admin@leonidion-houses.com` | No |
| `FROM_EMAIL` | `onboarding@resend.dev` (test) | No |
| `FROM_NAME` | `LEONIDIONHOUSES` | No |

7. **Deploy** και περιμένετε το URL (π.χ. `https://leonidion-houses-api.onrender.com`)

---

## Βήμα 5: Stripe Webhook (μετά το Render deploy)

1. Ενημερώστε το webhook URL στο Stripe με το πραγματικό Render URL
2. Αν δημιουργήσατε webhook πριν: **Webhooks → [endpoint] → Update details** → αλλάξτε το URL

---

## Βήμα 6: Netlify Environment Variables

**Site settings → Environment variables → Add variable**

| Key | Value | Scopes |
|-----|-------|--------|
| `VITE_API_URL` | `https://leonidion-houses-api.onrender.com` | All |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_xxx` | All |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | All |

Μετά τις αλλαγές: **Deploys → Trigger deploy → Clear cache and deploy site**

---

## Βήμα 7: Testing Checklist

### 7.1 Βασικές λειτουργίες

- [ ] Αρχική σελίδα φορτώνει
- [ ] Λίστα properties
- [ ] Λεπτομέρειες property
- [ ] Αναζήτηση διαθεσιμότητας

### 7.2 Booking Flow

- [ ] Δημιουργία κράτησης (quote → create booking)
- [ ] Checkout με Stripe (χρησιμοποιήστε test card `4242 4242 4242 4242`)
- [ ] Μετά την πληρωμή: redirect στο dashboard
- [ ] Booking status = CONFIRMED

### 7.3 Webhook

- [ ] Stripe Dashboard → Webhooks → Recent deliveries
- [ ] Τελευταίο event: `payment_intent.succeeded` με status 200

### 7.4 Emails (Resend)

- [ ] **Booking confirmation** — email στον guest μετά επιτυχή πληρωμή
- [ ] **Payment receipt** — email στον guest
- [ ] **New inquiry** — email στον admin όταν guest στέλνει inquiry
- [ ] **Inquiry reply** — email στον guest όταν admin απαντά

### 7.5 Admin Panel

- [ ] Admin login
- [ ] Λίστα bookings
- [ ] Λίστα inquiries
- [ ] Απάντηση σε inquiry (email στον guest)

---

## Σύνοψη Environment Variables

### Netlify (Frontend)

```
VITE_API_URL=https://leonidion-houses-api.onrender.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
VITE_SUPABASE_URL=https://xxx.supabase.co
```

### Render (Backend)

```
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
FRONTEND_URL=https://www.leonidion-houses.com
API_URL=https://leonidion-houses-api.onrender.com
JWT_SECRET=<random-32-chars>
JWT_REFRESH_SECRET=<random-32-chars>
ADMIN_EMAIL=admin@leonidion-houses.com
FROM_EMAIL=onboarding@resend.dev
FROM_NAME=LEONIDIONHOUSES
```

---

## Τι αλλάξαμε στον κώδικα

1. **Resend integration** — `server/services/email.service.ts` στέλνει μέσω Resend όταν `RESEND_API_KEY` ορίζεται
2. **Inquiry emails** — νέο inquiry → email στον admin, admin reply → email στον guest
3. **Payment emails** — μετά επιτυχή πληρωμή → booking confirmation + payment receipt
4. **Production URLs** — `getFrontendUrl()` επιστρέφει `https://www.leonidion-houses.com` σε production

---

## Αντιμετώπιση προβλημάτων

| Πρόβλημα | Λύση |
|----------|------|
| "Δεν φόρτωσαν τα δωμάτια" | Ελέγξτε `VITE_API_URL` στο Netlify, redeploy |
| Checkout δεν δείχνει Stripe form | `VITE_STRIPE_PUBLISHABLE_KEY` λείπει ή λάθος |
| Webhook 400/500 | `STRIPE_WEBHOOK_SECRET` λάθος ή λείπει |
| Emails δεν φτάνουν | Ελέγξτε Resend dashboard, FROM_EMAIL verified |
| Guest checkout fails | Εκτελέστε `supabase-guest-user-migration.sql` |
| CORS errors | Backend CORS περιλαμβάνει `https://www.leonidion-houses.com` |

---

*Test mode — όλα τα Stripe keys είναι `sk_test_` / `pk_test_`*
