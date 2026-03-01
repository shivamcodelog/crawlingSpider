# MapScraper Pro — Vercel Deployment Guide

## Architecture Overview

| Service  | Platform          | Directory         |
|----------|-------------------|-------------------|
| Frontend | Vercel (static)   | `frontend/`       |
| Backend  | Vercel (serverless) | `backend/`      |
| Scraper  | Railway / Fly.io  | `scraper/`        |

> The scraper is a long-running Python + Playwright service and **cannot** run on Vercel. Deploy it separately on Railway or Fly.io.

---

## 1. Deploy the Scraper (Railway)

1. Create a new Railway project from the `scraper/` directory.
2. Railway auto-detects `nixpacks.toml` / `Procfile`.
3. Set these environment variables in Railway:

| Variable          | Value                                      |
|-------------------|--------------------------------------------|
| `BACKEND_URL`     | Your backend Vercel URL                    |
| `INTERNAL_SECRET` | Same value as backend's `INTERNAL_SECRET`  |

4. After deploy, copy the Railway public URL — you need it for the backend.

---

## 2. Deploy the Backend (Vercel)

1. Push the repo to GitHub (or import the `backend/` folder directly).
2. In Vercel → **New Project** → select repository → **Root Directory**: `mapscraper-pro/backend`.
3. Framework: **Other** (Vercel auto-detects the `vercel.json`).
4. Add all environment variables from `backend/.env.example`:

| Variable                | Notes                                                      |
|-------------------------|------------------------------------------------------------|
| `MONGO_URI`             | MongoDB Atlas connection string                            |
| `JWT_SECRET`            | Long random string                                         |
| `GOOGLE_CLIENT_ID`      | From Google Cloud Console                                  |
| `GOOGLE_CLIENT_SECRET`  | From Google Cloud Console                                  |
| `GOOGLE_CALLBACK_URL`   | `https://<your-backend>.vercel.app/auth/google/callback`   |
| `FRONTEND_URL`          | `https://<your-frontend>.vercel.app`                       |
| `SCRAPER_URL`           | Your Railway scraper URL                                   |
| `INTERNAL_SECRET`       | Same value you set in the scraper                          |
| `RAZORPAY_KEY_ID`       | Razorpay dashboard                                         |
| `RAZORPAY_KEY_SECRET`   | Razorpay dashboard                                         |
| `STRIPE_SECRET_KEY`     | Stripe dashboard                                           |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Webhooks                                |

5. Add Stripe webhook endpoint in Stripe dashboard:  
   `https://<your-backend>.vercel.app/api/payments/stripe/webhook`

6. Add Google OAuth callback in Google Cloud Console:  
   `https://<your-backend>.vercel.app/auth/google/callback`

---

## 3. Deploy the Frontend (Vercel)

1. In Vercel → **New Project** → select repository → **Root Directory**: `mapscraper-pro/frontend`.
2. Framework: **Vite** (auto-detected).
3. Build command: `npm run build` | Output directory: `dist`.
4. Add environment variables from `frontend/.env.example`:

| Variable              | Value                                    |
|-----------------------|------------------------------------------|
| `VITE_API_URL`        | `https://<your-backend>.vercel.app`      |
| `VITE_RAZORPAY_KEY_ID`| Your Razorpay public key                 |

5. After deploy, copy the frontend URL and update `FRONTEND_URL` in the backend project.

---

## 4. Post-Deployment Checklist

- [ ] Test Google OAuth login end-to-end
- [ ] Create a test scrape job and verify it dispatches to the scraper
- [ ] Test Razorpay payment (use test keys first)
- [ ] Test Stripe payment (use test keys first: `sk_test_...`)
- [ ] Set first admin user: `node scripts/make-admin.js <email>` (locally with production `MONGO_URI`)
- [ ] Verify `/health` endpoint returns `{ status: "ok" }`

---

## Local Development

```bash
# 1. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Edit .env files with real values

# 3. Start backend
cd backend && npm install && npm run dev

# 4. Start frontend
cd frontend && npm install && npm run dev

# 5. Start scraper (requires Playwright installed)
cd scraper && pip install -r requirements.txt && playwright install chromium
uvicorn main:app --reload --port 8000
```
