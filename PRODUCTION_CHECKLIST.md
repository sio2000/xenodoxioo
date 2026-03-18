# Production Checklist — www.leonidion-houses.com

Πλήρης οδηγός μετάβασης από localhost σε production για την ιστοσελίδα ξενοδοχειακών κρατήσεων.

---

## Κρίσιμη Εντοπισμένη Κατάσταση

### ⚠️ Stripe Payments ΔΕΝ λειτουργούν στο τρέχον Netlify deploy

Το **Netlify function** (`netlify/functions/api.ts`) περιέχει μόνο:
- `/api/properties`, `/api/bookings`, `/api/admin/*`

**Λείπουν εντελώς:**
- `/api/payments/*` (create-intent, webhook, refund, history)
- `/api/auth/*` (login, register, JWT)
- `/api/inquiries/*`
- `/api/units/*` (πλήρης)

**Συνεπώς:** Οι πληρωμές μέσω Stripe **δεν θα λειτουργήσουν** στο production μέχρι να γίνει deploy το πλήρες Express backend.

---

## Αρχιτεκτονική Production

| Στοιχείο | Τρέχουσα κατάσταση | Απαιτούμενη κατάσταση |
|----------|-------------------|------------------------|
| Frontend | Netlify (leonidion-houses.com) | ✅ ΟΚ |
| API (properties, admin) | Netlify Functions | ⚠️ Μερική λειτουργία |
| API (payments, auth, inquiries) | **Ανύπαρκτο** | Deploy στο Render/Railway |
| Database | Supabase | ✅ ΟΚ |
| Εικόνες | Supabase Storage | ✅ ΟΚ |

**Λύση:** Deploy του πλήρους Express server στο **Render** (ή Railway/Fly.io) και ρύθμιση `VITE_API_URL` στο Netlify.

---

## Βήμα 1: Stripe — Από Test σε Live

### 1.1 Λήψη Live API Keys

1. Πηγαίνετε στο [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Ενεργοποιήστε το **Live mode** (toggle πάνω δεξιά)
3. Αντιγράψτε:
   - **Publishable key** (`pk_live_...`)
   - **Secret key** (`sk_live_...`)

### 1.2 Ρύθμιση στο Netlify (Environment Variables)

Στο Netlify: **Site settings → Environment variables**:

| Key | Value | Scopes |
|-----|-------|--------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_xxxxx` | All (Build + Deploy) |

> **Σημείωση:** Το `VITE_` prefix σημαίνει ότι η τιμή μπαίνει στο build. Μετά την αλλαγή, κάντε **Clear cache and deploy site**.

### 1.3 Ρύθμιση στο Render (Backend)

Όταν το backend τρέχει στο Render:

| Key | Value |
|-----|-------|
| `STRIPE_SECRET_KEY` | `sk_live_xxxxx` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_xxxxx` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxxx` (βλ. Βήμα 2) |

---

## Βήμα 2: Stripe Webhooks — Production

### 2.1 Δημιουργία Webhook Endpoint

1. [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. **Add endpoint**
3. **Endpoint URL:** `https://<BACKEND_URL>/api/payments/webhook`
   - Αν backend στο Render: `https://your-app.onrender.com/api/payments/webhook`
   - Αν backend στο ίδιο domain: `https://www.leonidion-houses.com/api/payments/webhook` (μόνο αν το backend τρέχει εκεί)
4. **Events to send:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `charge.failed`
   - `charge.dispute.created`

### 2.2 Λήψη Webhook Signing Secret

Μετά τη δημιουργία, ανοίξτε το endpoint και αντιγράψτε το **Signing secret** (`whsec_...`).

Ορίστε το στο Render:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 2.3 Σημαντικό

- **ΜΗΝ** αφήνετε `STRIPE_WEBHOOK_SECRET` κενό σε production — το backend δέχεται events χωρίς verification (ανασφάλεια)
- Το webhook URL πρέπει να είναι **HTTPS** και προσβάσιμο από το internet

---

## Βήμα 3: HTTPS και Domain

### 3.1 Netlify Domain Management

Από τα screenshots σας:
- **Primary domain:** `leonidion-houses.com`
- **www:** redirect σε primary
- **SSL/TLS:** "Waiting on DNS propagation"

**Ενέργειες:**
1. Περιμένετε το DNS propagation (συνήθως 24–48 ώρες)
2. Netlify → **Domain management** → **HTTPS** → Ενεργοποιήστε "Force HTTPS"
3. Επαληθεύστε ότι `https://www.leonidion-houses.com` ανοίγει σωστά

### 3.2 Production URLs

Χρησιμοποιήστε πάντα **HTTPS**:
- `https://www.leonidion-houses.com`
- `https://leonidion-houses.com`

---

## Βήμα 4: Environment Variables — Πλήρης Λίστα

### 4.1 Netlify (Frontend + Build)

| Variable | Value | Σημειώσεις |
|----------|-------|------------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_xxx` | Απαραίτητο για πληρωμές |
| `VITE_API_URL` | `https://your-backend.onrender.com` | **Αν** backend στο Render |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Για εικόνες από Storage |
| `NODE_ENV` | `production` | Συνήθως αυτόματο |

### 4.2 Render (Backend — Express)

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render default) |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |
| `STRIPE_SECRET_KEY` | `sk_live_xxx` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_xxx` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` |
| `API_URL` | `https://your-backend.onrender.com` |
| `FRONTEND_URL` | `https://www.leonidion-houses.com` |
| `JWT_SECRET` | Ισχυρό random string (min 32 chars) |
| `JWT_REFRESH_SECRET` | Διαφορετικό ισχυρό string |
| `ADMIN_EMAIL` | `admin@leonidion-houses.com` |
| `FROM_EMAIL` | `noreply@leonidion-houses.com` |

---

## Βήμα 5: Διορθώσεις Κώδικα (URLs)

### 5.1 Τρέχουσες αναφορές localhost

| Αρχείο | Γραμμή | Διορθωτική ενέργεια |
|--------|--------|----------------------|
| `server/routes/inquiries.ts` | 247 | Ορίστε `FRONTEND_URL` στο Render |
| `server/services/email.service.ts` | 79, 117, 160, 182, 224, 282 | Ορίστε `FRONTEND_URL` |
| `server/index.ts` | 50 | Μήνυμα console μόνο — ενημέρωση για production URL |
| `.env.final` | 14–15 | ΜΗΝ commit — χρήση μόνο local |

### 5.2 Απαιτούμενα env vars σε production

Το backend **πρέπει** να έχει:
- `FRONTEND_URL=https://www.leonidion-houses.com` — για links σε emails
- `API_URL` — ίδιο με το backend URL αν χρειάζεται για webhooks

---

## Βήμα 6: Deploy Backend στο Render

### 6.1 Δημιουργία Render Web Service

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Σύνδεση με GitHub repo
3. **Build command:** `pnpm install && pnpm run build`
4. **Start command:** `pnpm start` (ή `node dist/server/node-build.mjs`)
5. **Root directory:** `booking` (αν το repo έχει subfolder)

### 6.2 Environment Variables

Προσθέστε όλες τις μεταβλητές από το Βήμα 4.2.

### 6.3 Ενημέρωση Netlify

Μετά το deploy, πάρτε το URL του Render (π.χ. `https://leonidion-houses-api.onrender.com`) και ορίστε στο Netlify:

```
VITE_API_URL=https://leonidion-houses-api.onrender.com
```

Κάντε **Clear cache and deploy** στο Netlify.

---

## Βήμα 7: Database & Backup

### 7.1 Supabase

- Το Supabase είναι ήδη production-ready
- Βεβαιωθείτε ότι το project **δεν** είναι paused (Settings → General)
- Κάντε backup: Supabase Dashboard → Database → Backups

### 7.2 Migrations

Αν έχετε νέες αλλαγές schema:
```bash
# Local με production DATABASE_URL
DATABASE_URL="postgresql://..." pnpm exec prisma db push
```

---

## Βήμα 8: Ασφάλεια

### 8.1 Κρίσιμα

| Θέμα | Τρέχουσα κατάσταση | Ενέργεια |
|------|-------------------|----------|
| JWT fallbacks | `"your-secret-key"` όταν λείπει env | Ορίστε `JWT_SECRET`, `JWT_REFRESH_SECRET` |
| Webhook χωρίς secret | Αποδέχεται events χωρίς verification | Ορίστε `STRIPE_WEBHOOK_SECRET` |
| CORS | `cors()` — όλα origins | Στο Render, περιορίστε: `cors({ origin: ['https://www.leonidion-houses.com'] })` |

### 8.2 Εφαρμοσμένες διορθώσεις (αυτόματες)

- **Webhook:** Σε production, απαιτείται `STRIPE_WEBHOOK_SECRET` — αλλιώς το webhook απορρίπτεται
- **FRONTEND_URL:** Fallback σε `https://www.leonidion-houses.com` όταν `NODE_ENV=production` και λείπει το env

### 8.3 Προτεινόμενες βελτιώσεις

- Rate limiting σε `/api/auth/login`, `/api/bookings`
- Admin routes: απαιτείται JWT authentication
- Διαγραφή `.env.final` από git (περιέχει πραγματικά keys)

---

## Βήμα 9: Testing μετά το Deploy

### 9.1 Checklist λειτουργιών

- [ ] Αρχική σελίδα φορτώνει
- [ ] Λίστα properties
- [ ] Λεπτομέρειες property
- [ ] Αναζήτηση διαθεσιμότητας
- [ ] Δημιουργία κράτησης (quote → booking)
- [ ] Checkout με Stripe (δοκιμαστική πληρωμή με live mode)
- [ ] Webhook: έλεγχος Stripe Dashboard → Webhooks → Recent deliveries
- [ ] Admin login
- [ ] Φόρμα επικοινωνίας / inquiries

### 9.2 Stripe Test σε Live Mode

Στο Live mode μπορείτε να χρησιμοποιήσετε [test cards](https://stripe.com/docs/testing#cards):
- `4242 4242 4242 4242` — επιτυχία
- `4000 0000 0000 0002` — άρνηση

---

## Σειρά Εκτέλεσης (Summary)

1. **Πριν:** Ενεργοποίηση Live mode στο Stripe, λήψη keys
2. **Deploy backend** στο Render με όλα τα env vars
3. **Webhook** στο Stripe με το Render URL
4. **Netlify:** `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, redeploy
5. **HTTPS:** Περιμένετε SSL, ενεργοποιήστε Force HTTPS
6. **Testing:** Ολοκληρωμένη δοκιμή booking + πληρωμή
7. **Backup:** Supabase backup, έλεγχος RLS policies

---

## Τι να Ελέγξετε Αν Δεν Λειτουργεί

| Σύμπτωμα | Πιθανή αιτία |
|----------|--------------|
| "Δεν φόρτωσαν τα δωμάτια" | `VITE_API_URL` λάθος ή backend down |
| Checkout δεν δείχνει Stripe form | `VITE_STRIPE_PUBLISHABLE_KEY` λείπει ή λάθος |
| Πληρωμή ολοκληρώνεται αλλά booking μένει PENDING | Webhook δεν φτάνει ή `STRIPE_WEBHOOK_SECRET` λάθος |
| Links σε emails δείχνουν localhost | `FRONTEND_URL` δεν ορίζεται στο backend |
| CORS errors | Backend CORS δεν περιλαμβάνει το frontend domain |

---

*Τελευταία ενημέρωση: Μάρτιος 2025*
