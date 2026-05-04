# Vercel Deployment – Notifications Checklist

Your frontend is at **https://dashkan.net** (or https://idiscount.vercel.app). For notifications when the app is closed, all items below must be set.

## 1. Vercel environment variables

In the Vercel project: **Settings → Environment Variables**, add:

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_API_BASE_URL` | `https://idashkan-production.up.railway.app/api` | **Recommended** |
| `VITE_BACKEND_URL` | `https://idashkan-production.up.railway.app` | **Recommended** |

Alternatively rely on `src/config/backendUrl.js` defaults + `vercel.json` rewrites; set `VITE_USE_PROXY=true` for same-origin `/api` only.

- If env vars are missing, production builds still default to **Railway** in `src/config/backendUrl.js`.
- After changing env vars, trigger a new deployment (Redeploy).
- **dashkan.net on Hostgator:** Uses manual build + upload. See [HOSTGATOR_BUILD.md](HOSTGATOR_BUILD.md) – you must use `.env.production` with production URLs when building.

## 2. Backend deployment

The Express backend must be deployed on a platform that supports Node servers:

- **Render** (render.com), **Railway**, **Heroku**, etc.
- Vercel is for static sites and serverless; it does not run your Express server.

## 3. Backend configuration

On the backend server:

**`.env` (or platform env vars):**

```
VAPID_PUBLIC_KEY=<from: npm run generate-vapid>
VAPID_PRIVATE_KEY=<from: npm run generate-vapid>
```

**CORS** allows `https://dashkan.net`, `https://www.dashkan.net`, and `*.vercel.app` (see server.js).

## 4. Quick test

1. Open https://dashkan.net/ (or your deployed URL)
2. Tap **Enable** → **Allow** in the browser prompt
3. In Admin → Notifications, send a test notification
4. If you see “(X to notification center)” with X > 0, push is being sent
5. Close the tab or app, then send another notification – it should appear on the lock screen or notification shade

## 5. dashkan.net not working (but idiscount.vercel.app works)

If the app works on **idiscount.vercel.app** but fails on **dashkan.net**:

1. **Same Vercel project**: In Vercel → Your Project → **Settings → Domains**, confirm both `idiscount.vercel.app` and `dashkan.net` are on the **same project**. If dashkan.net is on a different project, that project has its own build and env vars.
2. **Env vars for the dashkan.net project**: If dashkan.net is on a different project, add `VITE_API_BASE_URL` and `VITE_BACKEND_URL` (same values as the working project). Then **Redeploy**.
3. **Redeploy**: After adding the domain or env vars, trigger a new deployment (Deployments → ⋮ → Redeploy).
4. **Backend CORS**: Your backend must allow `https://dashkan.net` (already in server.js). Redeploy the backend if you recently added the custom domain.

## 6. Mobile "Network Error" – Use Proxy (Recommended)

If the app works on laptop but shows "Network error" on mobile, use the **proxy setup** – see [MOBILE_FIX.md](MOBILE_FIX.md). This fixes CORS and mixed content on mobile.

Other causes if not using proxy:

1. **HTTPS only**: `VITE_API_BASE_URL` and `VITE_BACKEND_URL` must use **HTTPS**. Mixed content is blocked on mobile.
2. **Env vars**: In Vercel → Settings → Environment Variables, set both for Production. Redeploy after changing.
3. **Backend reachable**: Test the API URL directly on mobile (e.g. open `https://YOUR-BACKEND/api/stores` in the mobile browser).
4. **Slow networks**: The app retries failed requests once after 1.5s and uses a 30s timeout to help with slow mobile connections.

## 7. If it still fails

- Confirm backend URL in Vercel env vars and that the backend is reachable.
- Open DevTools → Application → Service Workers: check that the service worker is active.
- Open DevTools → Network: when you tap Enable, check that requests to `/notifications/vapid-public` and `/users/push-subscribe` succeed.
- Confirm VAPID keys are set and correct on the backend.
