# Mobile "Network Error" Fix – Proxy Setup

If the app works on **laptop** but shows **"Network error"** on **mobile** (iOS/Android), use the **proxy setup** below. This routes API requests through your frontend domain, avoiding CORS and mixed content issues on mobile.

## Step 1: Edit `vercel.json`

Replace `YOUR-BACKEND.onrender.com` with your actual backend host in **both** rewrites in `vercel.json`.

**Production:** `vercel.json` rewrites point to **Railway** (`idashkan-production.up.railway.app`). To change the backend, edit `destination` in `frontend/vercel.json` and redeploy.

## Step 2: Vercel Environment Variables

In Vercel → your project → **Settings → Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `VITE_USE_PROXY` | `true` |
| `VITE_BACKEND_URL` | *(leave empty or delete)* |

When using the proxy, leave `VITE_BACKEND_URL` empty so images resolve via same-origin `/uploads` → Railway (see `vercel.json`).

## Step 3: Redeploy

Trigger a new deployment (Deployments → ⋮ → Redeploy).

## How it works

- **Before:** Frontend calls `https://backend.com/api/stores` → cross-origin, can fail on mobile
- **After:** Frontend calls `https://dashkan.net/api/stores` → same-origin, Vercel proxies to backend

No CORS, no mixed content, and mobile browsers treat it as same-origin.
