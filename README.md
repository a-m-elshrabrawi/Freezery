# Freezery — Grocery Inventory Tracker

A personal grocery inventory tracker that helps you manage everything in your kitchen, fridge, freezer, and pantry — with an AI-powered recommendations engine built on Claude.

## Live Demo

- **Frontend (GitHub Pages):** `https://a-m-elshabrawi.github.io/freezery/`
- **Backend (Render):** `https://YOUR_RENDER_APP_NAME.onrender.com`

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Vanilla HTML + CSS + JavaScript | Zero build tooling, instant GitHub Pages deploy |
| Backend | Node.js + Express | Lightweight, great PostgreSQL integration |
| Database | PostgreSQL | Relational data with proper foreign keys and triggers |
| AI | Claude API (`claude-haiku-4-5-20251001`) | Fast, cheap, ideal for structured JSON output |
| Auth | express-session + connect-pg-simple | Simple session-based auth, no JWT complexity |
| Deploy | GitHub Pages (frontend) + Render (backend) | Free tier, easy CI/CD via git push |

---

## Features

- **Full CRUD inventory management** — add, edit, delete items with rich metadata (quantity, unit, location, expiry, price)
- **Status tracking** — automatic `ok` / `low` / `out` / `expired` computation via PostgreSQL triggers
- **Smart filtering** — search, filter by category/status/location, multi-column sorting
- **Responsive design** — table view on desktop, card layout on mobile with swipe-to-delete and long-press context menu
- **Dark mode** — auto-detects OS preference, manual toggle persisted in localStorage
- **Dashboard** — stat cards, recent items, needs-attention list, shopping checklist
- **AI Recommendations** — Claude analyzes your live inventory and returns prioritized restocking suggestions, expiry warnings, and maintenance actions
- **Session-based auth** — register, login, logout with bcrypt password hashing
- **Per-user categories** — 11 default grocery categories cloned per user on registration

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Clone the repo

```bash
git clone https://github.com/a-m-elshabrawi/freezery.git
cd freezery
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env — fill in DATABASE_URL, SESSION_SECRET, ANTHROPIC_API_KEY
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
3. Update `docs/js/config.js` with your Render backend URL
4. Push again — GitHub Pages redeploys automatically

### Backend → Render

1. Create a **PostgreSQL** database on Render (free tier)
2. Run `schema.sql` against the Render DB
3. Create a **Web Service** on Render:
   - Root directory: `backend`
   - Build: `npm install`
   - Start: `node server.js`
4. Set environment variables: `DATABASE_URL`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`, `NODE_ENV=production`, `FRONTEND_URL=https://a-m-elshabrawi.github.io`

> **Note:** Render free tier spins down after 15 min of inactivity. First request after wake-up takes ~30s.

---

## API Reference

### Auth (`/api/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account, return session |
| POST | `/api/auth/login` | Login, return session |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Get current user |

### Items (`/api/items`) — Protected

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/items` | List items. Supports `?search=&category=&status=&sort=&order=&limit=&offset=` |
| GET | `/api/items/summary` | Dashboard counts (total, low, out, expired) |
| GET | `/api/items/:id` | Get item by ID |
| POST | `/api/items` | Create item |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Delete item |

### Categories (`/api/categories`) — Protected

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | List user's categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

### Recommendations (`/api/recommendations`) — Protected

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/recommendations` | Generate AI recommendations (cached 5 min per user) |

---

## AI Feature

The recommendations engine (`backend/controllers/recommendationsController.js`) works as follows:

1. Fetches all items for the current user from PostgreSQL (name, category, quantity, unit, min_quantity, status, expiry_date, location)
2. Serializes the inventory as JSON and injects it into a structured prompt
3. Calls `claude-haiku-4-5-20251001` via the Anthropic API, requesting a JSON array of recommendations with priority, action, and reasoning
4. Parses the response and returns it with metadata (item count, generated timestamp)
5. Caches the result in memory for 5 minutes per user to avoid redundant API calls

The prompt instructs Claude to think like a practical grocery planner: prioritizing items that are out of stock, low stock, expired, or approaching expiry.

---

## AI Usage Disclosure

- **Claude Code:** Used to scaffold the entire project — folder structure, all backend routes, middleware, controllers, frontend HTML/CSS/JS, schema, and configuration. All generated code was reviewed before use.
- **Claude API:** Powers the live recommendations feature at `/api/recommendations`. Prompt engineering was done manually to produce structured JSON output.

### What I changed/rejected

_Fill this in with 2-3 specific examples of things you modified or rejected from the generated output._

### What I built without AI

_Fill this in during your no-AI evaluation session._
