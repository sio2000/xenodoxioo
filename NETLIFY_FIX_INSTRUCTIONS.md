# 🔧 Netlify Supabase Connection Fix

## Problem
Your Netlify site is showing old Prisma data instead of current Supabase data.

## Solution
You need to add environment variables to your Netlify site so it can connect to your Supabase database.

## 🚀 Quick Fix Steps

### 1. Go to Netlify Environment Settings
1. Visit: https://app.netlify.com/
2. Go to your site: `incredible-panda-05189b`
3. Click: **Site settings** → **Build & deploy** → **Environment**

### 2. Add These Environment Variables

Copy and paste these variables exactly as shown:

```
SUPABASE_URL=https://jkolkjvhlguaqcfgaaig.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprb2xranZobGd1YXFjZmdhYWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ1NTkxNywiZXhwIjoyMDg4MDMxOTE3fQ.5D-FyZYezZ1w4HOPQco3XMjBJUrL52LbZudwR8WH8kU
NEXT_PUBLIC_SUPABASE_URL=https://jkolkjvhlguaqcfgaaig.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprb2xranZobGd1YXFjZmdhYWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NTU5MTcsImV4cCI6MjA4ODAzMTkxN30.xCGZEuL4_AjrUY6Yi7BuPCzL1fYAWq9BB_BQ14GGIqQ
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-in-production-2024
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-2024
ADMIN_EMAIL=admin@leonidionhouses.com
CURRENCY=EUR
FRONTEND_URL=https://incredible-panda-05189b.netlify.app
```

### 3. Trigger New Deploy
After adding the variables:
1. Go to **Deploys** tab in Netlify
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete (2-3 minutes)

### 4. Verify Fix
Your site should now show:
- ✅ Current Supabase data (properties from your database)
- ✅ Real pricing and availability
- ✅ Live booking system

## 📱 What This Fixes

**Before:** Old hardcoded Prisma data
- Shows "Luxury Villa" for 250€/night
- Static, outdated information

**After:** Live Supabase data
- Shows your actual properties from the database
- Real pricing and availability
- Live booking system

## 🔍 If It Still Shows Old Data

1. **Check environment variables** - Make sure all variables are added correctly
2. **Clear browser cache** - Hard refresh (Ctrl+F5)
3. **Check deployment logs** - In Netlify → Deploys → Click latest deploy
4. **Wait 5 minutes** - Sometimes changes take a few minutes to propagate

## 🎯 Success Indicators

You'll know it's working when:
- Homepage shows your actual properties from Supabase
- Property pages load real data
- Booking system connects to your database
- Admin panel shows real bookings

---

**That's it!** Your Netlify site will now connect to Supabase and show your current data instead of the old Prisma data.
