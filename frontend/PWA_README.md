# FwdNourish! PWA

The frontend is now configured as a Progressive Web App (PWA).

## What was added

- `public/manifest.webmanifest` — installable app metadata
- `public/sw.js` — service worker with app-shell/offline caching
- `public/icons/` — 192px, 512px and maskable PWA icons
- `src/pwa.ts` — service worker registration
- PWA metadata in `index.html`

## Run

```bash
npm install
npm run build
npm run preview
```

Open the preview/deployed site over HTTPS (or localhost during development). Chrome/Edge can then offer **Install FwdNourish**.

### Important

The service worker deliberately does **not** cache API/authenticated requests. Your existing backend/API behavior remains network-based, so login, inventory, donations, forecasting, etc. are not served from stale cached API responses.

For production, deploy the built frontend over HTTPS and make sure the web server falls back to `index.html` for React Router routes.
