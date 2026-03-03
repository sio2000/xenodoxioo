# Database connection troubleshooting

If you see:

```text
Can't reach database server at db.xxxxx.supabase.co:5432
```

or **P1001** from Prisma, the app cannot connect to your Supabase database.

## 1. Supabase project is paused (very common)

Free-tier Supabase projects **pause after 7 days of inactivity**.

**Fix:**

1. Open [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. If you see **“Project is paused”**, click **Restore project** (or go to **Settings → General → Restore project**).
4. Wait 1–2 minutes, then run `npm run dev` again.

## 2. Check your connection string

1. In Supabase: **Settings → Database**.
2. Copy the **Connection string** (URI format).
3. Replace `[YOUR-PASSWORD]` with your database password.
4. In your project root, set in `.env`:
   ```env
   DATABASE_URL="postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"
   ```
   Or use the **Direct connection** (port 5432) if you prefer.

Ensure:

- No extra spaces in the URL.
- Password has no special characters that break the URI; if it does, URL-encode them.

## 3. Network / firewall

- Port **5432** (direct) or **6543** (pooler) must be allowed outbound.
- Try from another network (e.g. mobile hotspot) to rule out corporate firewall.

## 4. Verify from the project

With a valid `DATABASE_URL` in `.env`:

```bash
npx tsx scripts/phase7-pricing-verification.ts
```

If the script connects and runs, the database is reachable from your machine.

---

**Summary:** In most cases the issue is a **paused Supabase project**. Restore it from the dashboard, then retry.
