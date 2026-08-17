# Auction Arena — Tennis Cricket Player Auction Software

A complete MERN-stack SaaS platform to run local tennis-ball cricket player auctions.
You (the software owner) sell time-limited "passes" to tournament organizers, who then
run their own player/team registration and live auction using this platform.

## What's included

**Three user roles:**
1. **Super Admin (you)** — sets software pricing (1/4/12 month passes), manages organizer accounts, extends/suspends passes.
2. **Organizer (your customer)** — buys a pass, gets a login, then manages their tournament: registration links, categories, teams, live auction, PDFs.
3. **Public visitors** — players and team owners register via shareable links, pay registration fees through Razorpay.

**Core features (from your spec, plus a few essentials added):**
- Public player registration link (name, batting/bowling hand, batsman/bowler/all-rounder, age, optional photo, Razorpay payment)
- Public team registration link (owner name, team name, owner-plays toggle, owner photo, team logo, Razorpay payment)
- Admin: player categories with base prices, extra "bonus purse" point sets grantable to teams
- Admin: manually add team owners
- Admin: max purse per team, min/max squad size
- **Live real-time auction** (Socket.io) — current player, live bid amount/team, configurable bid-increment rules, Sold/Unsold buttons — *this wasn't explicit in your doc but is essential for an actual live auction experience*
- Automatic purse deduction on sale
- Live dashboard: remaining purse per team, sold/unsold/pending player counts
- Full auction history log with round tracking + one-click **re-auction of unsold players**
- Admin sets registration fees, max players/teams — registration link auto-closes with a friendly message once full
- Admin can view all registered players/teams and approve them before auction
- **Downloadable PDF reports**: one PDF per team (squad + prices + bonus points) and one full auction-history PDF
- Organizer signup flow: tournament name/date/organizer name/logo + Razorpay payment across 3 pass tiers → auto-generated Login ID & password
- Super Admin sets the 3 pass prices
- Pass expiry is enforced automatically (hourly cron job) — once expired, the organizer can only see a "renew your pass" screen

**Added for usability (not in original doc):**
- Multi-tenant data isolation — every organizer's data is fully separate
- Configurable bid-increment rules (e.g. +100 below Rs.2000, +500 above)
- Player/team approval step before they appear in the auction
- Manual "pick specific player next" option during live auction, in addition to auto-pick
- Clean, distinctive turf-green/gold auction-themed UI, fully responsive tables and cards

## Tech stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.io, JWT auth, Razorpay, Cloudinary (image uploads), PDFKit, node-cron
- **Frontend:** React (Vite), React Router, Tailwind CSS, Socket.io-client, Axios

## Project structure

```
tennis-auction-app/
├── backend/
│   ├── models/            Mongoose schemas
│   ├── controllers/       Business logic
│   ├── routes/            Express routes
│   ├── middleware/        Auth + pass-expiry guard
│   ├── utils/              Razorpay, PDF generator, bid-increment logic, cron
│   ├── server.js           App entry point (Express + Socket.io)
│   ├── bootstrapSuperAdmin.js   Creates super admin + default pricing on first run
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/public/      Home, Player/Team registration, Buy Software
    │   ├── pages/organizer/   Login, Dashboard, Players, Teams, Categories, Live Auction, History, Settings, Renew
    │   ├── pages/superadmin/  Login, Dashboard
    │   ├── components/        Reusable UI (image upload, purse bar, layout, etc.)
    │   └── api/, context/, utils/, socket.js
    └── .env.example
```

## Setup

### Prerequisites
- Node.js 18+
- A MongoDB database (local or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)
- A [Razorpay](https://razorpay.com) account (test mode keys are fine to start)
- A [Cloudinary](https://cloudinary.com) account (free tier) for photo/logo uploads — optional; without it, uploads fall back to local disk storage automatically

### 1. Backend

```bash
cd backend
cp .env.example .env
# edit .env with your MongoDB URI, Razorpay keys, Cloudinary keys, and a super admin email/password
npm install
npm run dev
```

The first time it starts, it will automatically:
- Create your Super Admin account (from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` in `.env`)
- Seed default pricing for the 3 pass tiers (you can change these later from the Super Admin panel)

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# edit .env with your Razorpay KEY ID (public key, safe to expose client-side)
npm install
npm run dev
```

Visit `http://localhost:5173`.

### 3. Typical flow to try it end-to-end

1. Go to `/super-admin/login`, log in with your `.env` credentials, set pricing if you want to change the defaults.
2. Go to `/get-started`, fill the organizer signup form, choose a pass, and pay (use Razorpay test card `4111 1111 1111 1111`, any future expiry/CVV).
3. Note the Login ID & password shown, then log in at `/organizer/login`.
4. In the organizer dashboard, copy the **Player** and **Team registration links** and open them in a new tab to register a few test players/teams (registration fee can be set to 0 in Settings to skip payment during testing).
5. Approve the players/teams in the **Players** / **Teams** tabs, assign categories & base prices.
6. Go to **Live Auction**, click "Start Next Player", place bids for different teams, then Mark Sold/Unsold.
7. Check **History & PDFs** to download the auction history and per-team summary PDFs.

## Deployment notes

- Backend: deploy to Render, Railway, or any Node host. Set all `.env` values as environment variables there.
- Frontend: deploy to Vercel/Netlify. Set `VITE_RAZORPAY_KEY_ID`, and point API calls to your deployed backend URL (update the `baseURL` in `src/api/axios.js` or use a Vite proxy/env var for production).
- Use Razorpay **live** keys only once you've tested thoroughly in test mode.
- Consider adding HTTPS, rate-limiting, and stricter file-upload validation before going to production with real payments.

## What you may want to extend next

- Email/SMS notifications on successful registration
- A public "spectator" live-auction view teams/fans can watch without logging in
- Multi-admin accounts per organizer (e.g. an assistant auctioneer)
- Automated squad-size validation before allowing auction to be marked "completed"
