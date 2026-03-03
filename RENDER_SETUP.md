# Ρύθμιση Render για Docker Deployment

Για να λειτουργούν τα Προτεινόμενα δωμάτια και το admin panel, προσθέστε στο **Render Dashboard**:

## 1. Environment Variables

Πηγαίνετε στο service **xenodoxioo** → **Environment** και προσθέστε:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | (Neon pooled URL) |
| `DIRECT_URL` | (Neon unpooled URL) |
| `STRIPE_SECRET_KEY` | (προαιρετικό) το Stripe key σας |

## 2. Redeploy

Μετά τις αλλαγές, κάντε **Manual Deploy** → **Deploy latest commit**.

---

## Τι κάνει κάθε ρύθμιση

- **DATABASE_URL**: Το **pooled** Neon connection (καλό για runtime connections).
- **DIRECT_URL**: Το **unpooled** Neon connection (απαραίτητο για Prisma `db push/seed`).

Μετά το πρώτο deploy, το seed τρέχει αυτόματα και δημιουργεί:
- Admin: admin@booking.com / admin123
- 1 δοκιμαστικό property (Luxury Villa)
