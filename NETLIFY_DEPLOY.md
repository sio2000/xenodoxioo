# Netlify Deployment Guide

Για να λειτουργούν τα δωμάτια, οι εικόνες και το admin panel στο Netlify, ακολουθήστε τα παρακάτω.

## Σημαντικό

Το Netlify hostάρει μόνο το frontend (SPA). Το backend (Express + Prisma + SQLite) **δεν** τρέχει σωστά στο Netlify Functions λόγω SQLite (δεν υπάρχει persistent storage). Για να λειτουργούν όλα 100%, **πρέπει** να κάνετε deploy το backend στο Render και να ορίσετε `VITE_API_URL`.

## Βήμα 1: Deploy του Backend στο Render (Δωρεάν)

1. Δημιουργήστε λογαριασμό στο [Render.com](https://render.com)
2. **New** → **Web Service**
3. Συνδέστε το GitHub repo σας
4. Ρυθμίσεις:
   - **Name**: `leonidionhouses-api`
   - **Runtime**: Node
   - **Build Command**: `pnpm install && pnpm prisma generate && pnpm prisma db push && pnpm db:seed && pnpm run build:server`
   - **Start Command**: `pnpm start` (ή `node dist/server/node-build.mjs`)
   - **Plan**: Free
5. **Environment**:
   - `DATABASE_URL` = `file:./data/dev.db` (Render Free έχει persistent disk - επιλέξτε Add Disk)
   - Ή δημιουργήστε PostgreSQL DB στο Render και χρησιμοποιήστε: `postgresql://...`
   - Όλες οι άλλες μεταβλητές από το `.env.example`
6. **Create Web Service**
7. Αφού γίνει deploy, κρατήστε το URL (π.χ. `https://leonidionhouses-api.onrender.com`)

> **Σημείωση**: Αν χρησιμοποιείτε SQLite, χρειάζεται Persistent Disk στο Render (σχετικά με το plan).

## Βήμα 2: Netlify Environment Variables

1. Netlify Dashboard → Site Settings → Environment Variables
2. Προσθέστε:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://leonidionhouses-api.onrender.com` (το URL του Render)
   - **Scopes**: All (Production, Deploy Previews, Branch deploys)
3. **Save**
4. Κάντε **Trigger deploy** → **Deploy site** για νέο build με τις νέες μεταβλητές

## Βήμα 3: CORS (αν χρειάζεται)

Στο backend (Render), βεβαιωθείτε ότι το `cors()` middleware δέχεται το Netlify domain σας. Το `app.use(cors())` χωρίς επιλογές δέχεται όλα τα origins σε development. Για production, μπορείτε να ορίσετε:

```js
app.use(cors({ origin: ['https://your-site.netlify.app', 'http://localhost:8080'] }));
```

## Βήμα 4: Εικόνες

Οι εικόνες αποθηκεύονται στο `/uploads` του backend. Όταν το backend τρέχει στο Render, οι εικόνες φορτώνονται αυτόματα από το API URL (`VITE_API_URL/uploads/...`). Βεβαιωθείτε ότι το `uploads/` folder είναι στο repo ή ότι οι φωτογραφίες ανεβαίνουν μέσω του admin panel μετά το deploy.

## Βήμα 5: Admin & Δωμάτια

Μετά το deploy:
- **Προτεινόμενα δωμάτια**: Φαίνονται αν το seed τρέξει (περιλαμβάνεται στο Build Command)
- **Admin login**: admin@booking.com / admin123 (δημιουργείται από το seed)

Αν το Render "κοιμάται" (free tier), η πρώτη αίτηση μπορεί να καθυστερήσει ~30-60 sec.

## Αποτέλεσμα

- **Frontend (Netlify)**: SPA με όλες τις σελίδες (/admin, /about, /contact, κλπ)
- **Backend (Render)**: API, database, uploads
- Οι κλήσεις `fetch('/api/...')` θα γίνονται στο `VITE_API_URL` λόγω του `VITE_API_URL`
