# 🚨 ΑΜΕΣΗ ΔΙΟΘΩΡΣΗ NETLIFY

## Πρόβλημα
Λείπει το `VITE_API_URL` από τα environment variables του Netlify.

## ΛΥΣΗ - 2 ΛΕΠΤΑ

### 1. Πηγαίνετε στο Netlify
https://app.netlify.com/sites/incredible-panda-05f89b/settings/env

### 2. Προσθέστε ΑΥΤΟ το variable:
```
VITE_API_URL = https://incredible-panda-05f89b.netlify.app/api
```

### 3. Κάντε Redeploy
1. Πηγαίνετε στο tab **Deploys**
2. Πατήστε **Trigger deploy** → **Deploy site**

### 4. Περιμένετε 2-3 λεπτά

**Αυτό ήταν!** Θα πρέπει να λειτουργεί μετά το redeploy!

---

## Υπόλοιπα variables (χωρίς πραγματικά κλειδιά στο repo)

Αντιγράψτε τιμές από **Supabase Dashboard → Settings → API** (URL, anon key, **service_role** μόνο στο Netlify — ποτέ σε commit).

```
SUPABASE_URL = https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY = (service role — μόνο Netlify / .env τοπικά)
NEXT_PUBLIC_SUPABASE_URL = https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = (anon public key από το dashboard)
VITE_API_URL = https://YOUR_SITE.netlify.app/api
NODE_ENV = production
FRONTEND_URL = https://το-κανονικό-domain-σας
```

**Το πιο σημαντικό για το συγκεκριμένο guide είναι το VITE_API_URL** (αν λείπει, χτυπάει λάθος API).
