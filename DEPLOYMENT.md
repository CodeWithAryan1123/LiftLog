# Deployment Guide (Vercel + Render)

## 1) Deploy backend to Render

Create a new **Web Service** in Render and point it to this repository.

Use these settings:

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Set backend environment variables in Render:

- `NODE_ENV=production`
- `MONGODB_URI=<your_mongodb_connection_string>`
- `JWT_SECRET=<a_strong_random_secret>`
- `FRONTEND_URLS=https://<your-vercel-domain>`

If you add a custom frontend domain, include both origins in `FRONTEND_URLS` separated by commas:

`FRONTEND_URLS=https://app.example.com,https://your-project.vercel.app`

After deploy, copy your Render backend URL, for example:

`https://gymlog-api.onrender.com`

## 2) Deploy frontend to Vercel

Import this repository into Vercel and deploy the root project (`d:/proj`).

Set frontend environment variable in Vercel:

- `VITE_API_URL=https://<your-render-service>.onrender.com`

Then redeploy frontend.

## 3) Verify

- Open frontend on Vercel.
- Sign up/login.
- Confirm requests hit Render (`/api/auth/*`, `/api/workouts/*`).
- Confirm browser cookies are present for auth and sessions persist.

## Notes

- `vercel.json` is included for SPA route fallback.
- `render.yaml` is included for Render blueprint-based setup.
- Production auth cookie is configured with `SameSite=None; Secure` so Vercel <-> Render credentials work.
