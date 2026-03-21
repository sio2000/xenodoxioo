# Τοπική δοκιμή Custom Offer + Stripe Webhook

Όταν τρέχεις το project **στην τοπική σου μηχανή (localhost)**, το Stripe **δεν μπορεί** να στείλει webhook απευθείας στο `localhost:8080` — δεν είναι προσβάσιμο από το internet.

## Λύση: Stripe CLI

1. **Εγκατάστησε το Stripe CLI** (αν δεν το έχεις):
   - Windows: `scoop install stripe` ή κατέβασε από https://stripe.com/docs/stripe-cli
   - Mac: `brew install stripe/stripe-cli/stripe`

2. **Συνδέσου με τον Stripe λογαριασμό**:
   ```bash
   stripe login
   ```

3. **Άνοιξε ΔΥΟ terminals:**
   - **Terminal 1:** `pnpm dev` (server)
   - **Terminal 2:** `stripe listen --forward-to localhost:8080/api/payments/webhook`

4. Το Stripe CLI θα εμφανίσει ένα **provisional webhook secret** (π.χ. `whsec_xxxxx`).

5. **Πρόσθεσε το στο `.env`**:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```
   (αντικατέστησε με το secret που έδωσε το `stripe listen`)

6. **Ξανακάνε restart το server** (Terminal 1: Ctrl+C, μετά `pnpm dev`).

Μετά από αυτό, όταν κάνει πληρωμή κάποιος από το custom URL:
- Το webhook θα φτάνει μέσω του Stripe CLI στο localhost
- Θα δημιουργηθεί η κράτηση
- Θα εμφανιστεί στο Admin → Κρατήσεις
- Θα κλειδώσουν οι ημερομηνίες στο ημερολόγιο
- Θα σταλούν τα emails (αν έχει `RESEND_API_KEY` στο .env)

---

## Αν δεν θες να χρησιμοποιήσεις Stripe CLI

Μπορείς να κάνεις **deploy** (π.χ. στο Netlify) και να δοκιμάσεις εκεί. Το production URL είναι προσβάσιμο από το Stripe, οπότε το webhook θα λειτουργεί κανονικά μετά τη ρύθμιση στο Stripe Dashboard.
