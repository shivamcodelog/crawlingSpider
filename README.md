# MapScraper Pro

**Google Maps Data Extraction Platform** — A production-ready Mini SaaS that scrapes business data from Google Maps at scale.

---

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React 18 + Vite + TailwindCSS + Framer Motion |
| Backend    | Node.js + Express.js (REST API)     |
| Scraper    | Python FastAPI + Playwright         |
| Database   | MongoDB (Mongoose ODM)              |
| Auth       | Google OAuth 2.0 (Passport.js + JWT) |
| Payments   | Razorpay (India) + Stripe (International) |
| Hosting    | Docker Compose                      |

---

## Features

- **Two-Stage Scraping** — Collects all listing HREFs first, then navigates each URL individually
- **Deduplication** — Automatic name + phone dedup across queries
- **Export to Excel** — Auto-formatted `.xlsx` files with proper column widths
- **Real-time Progress** — Live progress tracking via polling
- **Credit System** — 1 credit = 50 records, with plan-based limits
- **Dual Payment** — Razorpay (INR) for India, Stripe (USD) for international
- **Google OAuth** — Secure, passwordless authentication
- **Dark Mode UI** — Beautiful dark theme with orange accents

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Google Cloud Console](https://console.cloud.google.com/) project with OAuth 2.0 credentials
- (Optional) Razorpay & Stripe accounts for payment integration

### 1. Clone & Configure

```bash
cd mapscraper-pro
cp .env.example .env
```

Edit `.env` with your credentials:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=a_long_random_string
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

This starts:
- **MongoDB** on port `27017`
- **Backend API** on port `5000`
- **Scraper Service** on port `8000`
- **Frontend** on port `3000`

### 3. Access the App

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Local Development (Without Docker)

### Backend

```bash
cd backend
npm install
npm run dev
```

### Scraper

```bash
cd scraper
pip install -r requirements.txt
playwright install chromium
python main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
mapscraper-pro/
├── docker-compose.yml
├── .env.example
│
├── frontend/                 # React SaaS Dashboard
│   ├── src/
│   │   ├── api/              # Axios client with JWT interceptor
│   │   ├── components/       # Sidebar, StatCard, TerminalWindow, etc.
│   │   ├── context/          # AuthContext (Google OAuth + JWT)
│   │   ├── hooks/            # useJobPolling
│   │   └── pages/            # Landing, Dashboard, NewJob, Billing, etc.
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/                  # Node.js Express API
│   ├── config/               # DB connection, Passport.js
│   ├── middleware/            # JWT verification
│   ├── models/               # User, ScrapeJob, Payment (Mongoose)
│   ├── routes/               # auth, jobs, payments, user
│   └── server.js
│
└── scraper/                  # Python FastAPI Microservice
    ├── main.py               # FastAPI endpoints
    ├── scraper_engine.py     # Production v3.0 scraper (Playwright)
    ├── outputs/              # Generated Excel files
    └── requirements.txt
```

---

## API Endpoints

### Auth
| Method | Endpoint                    | Description               |
| ------ | --------------------------- | ------------------------- |
| GET    | `/auth/google`              | Redirect to Google OAuth  |
| GET    | `/auth/google/callback`     | Handle OAuth callback     |
| POST   | `/auth/logout`              | Logout                    |
| GET    | `/auth/me`                  | Get current user          |

### Jobs
| Method | Endpoint                    | Description               |
| ------ | --------------------------- | ------------------------- |
| POST   | `/api/jobs/create`          | Create new scrape job     |
| GET    | `/api/jobs`                 | List user's jobs          |
| GET    | `/api/jobs/:id`             | Get job details           |
| GET    | `/api/jobs/:id/download`    | Download Excel result     |

### Payments
| Method | Endpoint                         | Description                |
| ------ | -------------------------------- | -------------------------- |
| POST   | `/api/payments/razorpay/order`   | Create Razorpay order      |
| POST   | `/api/payments/razorpay/verify`  | Verify Razorpay payment    |
| POST   | `/api/payments/stripe/checkout`  | Create Stripe session      |
| POST   | `/api/payments/stripe/webhook`   | Handle Stripe webhook      |
| GET    | `/api/payments/history`          | Get payment history        |

### User
| Method | Endpoint                    | Description               |
| ------ | --------------------------- | ------------------------- |
| GET    | `/api/user/profile`         | Get profile               |
| PUT    | `/api/user/profile`         | Update name               |
| GET    | `/api/user/stats`           | Get user statistics       |

---

## Pricing Plans

| Plan       | Credits | Concurrent Jobs | Price (INR) | Price (USD) |
| ---------- | ------- | --------------- | ----------- | ----------- |
| Free       | 5       | 1               | ₹0          | $0          |
| Starter    | 50      | 2               | ₹499        | $6          |
| Pro        | 200     | 5               | ₹1,499      | $18         |
| Enterprise | Unlimited | Unlimited     | ₹4,999      | $60         |

> 1 credit = 50 records scraped

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API** and **Google Identity**
4. Go to **Credentials** → Create **OAuth 2.0 Client ID**
5. Set Authorized redirect URI: `http://localhost:5000/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

---

## License

MIT
