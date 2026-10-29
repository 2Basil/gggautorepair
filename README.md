# ZZZ AUTO REPAIR — car service web app

A single-garage web app. Customers register, add vehicles, describe a problem, get an estimate from the owner, track the job live, and pay the bill online. The owner has a portal for requests, pricing, bills, ledger, staff, reminders and an activity log. Installable as a PWA.

**Stack:** Next.js 15 (App Router, server actions) · Prisma 6 · Turso/libSQL (SQLite locally) · Stripe Checkout · Google sign-in · Brevo/Resend email · Vercel.

## Run locally

```bash
npm install
cp .env.example .env
npm run setup        # prisma generate + db push + seed (see below to start empty)
npm run dev          # http://localhost:3000
npm test             # unit tests
```

Start with an empty garage (no demo data): `SEED_DEMO=0 npm run seed`, or run `node prisma/clear-demo-data.js --yes` later.

## Deploy (Vercel + Turso)

1. Push to GitHub; Vercel builds automatically.
2. Environment variables (Vercel → Settings → Environment Variables):

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Database (required) |
| `SESSION_SECRET` | 16+ random characters. **Required in production** — the app refuses to sign sessions without it |
| `OWNER_EMAIL`, `OWNER_PASSWORD` | Owner account (used by `node prisma/owner-setup.js`); also receives new-request emails |
| `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME` | Email: OTP codes + notifications (Brevo free tier) |
| `REQUIRE_VERIFICATION` | `true` to require an email code at registration (default off) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Card payments. Webhook URL: `https://<your-site>/api/stripe-webhook`, event `checkout.session.completed`. Unsigned webhooks are rejected in production |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in (customers only; redirect URI `https://<your-site>/api/auth/google/callback`) |
| `TAX_PCT` | Default sales tax % on new bills (default 0) |
| `NEXT_PUBLIC_GARAGE_NAME`, `_PHONE`, `_EMAIL`, `_ADDRESS`, `NEXT_PUBLIC_TIMEZONE` | Details shown on the site and bills; timezone like `America/Chicago` |

3. Database changes — run once against Turso (needs the Turso vars in `.env`) before/after pushing a new version:

```bash
node prisma/migrate-ready.js     # safe to run twice
node prisma/owner-setup.js       # creates/updates the owner account
```

## What's in it

Customers: register (email/phone + vehicle) or Google · dashboard · add/edit/remove vehicles · book a service ("Others" box for anything) · estimate → accept → live tracking · bills, online card payment or manual proof · reviews after delivery · profile, username, delete account · `/terms`, `/privacy`.

Owner / staff portal (`/owner`): customer queries with call/WhatsApp/estimate buttons and instant alert · per-vehicle-type service prices shown on the customer home page · bills with WhatsApp/email sharing · automatic ledger with CSV export · receiving methods (Zelle, bank, etc.) · employees (own ID + password, limited portal) · job assignment · service reminders (vehicles not serviced in 6 months) · activity log + reviews · settings / change password.

Emails sent automatically (if `EMAIL_*` is set): estimate ready, status changes, bill ready, payment received, and a new-request alert to the owner.

## Security notes

- Sessions are signed with `SESSION_SECRET`; cookies are httpOnly, secure in production.
- Login is rate limited (8 failures per account / 30 per IP per 15 minutes).
- Passwords: 8+ characters everywhere.
- Google sign-in is for customers only, requires a verified email and a state nonce; the demo "mock" login only works outside production.
- The service worker never caches pages (only static assets and an offline page).
- Stripe webhook: signature required, checks `payment_status`, amount and that the bill isn't already paid.
- `/api/health` returns only `ok`/`error`.

## Switching prices on/off for customers

`lib/settings.js` → `SHOW_PRICES` (home, plans, estimate, customerBills). Owners always see all prices.
