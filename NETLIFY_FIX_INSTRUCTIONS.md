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

Add variables in Netlify using values from your **Supabase** and **JWT** setup (never paste real `service_role` or database passwords into the Git repo):

```
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=(from Supabase → Settings → API — server only)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=(anon key from same page)
NODE_ENV=production
JWT_SECRET=(strong random secret)
JWT_REFRESH_SECRET=(different strong secret)
ADMIN_EMAIL=your-admin@example.com
CURRENCY=EUR
FRONTEND_URL=https://your-production-site.example
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
