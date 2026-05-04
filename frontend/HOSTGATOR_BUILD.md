# Building for Hostgator (dashkan.net)

dashkan.net is hosted on Hostgator. The build is uploaded to cPanel File Manager. **Critical:** You must build with **production** env vars, or mobile will get "error connection".

## Build steps

### 1. `.env.production`

The repo includes `frontend/.env.production` with **Railway** URLs. To override, edit that file (or set `VITE_*` in CI before `npm run build`):

```
VITE_API_BASE_URL=https://idashkan-production.up.railway.app/api
VITE_BACKEND_URL=https://idashkan-production.up.railway.app
```

- Use **HTTPS** – mobile blocks mixed content.
- Do **not** set `VITE_USE_PROXY` for Hostgator – that is for Vercel same-origin proxy only.
- Do **not** use `localhost` in production builds.

### 2. Build

```bash
cd frontend
npm run build
```

### 3. Upload

Upload the entire **`build`** folder to your Hostgator public_html (or the folder that serves dashkan.net).

## Why mobile fails if env vars are wrong

If you build with `localhost` in `.env`:

- **Laptop:** If your backend runs locally, the browser can call `localhost:5000`.
- **Mobile:** There is no `localhost` on the phone, so API calls fail with "error connection".

## After deploying

If users still see "error connection" on mobile:

1. Clear site data on the mobile browser (or use incognito).
2. Confirm the backend allows `https://dashkan.net` in CORS (see `server.js`).
3. Check that your backend uses HTTPS and a valid SSL certificate.
