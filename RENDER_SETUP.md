# Ρύθμιση Render για Docker Deployment

Για να λειτουργούν τα Προτεινόμενα δωμάτια και το admin panel, προσθέστε στο **Render Dashboard**:

## 1. Environment Variables

Πηγαίνετε στο service **xenodoxioo** → **Environment** και προσθέστε:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `file:/app/data/dev.db` |
| `STRIPE_SECRET_KEY` | (προαιρετικό) το Stripe key σας |

## 2. Persistent Disk

**ΥΠΟΧΡΕΩΤΙΚΟ** – το SQLite χρειάζεται persistent storage:

1. **xenodoxioo** → **Disk** (αριστερό menu)
2. **Add Disk**
3. **Mount Path**: `/app/data`
4. **Size**: 1 GB (αρκεί)
5. **Save**

## 3. Redeploy

Μετά τις αλλαγές, κάντε **Manual Deploy** → **Deploy latest commit**.

---

## Τι κάνει κάθε ρύθμιση

- **DATABASE_URL**: Η διεύθυνση της SQLite βάσης. Με το Disk στο `/app/data`, το αρχείο θα είναι `/app/data/dev.db`.
- **Disk**: Χωρίς Persistent Disk, τα δεδομένα χάνονται σε κάθε deploy/restart.

Μετά το πρώτο deploy, το seed τρέχει αυτόματα και δημιουργεί:
- Admin: admin@booking.com / admin123
- 1 δοκιμαστικό property (Luxury Villa)
