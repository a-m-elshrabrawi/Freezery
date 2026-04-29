# Freezery — Grocery Inventory Tracker

A personal grocery inventory tracker that helps you manage everything in your kitchen, fridge, freezer, and pantry — with an AI-powered recommendations engine built on Groq.

## Live Demo

- **Frontend (GitHub Pages):** `https://a-m-elshrabrawi.github.io/Freezery/`
- **Backend (Render):** `https://freezery-api.onrender.com`

---

## Tech Stack

| Layer    | Technology                                  | Rationale                                             |
| -------- | ------------------------------------------- | ----------------------------------------------------- |
| Frontend | Vanilla HTML + CSS + JavaScript             | Zero build tooling, instant GitHub Pages deploy       |
| Backend  | Node.js + Express                           | Lightweight, great PostgreSQL integration             |
| Database | PostgreSQL                                  | Relational data with proper foreign keys and triggers |
| AI       | Groq API (`llama-3.3-70b-versatile`)        | Fast inference, large model, structured JSON output   |
| Auth     | JWT + express-session + connect-pg-simple   | JWT for mobile cross-origin support, session fallback |
| Deploy   | GitHub Pages (frontend) + Render (backend)  | Free tier, easy CI/CD via git push                    |

---

## Features

- **Full CRUD inventory management** — add, edit, delete items with rich metadata (quantity, unit, location, expiry, price, notes)
- **Quick quantity adjustment** — +/− buttons directly on the inventory list, no need to open the edit form
- **Status tracking** — automatic `ok` / `low` / `out` / `expired` computation via PostgreSQL triggers on every insert/update
- **Smart filtering & sorting** — search by name, filter by category/status, sort by any column (name, quantity, category, location, updated date)
- **Responsive design** — table view on desktop, card layout on mobile
- **Dark mode** — auto-detects OS preference, manual toggle persisted in localStorage
- **Dashboard** — stat cards (total, low, out, expired), recent items table, needs-attention list with restock modal
- **Restock modal** — click Restock on any low/out item, enter how much you bought, quantity updates instantly
- **AI Recommendations** — Groq/LLaMA analyzes your live inventory and returns prioritized, deduplicated suggestions with specific quantities and dates
- **JWT + session auth** — works on all browsers including mobile Safari (no third-party cookie dependency)
- **Per-user categories** — 11 default grocery categories cloned per user on registration

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Clone the repo

```bash
git clone https://github.com/a-m-elshrabrawi/Freezery.git
cd Freezery
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env — fill in DATABASE_URL, SESSION_SECRET, JWT_SECRET, GROQ_API_KEY
npm install
```

### 3. Set up PostgreSQL

```bash
psql -U postgres
CREATE DATABASE freezery;
CREATE USER freezery_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE freezery TO freezery_user;
\q

psql -U freezery_user -d freezery -f backend/schema.sql
```

Update `DATABASE_URL` in `.env`:

```
DATABASE_URL=postgresql://freezery_user:yourpassword@localhost:5432/freezery
```

### 4. Start the backend

```bash
cd backend
node server.js
# → Freezery API running on port 3000
```

### 5. Serve the frontend

```bash
# From project root:
npx serve docs/
# Or use VS Code Live Server pointing to /docs
```

Open `http://localhost:5500` (or whatever port `serve` uses).

---

## Deployment

### Frontend → GitHub Pages

1. Push repo to GitHub
2. Go to **Settings → Pages**, source: `main` branch, folder: `/docs`
3. Confirm `docs/js/config.js` has your Render backend URL
4. Push again — GitHub Pages redeploys automatically

### Backend → Render

1. Create a **PostgreSQL** database on Render (free tier)
2. Run `schema.sql` against the Render DB
3. Create a **Web Service** on Render:
   - Root directory: `backend`
   - Build: `npm install`
   - Start: `node server.js`
4. Set environment variables:

| Variable       | Value                                          |
| -------------- | ---------------------------------------------- |
| `DATABASE_URL` | Render internal Postgres connection string     |
| `SESSION_SECRET` | Long random string                           |
| `JWT_SECRET`   | Long random string (different from session)    |
| `GROQ_API_KEY` | Your Groq API key                              |
| `NODE_ENV`     | `production`                                   |
| `FRONTEND_URL` | `https://a-m-elshrabrawi.github.io`            |

> **Note:** Render free tier spins down after 15 min of inactivity. The first request after wake-up takes ~30s and may appear as a CORS error — just try again once the service is awake. Use a cron service (e.g. cron-job.org) to ping `/health` every 10 minutes to keep it warm.

---

## API Reference

### Auth (`/api/auth`)

| Method | Path                 | Description                               |
| ------ | -------------------- | ----------------------------------------- |
| POST   | `/api/auth/register` | Create account — returns `{ user, token }` |
| POST   | `/api/auth/login`    | Login — returns `{ user, token }`          |
| POST   | `/api/auth/logout`   | Destroy session, clear client token       |
| GET    | `/api/auth/me`       | Get current user (auth required)          |

### Items (`/api/items`) — Protected

| Method | Path                 | Description                                                                    |
| ------ | -------------------- | ------------------------------------------------------------------------------ |
| GET    | `/api/items`         | List items. Supports `?search=&category=&status=&sort=&order=&limit=&offset=` |
| GET    | `/api/items/summary` | Dashboard counts (total, low, out, expired)                                    |
| GET    | `/api/items/:id`     | Get single item                                                                |
| POST   | `/api/items`         | Create item                                                                    |
| PUT    | `/api/items/:id`     | Update item                                                                    |
| DELETE | `/api/items/:id`     | Delete item                                                                    |

### Categories (`/api/categories`) — Protected

| Method | Path                  | Description            |
| ------ | --------------------- | ---------------------- |
| GET    | `/api/categories`     | List user's categories |
| POST   | `/api/categories`     | Create category        |
| PUT    | `/api/categories/:id` | Update category        |
| DELETE | `/api/categories/:id` | Delete category        |

### Recommendations (`/api/recommendations`) — Protected

| Method | Path                   | Description                                          |
| ------ | ---------------------- | ---------------------------------------------------- |
| POST   | `/api/recommendations` | Generate AI recommendations (cached 5 min per user)  |

**Auth note:** All protected routes accept either a `Bearer <token>` header (JWT) or a session cookie. The JWT is returned by login/register and should be stored in `localStorage`.

---

## AI Recommendations

The recommendations engine (`backend/controllers/recommendationsController.js`):

1. Fetches all items for the current user (name, category, quantity, unit, min_quantity, status, expiry_date, location)
2. Injects today's date and the full inventory JSON into a structured prompt
3. Calls `llama-3.3-70b-versatile` via the Groq API, requesting one recommendation per item with priority, action, and a specific reason referencing actual quantities and dates
4. Deduplicates the response by `item_id` to prevent repeated cards
5. Caches the result in memory for 5 minutes per user

Priority rules enforced in the prompt:
- **High** — item is out of stock, quantity below minimum, or expiry within 7 days
- **Medium** — expiry within 30 days, or quantity at/just above minimum
- **Low** — well stocked, no expiry concern

---

## AI Usage Disclosure

- **Claude Code:** Used throughout development to implement features, fix bugs, and refactor — including auth, the recommendations engine, inventory CRUD, responsive UI, and more. All generated code was reviewed before use.
- **Groq API:** Powers the live recommendations feature at `/api/recommendations` using `llama-3.3-70b-versatile`.
