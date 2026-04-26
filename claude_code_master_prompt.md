# 🧠 Claude Code Master Prompt
## Project: Freezery — Grocery Inventory Tracker
### Built for: Web Development Challenge Submission

---

## HOW TO USE THIS PROMPT

1. Install Claude Code if you haven't: `npm install -g @anthropic/claude-code`
2. Open your terminal, `cd` into the folder where you want the project created
3. Run `claude` to start a session
4. Paste everything between the `═══` markers below and hit Enter
5. Claude Code will build the project file by file, run installs, and verify things work — let it run without interrupting
6. When it finishes, it will print a checklist of **[MANUAL STEPS]** — follow each one using the guides in this document

**Tips for Claude Code:**
- If it pauses and asks a yes/no question, answer it — it's usually asking to run a command or create a file
- If it hits an error mid-build, just say `"fix it and continue"` — don't restart the session
- Keep the session going until it explicitly says the build is complete and prints the manual steps checklist
- Token cost for this project: roughly $3–$8 depending on correction cycles

---

---

# ═══════════════════════════════════════════
# MASTER PROMPT — PASTE EVERYTHING BELOW INTO CLAUDE CODE
# ═══════════════════════════════════════════

You are acting as a senior full-stack engineer building a complete, production-quality web application for a graded technical challenge. You have direct access to the filesystem and terminal. You will build the entire project from scratch — creating every file, installing dependencies, running the database schema, and verifying the backend starts correctly. No placeholders, no TODOs, no skipped sections. Every file must be complete and functional.

Work through the project in this order:
1. Create the full folder structure
2. Generate all backend files
3. Run `npm install` in the backend folder
4. Generate `backend/schema.sql` and provide the command to run it
5. Start the backend server briefly to verify it boots without errors, then stop it
6. Generate all frontend files
7. Generate `README.md`
8. Print the full manual steps checklist

---

## PROJECT OVERVIEW

**App Name:** Freezery
**Concept:** A personal grocery inventory tracker — users can track everything in their kitchen, fridge, freezer, and pantry. They get a clear view of what they have, what's running low, what's about to expire, and what needs restocking on the next grocery run.
**Stack:** Vanilla HTML + CSS + JavaScript (frontend only, no framework), Node.js + Express (backend API), PostgreSQL (database)
**AI Feature:** Claude-powered smart recommendations engine — suggests restocking actions, reorder priorities, and maintenance reminders based on current inventory state.

**Why this app scores well on the rubric:**
- Useful, realistic, and immediately demoable
- Clean CRUD flows around real household data
- AI feature adds genuine value (not decoration) — it reads live inventory and gives actionable recommendations
- Straightforward to deploy separately (GitHub Pages + Render)

---

## FOLDER STRUCTURE TO GENERATE

Generate exactly this structure. Do not deviate.

```
freezery/
├── frontend/                  # Pure HTML/CSS/JS — deployed to GitHub Pages
│   ├── index.html             # Dashboard / home view
│   ├── inventory.html         # Full inventory list view
│   ├── add-item.html          # Add new item form
│   ├── edit-item.html         # Edit item form (loads item by ID from query param)
│   ├── recommendations.html   # AI recommendations view
│   ├── css/
│   │   ├── main.css           # Global styles, variables, reset
│   │   ├── dashboard.css      # Dashboard-specific styles
│   │   ├── inventory.css      # Inventory table & cards
│   │   └── forms.css          # Form styles (shared by add + edit)
│   ├── js/
│   │   ├── config.js          # API base URL config (swap for local vs prod)
│   │   ├── api.js             # All fetch() calls to the backend — centralized
│   │   ├── dashboard.js       # Dashboard page logic
│   │   ├── inventory.js       # Inventory list, filter, sort, search logic
│   │   ├── add-item.js        # Add item form logic + validation
│   │   ├── edit-item.js       # Edit item form logic + validation
│   │   └── recommendations.js # AI recommendations fetch + render
│   └── assets/
│       └── logo.svg           # Simple SVG logo (generate inline)
│
├── backend/                   # Node.js/Express API — deployed to Render
│   ├── server.js              # Entry point
│   ├── db.js                  # PostgreSQL connection pool (pg library)
│   ├── routes/
│   │   ├── items.js           # CRUD routes for inventory items
│   │   ├── categories.js      # Category management routes
│   │   └── recommendations.js # AI recommendations route
│   ├── middleware/
│   │   ├── auth.js            # Session/token auth middleware
│   │   ├── validate.js        # Request validation middleware
│   │   └── errorHandler.js    # Centralized error handler
│   ├── controllers/
│   │   ├── itemsController.js
│   │   ├── categoriesController.js
│   │   └── recommendationsController.js
│   ├── .env.example           # Template env file (never commit real .env)
│   ├── package.json
│   └── schema.sql             # Full DB schema with seed data
│
└── README.md                  # Full setup + deployment instructions
```

---

## DATABASE SCHEMA

Generate `backend/schema.sql` with the following exact tables:

```sql
-- Users table (simple session-based auth)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT '📦',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'units',
  min_quantity INTEGER DEFAULT 1,       -- triggers low-stock alert
  location VARCHAR(100),                -- e.g. "fridge", "freezer", "pantry", "cupboard"
  purchase_date DATE,
  expiry_date DATE,
  purchase_price DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'ok'       -- 'ok', 'low', 'out', 'expired'
    CHECK (status IN ('ok', 'low', 'out', 'expired')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Auto-update updated_at on items
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-compute status based on quantity vs min_quantity
CREATE OR REPLACE FUNCTION compute_item_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity = 0 THEN NEW.status = 'out';
  ELSIF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < NOW() THEN NEW.status = 'expired';
  ELSIF NEW.quantity <= NEW.min_quantity THEN NEW.status = 'low';
  ELSE NEW.status = 'ok';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_status
BEFORE INSERT OR UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION compute_item_status();

-- Seed: default grocery categories (these get cloned per user on register)
INSERT INTO categories (user_id, name, icon) VALUES
  (NULL, 'Meat & Seafood', '🥩'),
  (NULL, 'Dairy & Eggs', '🥛'),
  (NULL, 'Fruits & Vegetables', '🥦'),
  (NULL, 'Canned & Jarred Goods', '🥫'),
  (NULL, 'Frozen Foods', '🧊'),
  (NULL, 'Bread & Bakery', '🍞'),
  (NULL, 'Condiments & Sauces', '🧂'),
  (NULL, 'Beverages', '🥤'),
  (NULL, 'Snacks', '🍿'),
  (NULL, 'Grains, Pasta & Rice', '🌾'),
  (NULL, 'Household Essentials', '🧹');
```

---

## BACKEND API SPEC

Build every one of these routes completely. No stubs.

### Auth Routes (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account. Hash password with bcrypt. Return session token. |
| POST | `/api/auth/login` | Validate credentials. Return session token. |
| POST | `/api/auth/logout` | Invalidate session token. |
| GET | `/api/auth/me` | Return current user from token. |

**Session strategy:** Use `express-session` with a PostgreSQL session store (`connect-pg-simple`). Store session in a `sessions` table. Return the session cookie.

### Items Routes (`/api/items`) — Protected
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/items` | Get all items for current user. Support query params: `?search=`, `?category=`, `?status=`, `?sort=name\|quantity\|updated_at`, `?order=asc\|desc` |
| GET | `/api/items/:id` | Get single item by ID |
| POST | `/api/items` | Create new item. Validate all fields. |
| PUT | `/api/items/:id` | Update item. Validate all fields. |
| DELETE | `/api/items/:id` | Delete item. |
| GET | `/api/items/summary` | Return counts: total items, low stock count, out of stock count, expired count. Used by dashboard. |

### Categories Routes (`/api/categories`) — Protected
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | Get all categories for current user |
| POST | `/api/categories` | Create new category |
| PUT | `/api/categories/:id` | Update category name/icon |
| DELETE | `/api/categories/:id` | Delete category (items become uncategorized) |

### Recommendations Route (`/api/recommendations`) — Protected
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/recommendations` | Fetch current user's inventory, build prompt, call Claude API, return structured recommendations |

---

## BACKEND IMPLEMENTATION REQUIREMENTS

Build `backend/server.js` with:
- `express`, `cors` (allow frontend origin), `helmet`, `express-session`, `connect-pg-simple`
- Rate limiting on auth routes (use `express-rate-limit`)
- JSON body parsing
- Centralized error handler as last middleware
- Graceful shutdown on SIGTERM (important for Render)

Build `backend/db.js` with:
- `pg` Pool connected via `DATABASE_URL` env var
- Export a `query(text, params)` helper function
- Log slow queries (>500ms) to console

Build `backend/middleware/auth.js`:
- Check `req.session.userId` is set
- If not, return `401 { error: 'Unauthorized' }`
- Attach `req.user` from DB lookup

Build `backend/middleware/validate.js`:
- Export `validateItem` middleware — check required fields (name, quantity), quantity is a non-negative integer, min_quantity is a non-negative integer, status is a valid enum value
- Return `400 { error: '...', field: '...' }` on failure

Build `backend/middleware/errorHandler.js`:
- Catch all errors
- Log full error to console
- Return `{ error: message, ...(dev ? { stack } : {}) }` based on NODE_ENV

---

## AI RECOMMENDATIONS ENGINE

Build `backend/controllers/recommendationsController.js`:

1. Fetch all items for the current user from the DB
2. Build this prompt and send it to the Claude API:

```
You are a smart grocery inventory assistant. Analyze the following grocery inventory data and return a JSON array of recommendations. Each recommendation must have:
- "priority": "high" | "medium" | "low"
- "item_name": string
- "action": string (e.g. "Restock", "Use before expiry", "Add to shopping list", "Check freshness")
- "reason": string (1-2 sentences explaining why)
- "category": string

Focus on: items with status 'low' or 'out', items with approaching or past expiry dates, items with quantity below min_quantity, and patterns suggesting restocking cadence. Think like a practical household grocery planner.

Return ONLY a valid JSON array. No explanation, no markdown, no preamble.

INVENTORY DATA:
{{INVENTORY_JSON}}
```

3. Replace `{{INVENTORY_JSON}}` with `JSON.stringify(items, null, 2)` — include only: id, name, category name, quantity, unit, min_quantity, status, expiry_date, location
4. Parse the Claude response as JSON
5. Return `{ recommendations: [...], generated_at: new Date().toISOString(), item_count: items.length }`
6. Cache the result in memory for 5 minutes per user to avoid hammering the API

Use the Claude API endpoint: `https://api.anthropic.com/v1/messages`
Model: `claude-haiku-4-5-20251001` (fast and cheap — ideal for this use case)
Read the API key from `process.env.ANTHROPIC_API_KEY`

---

## FRONTEND DESIGN SYSTEM

Apply this design system consistently across all pages.

**Aesthetic direction:** Clean industrial-utility — like a well-designed warehouse management tool. Dark navy sidebar, crisp white content area, amber/orange accent for alerts and CTAs. Feels professional and purposeful, not sterile.

**CSS Variables (define in `main.css`):**
```css
:root {
  --bg: #f4f5f7;
  --surface: #ffffff;
  --sidebar-bg: #1a1f2e;
  --sidebar-text: #a8b0c0;
  --sidebar-active: #ffffff;
  --sidebar-accent: #f59e0b;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border: #e5e7eb;
  --accent: #f59e0b;
  --accent-hover: #d97706;
  --danger: #ef4444;
  --success: #10b981;
  --warning: #f59e0b;
  --info: #3b82f6;
  --status-ok: #10b981;
  --status-low: #f59e0b;
  --status-out: #ef4444;
  --status-expired: #8b5cf6;
  --radius: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
  --font-display: 'DM Sans', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

**Dark mode variables (define in `main.css` immediately after `:root`):**
```css
/* Auto dark mode — follows OS preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0f1117;
    --surface: #1a1f2e;
    --surface-raised: #222738;
    --sidebar-bg: #0d1117;
    --sidebar-text: #8b949e;
    --sidebar-active: #ffffff;
    --sidebar-accent: #f59e0b;
    --text-primary: #e6edf3;
    --text-secondary: #8b949e;
    --border: #30363d;
    --accent: #f59e0b;
    --accent-hover: #d97706;
    --danger: #f85149;
    --success: #3fb950;
    --warning: #d29922;
    --info: #58a6ff;
    --status-ok: #3fb950;
    --status-low: #d29922;
    --status-out: #f85149;
    --status-expired: #a371f7;
    --shadow: 0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3);
    --input-bg: #161b22;
    --input-border: #30363d;
    --row-hover: rgba(255,255,255,0.04);
    --badge-ok-bg: rgba(63,185,80,0.15);
    --badge-low-bg: rgba(210,153,34,0.15);
    --badge-out-bg: rgba(248,81,73,0.15);
    --badge-expired-bg: rgba(163,113,247,0.15);
  }
}

/* Manual dark mode — user toggled, overrides OS */
:root[data-theme="dark"] {
  --bg: #0f1117;
  --surface: #1a1f2e;
  --surface-raised: #222738;
  --sidebar-bg: #0d1117;
  --sidebar-text: #8b949e;
  --sidebar-active: #ffffff;
  --sidebar-accent: #f59e0b;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --border: #30363d;
  --accent: #f59e0b;
  --accent-hover: #d97706;
  --danger: #f85149;
  --success: #3fb950;
  --warning: #d29922;
  --info: #58a6ff;
  --status-ok: #3fb950;
  --status-low: #d29922;
  --status-out: #f85149;
  --status-expired: #a371f7;
  --shadow: 0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3);
  --input-bg: #161b22;
  --input-border: #30363d;
  --row-hover: rgba(255,255,255,0.04);
  --badge-ok-bg: rgba(63,185,80,0.15);
  --badge-low-bg: rgba(210,153,34,0.15);
  --badge-out-bg: rgba(248,81,73,0.15);
  --badge-expired-bg: rgba(163,113,247,0.15);
}

/* Manual light mode — user toggled back to light, even if OS is dark */
:root[data-theme="light"] {
  --bg: #f4f5f7;
  --surface: #ffffff;
  --surface-raised: #f9fafb;
  --input-bg: #ffffff;
  --input-border: #e5e7eb;
  --row-hover: #f9fafb;
  --badge-ok-bg: rgba(16,185,129,0.1);
  --badge-low-bg: rgba(245,158,11,0.1);
  --badge-out-bg: rgba(239,68,68,0.1);
  --badge-expired-bg: rgba(139,92,246,0.1);
}
```

**Dark mode — components checklist (Cursor must apply dark variables to ALL of these):**
- `body` — background uses `--bg`
- `.sidebar` — uses `--sidebar-bg`, nav links use `--sidebar-text`, active uses `--sidebar-active`
- `.topbar` — same as sidebar background
- `.surface` / `.card` — uses `--surface`
- `<table>` — background `--surface`, `<th>` background `--surface-raised`, row hover `--row-hover`
- `<input>`, `<select>`, `<textarea>` — background `--input-bg`, border `--input-border`, text `--text-primary`
- Status badges — use `--badge-*-bg` for background (translucent tint) + matching `--status-*` for text/border
- Toast notifications — background `--surface-raised`, text `--text-primary`, border `--border`
- `.bottom-nav` — background `--surface`, border-top `--border`
- `.auth-card` (login page) — background `--surface`
- Recommendation cards — background `--surface`, border `--border`
- Stat cards — background `--surface`
- Dropdowns/select menus — background `--input-bg`, text `--text-primary`
- Pagination buttons — background `--surface`, border `--border`, hover `--surface-raised`
- Modals / confirm dialogs — background `--surface`, overlay `rgba(0,0,0,0.6)`
- Scrollbars (webkit) — thumb `--border`, track `--bg`

**Dark mode — smooth transition:**
```css
*, *::before, *::after {
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.15s ease;
}
/* Exception: don't transition transforms or opacity (breaks animations) */
.sidebar, .toast, .spinner { transition: none; }
```

**Dark mode toggle — implementation in `js/api.js` (shared utility):**

```javascript
// Dark mode toggle — call initTheme() on every page load
export function initTheme() {
  const saved = localStorage.getItem('freezery-theme'); // 'dark' | 'light' | null
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }
  // If no saved preference, CSS @media handles it automatically — no attribute needed
  updateToggleIcon();
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  let next;
  if (current === 'dark') next = 'light';
  else if (current === 'light') next = 'dark';
  else next = systemDark ? 'light' : 'dark'; // toggle away from system default

  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('freezery-theme', next);
  updateToggleIcon();
}

function updateToggleIcon() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    || (!document.documentElement.getAttribute('data-theme')
        && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}
```

Call `initTheme()` as the **very first script** in each HTML page's `<head>` (before anything else renders) to prevent flash of wrong theme:
```html
<script type="module">
  import { initTheme } from './js/api.js';
  initTheme();
</script>
```

**Dark mode toggle button placement:**
- **Desktop sidebar:** Icon button at the bottom of the sidebar, above the user/logout section. Shows 🌙 in light mode, ☀️ in dark mode. `id="theme-toggle"`, calls `toggleTheme()` on click.
- **Mobile topbar:** Same icon button on the right side of the topbar (alongside the user avatar). 
- On the **login page** (no sidebar/topbar): place the toggle in the top-right corner of the page.

**Typography:** Load `DM Sans` and `JetBrains Mono` from Google Fonts in each HTML file's `<head>`.

**Layout:** CSS Grid root layout — sidebar + main. Sidebar is 240px fixed on desktop, transitions to a slide-in drawer on mobile. Use `--sidebar-width: 240px` as a variable. Main content scrolls independently.

**Sidebar navigation links:**
- 🏠 Dashboard (`index.html`)
- 📦 Inventory (`inventory.html`)
- ➕ Add Item (`add-item.html`)
- 🤖 AI Recommendations (`recommendations.html`)

**Status badges:** Pill-shaped badges using `--status-*` colors for ok / low / out / expired.

**Cards:** White surface, `--shadow`, `--radius`, 20px padding.

**Buttons:**
- Primary: amber background, dark text, bold
- Danger: red background, white text
- Ghost: transparent, border, secondary text
- All buttons: minimum touch target of 44px height on mobile

**Tables:** Clean, no outer border, subtle row hover (`#f9fafb`), sticky header.

---

## RESPONSIVE DESIGN SYSTEM

This app must work flawlessly across all screen sizes. Implement all of the following. No exceptions.

### Breakpoints (define as CSS custom media or use directly in media queries)

```css
/* Mobile:        < 480px  */
/* Mobile large:  480px – 767px */
/* Tablet:        768px – 1023px */
/* Desktop:       1024px – 1279px */
/* Wide:          ≥ 1280px */
```

### Root Layout Behaviour

```css
/* Desktop (≥ 1024px): sidebar always visible, fixed left */
.app-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  min-height: 100vh;
}

/* Tablet (768px – 1023px): sidebar hidden by default, slides in as overlay on toggle */
@media (max-width: 1023px) {
  .app-layout { grid-template-columns: 1fr; }
  .sidebar { position: fixed; left: -240px; top: 0; height: 100vh; z-index: 100;
              transition: left 0.25s ease; }
  .sidebar.open { left: 0; }
  .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4);
                     z-index: 99; opacity: 0; pointer-events: none; transition: opacity 0.25s; }
  .sidebar.open ~ .sidebar-overlay { opacity: 1; pointer-events: all; }
}

/* Mobile (< 768px): same as tablet but sidebar is full-width overlay */
@media (max-width: 767px) {
  .sidebar { width: 100%; left: -100%; }
  .sidebar.open { left: 0; }
}
```

### Topbar (mobile/tablet only)

On screens < 1024px, show a fixed topbar (height: 56px) containing:
- Hamburger menu button (left) — toggles sidebar open/close
- App name "Freezery" centered
- User avatar/initials button (right) — opens a dropdown with username + Logout

```css
.topbar { display: none; }
@media (max-width: 1023px) {
  .topbar { display: flex; align-items: center; justify-content: space-between;
            position: fixed; top: 0; left: 0; right: 0; height: 56px;
            background: var(--sidebar-bg); color: white; padding: 0 16px; z-index: 98; }
  .main-content { padding-top: 56px; }
}
```

### Sidebar — Responsive Behaviour

- Desktop: always visible, 240px, shows icon + label for each nav link
- Tablet/Mobile: hidden by default, full overlay when open
- Active nav link: amber left border + white text
- Close button (✕) appears inside the sidebar on mobile/tablet only
- Clicking the overlay closes the sidebar
- Pressing Escape closes the sidebar

### Dashboard — Stat Cards Grid

```css
.stats-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(4, 1fr); /* Desktop: 4 across */
}
@media (max-width: 1023px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px)  { .stats-grid { grid-template-columns: 1fr; } }
```

### Dashboard — Shopping List Widget

- Desktop: side-by-side with "Needs Attention" section (CSS Grid, 2 columns)
- Tablet: stacked vertically, full width
- Mobile: stacked vertically, full width, compact item rows

### Inventory Table → Card Switch

On desktop (≥ 1024px): render as a `<table>` with all columns visible.

On tablet (768px – 1023px): render as a `<table>` but hide lower-priority columns: `purchase_date`, `notes`. Show: name, category, quantity, status, location, actions.

On mobile (< 768px): **switch to card layout entirely**. Each item becomes a card:
```
┌──────────────────────────────┐
│ [Status Badge]  [Category]   │
│ Item Name (bold, large)      │
│ Qty: 3 units  Min: 2         │
│ 📍 Fridge  · Expires Apr 30  │
│ [Edit]          [Delete]     │
└──────────────────────────────┘
```
Implement the switch using a JS function `renderItems(items)` that checks `window.innerWidth` and calls either `renderTable(items)` or `renderCards(items)`. Add a `resize` event listener (debounced) to re-render on orientation change.

### Search & Filter Bar — Responsive

- Desktop: single row — [Search input (flex-grow)] [Category ▾] [Status ▾] [Sort ▾]
- Tablet: two rows — search full width on top, filters in a row below
- Mobile: search full width, filters collapsed into a single "Filters ▾" button that expands a filter panel below

```css
.filter-bar { display: flex; gap: 12px; flex-wrap: wrap; }
.filter-bar .search { flex: 1 1 200px; }
.filter-bar select { flex: 0 0 auto; }

@media (max-width: 600px) {
  .filter-bar { flex-direction: column; }
  .filter-bar .search { width: 100%; }
  .filter-toggle-btn { display: flex; } /* shows "Filters ▾" button */
  .filter-panel { display: none; }
  .filter-panel.open { display: flex; flex-direction: column; gap: 8px; }
}
```

### Forms (Add Item / Edit Item) — Responsive

- Desktop: two-column grid for fields (name + category side by side, quantity + unit side by side, etc.)
- Tablet: two-column grid (same)
- Mobile: single column, full-width inputs

```css
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-grid .full-width { grid-column: 1 / -1; }
@media (max-width: 600px) {
  .form-grid { grid-template-columns: 1fr; }
  .form-grid .full-width { grid-column: 1; }
}
```

All inputs: `width: 100%`, `min-height: 44px` (touch target), `font-size: 16px` minimum on mobile (prevents iOS zoom-on-focus).

### Recommendations Page — Responsive

- Desktop: recommendation cards in a 2-column grid per priority group
- Tablet: 2-column grid
- Mobile: single column

```css
.recommendations-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (max-width: 600px) { .recommendations-grid { grid-template-columns: 1fr; } }
```

### Login Page — Responsive

- Desktop/Tablet: centered card (max-width: 420px), vertically centered in viewport
- Mobile: full-width card, no border-radius on edges, sticks to top with padding

```css
.auth-card { max-width: 420px; width: 100%; margin: auto; }
@media (max-width: 480px) {
  .auth-wrapper { align-items: flex-start; padding: 24px 16px; }
  .auth-card { border-radius: var(--radius); }
}
```

### Toast Notifications — Responsive

- Desktop: bottom-right corner, max-width 360px
- Mobile: full width, bottom of screen, 12px margin on sides

```css
.toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 999; }
@media (max-width: 600px) {
  .toast-container { right: 12px; left: 12px; bottom: 16px; }
  .toast { width: 100%; }
}
```

### Pagination Controls — Responsive

- Desktop: show page numbers (e.g. 1 2 3 … 8 9 10)
- Mobile: simplify to "← Prev  Page 3 of 10  Next →" (no individual page buttons)

### Touch & Interaction

- All interactive elements: minimum 44×44px tap target
- No hover-only interactions — all hover states must also have focus states (`:focus-visible`)
- Swipe to delete on mobile card view: implement a subtle swipe-left gesture that reveals a red Delete button (use `touchstart`/`touchmove`/`touchend` events)
- Long press on a card (mobile): shows a context menu with Edit / Delete options

### Typography Scale — Responsive

```css
/* Headings scale down on mobile */
h1 { font-size: clamp(1.5rem, 4vw, 2rem); }
h2 { font-size: clamp(1.25rem, 3vw, 1.5rem); }
h3 { font-size: clamp(1rem, 2.5vw, 1.25rem); }

/* Body text: never smaller than 14px */
body { font-size: clamp(14px, 1.5vw, 16px); }
```

### Viewport Meta Tag

Every HTML page must include in `<head>`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
```
Do NOT use `user-scalable=no` — this breaks accessibility.

### Print Styles

Add a basic print stylesheet in `main.css`:
```css
@media print {
  .sidebar, .topbar, .filter-bar, .pagination, .btn-danger { display: none; }
  .main-content { padding: 0; }
  body { background: white; color: black; }
}
```

---

## FRONTEND PAGE SPECS

### `index.html` + `dashboard.js`
- Load `/api/items/summary` on page load
- Show 4 stat cards: Total Items, Low Stock, Out of Stock, Expired
- Show a "Recent Items" table — last 8 items updated, pulled from `/api/items?sort=updated_at&order=desc&limit=8`
- Show a "Needs Attention" section — items with status `low` or `out`, max 5 shown
- Each item row has a quick "Edit" link and a "Mark Restocked" button (sets quantity to min_quantity + 5 via PUT)
- Show a "Shopping List" summary widget — all items with status `low` or `out`, displayed as a simple checklist the user can mentally use on their next grocery run

### `inventory.html` + `inventory.js`
- Search bar (live filter as user types — debounced 300ms)
- Filter dropdowns: Category, Status, Location — collapse into "Filters ▾" panel on mobile
- Sort controls: Name, Quantity, Updated (asc/desc toggle)
- Display as a table on desktop/tablet, card layout on mobile — use `renderItems()` with resize listener as defined in the Responsive Design System section above
- Each row/card: name, category badge, quantity + unit, min_quantity, status badge, location, last updated, Edit button, Delete button (with confirm dialog)
- Mobile cards support swipe-left to reveal Delete, long-press for context menu
- Delete must call `DELETE /api/items/:id` and remove the row/card from the DOM on success
- Pagination: 20 items per page — full page numbers on desktop, Prev/Next on mobile

### `add-item.html` + `add-item.js`
- Full form: name*, category (dropdown from API), quantity*, unit, min_quantity, location, purchase_date, expiry_date, purchase_price, description, notes
- Layout: two-column form grid on desktop/tablet, single column on mobile — as defined in Responsive Design System
- All inputs: min 44px height, 16px font-size minimum (prevents iOS auto-zoom)
- Client-side validation before submit:
  - Name: required, max 200 chars
  - Quantity: required, must be integer ≥ 0
  - Min quantity: must be integer ≥ 0
  - Purchase price: if set, must be positive number
  - Expiry date: if set, show a warning (not error) if in the past
- Show field-level error messages inline (below each input)
- On success: show a green toast notification and redirect to `inventory.html` after 1.5s
- On API error: show the error message from the response body

### `edit-item.html` + `edit-item.js`
- On load: read `?id=` from query string, fetch `/api/items/:id`, pre-populate all form fields
- If no ID or item not found, redirect to `inventory.html`
- Same validation as add-item
- Show a "Delete this item" button at the bottom (danger style) with confirmation
- On success: toast + redirect to `inventory.html`

### `recommendations.html` + `recommendations.js`
- Page header: "AI Recommendations" with subtext "Powered by Claude"
- A "Generate Recommendations" button — calls `POST /api/recommendations`
- Show a loading state while waiting (spinner + "Analyzing your inventory…" text)
- Render recommendations as cards grouped by priority: HIGH first, then MEDIUM, then LOW
- Each card: priority badge (colored), item name, action label, reason text
- Show metadata footer: "X recommendations generated from Y items · [timestamp]"
- If inventory is empty: show an empty state with a link to add items
- If API key is not set: show a friendly error with a link to the setup guide

---

## AUTHENTICATION FLOW

Implement a simple session-based auth flow with these rules:

1. If the user visits any page and has no valid session, redirect to a `login.html` page
2. `login.html` has two tabs: Login and Register
3. On register: create account, clone default categories (where `user_id IS NULL`) for the new user, auto-login
4. On login: validate, set session, redirect to `index.html`
5. Show the logged-in username in the sidebar footer with a Logout button
6. Logout clears the session and redirects to `login.html`

Implement session check in `js/api.js`: every API call checks for a `401` response and redirects to `login.html` automatically.

---

## `js/config.js` — ENVIRONMENT SWITCHING

```javascript
// config.js — swap API_BASE for local development vs production
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const config = {
  API_BASE: isDev
    ? 'http://localhost:3000'
    : 'https://YOUR_RENDER_APP_NAME.onrender.com',  // ← replaced during deployment
};

export default config;
```

---

## `js/api.js` — CENTRALIZED API LAYER

Build a complete API module with these exported functions. Every function must:
- Use `fetch()` with credentials: `'include'` (for session cookies)
- Handle non-OK responses by throwing an error with the response body's `error` field
- Auto-redirect to `login.html` on 401

```javascript
// Items
export async function getItems(params = {}) { ... }
export async function getItem(id) { ... }
export async function createItem(data) { ... }
export async function updateItem(id, data) { ... }
export async function deleteItem(id) { ... }
export async function getItemsSummary() { ... }

// Categories
export async function getCategories() { ... }
export async function createCategory(data) { ... }
export async function updateCategory(id, data) { ... }
export async function deleteCategory(id) { ... }

// Auth
export async function login(username, password) { ... }
export async function register(username, password) { ... }
export async function logout() { ... }
export async function getMe() { ... }

// Recommendations
export async function getRecommendations() { ... }
```

---

## `backend/.env.example`

```
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/freezery
SESSION_SECRET=replace_with_a_long_random_string
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=development
```

---

## ERROR HANDLING REQUIREMENTS

Every user-facing error must be handled gracefully. Implement these patterns:

**Frontend:**
- Network errors: show "Connection failed. Check your network." toast
- 400 errors: show the field-level error from the API response
- 401 errors: redirect to login silently
- 404 errors: show "Item not found" and a Back link
- 500 errors: show "Something went wrong on the server. Try again." toast
- Toast system: implement a reusable `showToast(message, type)` function in `api.js` (type: 'success' | 'error' | 'warning')

**Backend:**
- Wrap all controller logic in try/catch
- Never expose raw stack traces in production (`NODE_ENV=production`)
- Validate all user input before DB queries
- Use parameterized queries everywhere (never string interpolation in SQL)

---

## README.md — GENERATE THIS COMPLETELY

The README must include these sections, fully written:

1. **Project Overview** — what Freezery is and does
2. **Tech Stack** — table of technologies with rationale
3. **Features** — bulleted list of all features including the AI feature
4. **Live Demo Links** — placeholders for GitHub Pages URL and Render URL
5. **Local Setup** — step-by-step from scratch:
   - Prerequisites (Node 18+, PostgreSQL)
   - Clone the repo
   - Backend setup (install deps, create `.env`, run schema.sql, start server)
   - Frontend setup (how to serve locally with Live Server or `npx serve`)
6. **Deployment Guide** — full step-by-step for GitHub Pages (frontend) and Render (backend) — see manual guides below
7. **API Reference** — all endpoints, methods, expected request bodies, response shapes
8. **AI Feature** — explanation of how the recommendations engine works
9. **AI Usage Disclosure** — honest summary of how AI tools were used in this project (Claude Code, Claude API)
10. **What I Built Without AI** — placeholder section describing the no-AI work

---

## AFTER GENERATING ALL FILES

1. Run `npm install` inside `backend/` if not already done
2. Verify `backend/server.js` starts without errors: `cd backend && node server.js` — fix any errors before proceeding
3. Confirm all frontend files exist in `frontend/` with no empty stubs
4. Output a final checklist of every **[MANUAL STEP]** the developer must complete, numbered and in order, referencing the guide section in the master prompt document

---

---

# ═══════════════════════════════════════════
# END OF CLAUDE CODE PROMPT
# ═══════════════════════════════════════════

---

---

# 📋 MANUAL STEP GUIDES
## (Do these yourself — Cursor cannot do them for you)

---

## GUIDE 1 — Get Your Anthropic API Key

**Why:** The AI recommendations feature calls the Claude API. Without a key, that feature won't work.

**Steps:**

1. Go to **https://console.anthropic.com** and sign in (create a free account if you don't have one).
2. Click **"API Keys"** in the left sidebar.
3. Click **"Create Key"**, give it a name like `freezery-dev`, and copy the key immediately — you won't see it again.
4. Open `backend/.env` and paste it as:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```
5. **Never commit `.env` to GitHub.** Confirm `.env` is in your `.gitignore` before pushing.
6. When deploying to Render (Guide 4), you'll add this key as an environment variable in the Render dashboard — not in the code.

**Free tier limits:** Anthropic's free tier allows a limited number of API calls. The app uses `claude-haiku-4-5-20251001` which is the cheapest model. For a demo, you'll have plenty of headroom.

---

## GUIDE 2 — Set Up PostgreSQL Locally

**Why:** The backend needs a running PostgreSQL database to store your inventory data.

**Steps:**

1. **Install PostgreSQL:**
   - Mac: `brew install postgresql@15 && brew services start postgresql@15`
   - Windows: Download from https://www.postgresql.org/download/windows/ — use the installer, keep the default port (5432), set a password for user `postgres`.
   - Linux (Ubuntu): `sudo apt install postgresql && sudo systemctl start postgresql`

2. **Create the database:**
   ```bash
   psql -U postgres
   CREATE DATABASE freezery;
   CREATE USER freezery_user WITH PASSWORD 'yourpassword';
   GRANT ALL PRIVILEGES ON DATABASE freezery TO freezery_user;
   \q
   ```

3. **Run the schema:**
   ```bash
   psql -U freezery_user -d freezery -f backend/schema.sql
   ```

4. **Update your `.env`:**
   ```
   DATABASE_URL=postgresql://freezery_user:yourpassword@localhost:5432/freezery
   ```

5. **Verify it worked:**
   ```bash
   psql -U freezery_user -d freezery -c "\dt"
   ```
   You should see `users`, `categories`, and `items` tables listed.

---

## GUIDE 3 — Deploy Frontend to GitHub Pages

**Why:** The challenge requires a separately deployed frontend. GitHub Pages is free and perfect for static HTML/CSS/JS.

**Steps:**

1. **Create a GitHub repository** at https://github.com/new
   - Name it `freezery` (or similar)
   - Set it to Public
   - Do NOT initialize with a README (you already have one)

2. **Push your code:**
   ```bash
   cd freezery
   git init
   git add .
   git commit -m "Initial commit — Freezery full project"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/freezery.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to your repo on GitHub → **Settings** → **Pages**
   - Under "Source", select **"Deploy from a branch"**
   - Branch: `main`, Folder: `/frontend`
   - Click **Save**

4. **Wait ~2 minutes**, then visit:
   `https://YOUR_USERNAME.github.io/freezery/`

5. **Update `js/config.js`** with your Render backend URL once it's deployed (Guide 4), then push again:
   ```bash
   git add frontend/js/config.js
   git commit -m "Set production API URL"
   git push
   ```

6. **Confirm CORS:** Your backend's CORS config must allow `https://YOUR_USERNAME.github.io`. Cursor will have generated this — just confirm it in `server.js`.

---

## GUIDE 4 — Deploy Backend to Render

**Why:** The backend (Node.js/Express + DB connection) needs a server environment. Render's free tier is sufficient.

**Steps:**

1. **Sign up at https://render.com** (use your GitHub account for easy linking).

2. **Create a PostgreSQL database on Render:**
   - Dashboard → **New** → **PostgreSQL**
   - Name: `freezery-db`, Region: pick the closest to you
   - Plan: **Free**
   - Click **Create Database**
   - Copy the **"Internal Database URL"** — you'll need it next.

3. **Run your schema on Render's DB:**
   - In the Render DB dashboard, click **"Connect"** → copy the **"PSQL Command"**
   - Run it in your terminal, then pipe your schema:
   ```bash
   psql "postgresql://..." -f backend/schema.sql
   ```

4. **Create a Web Service on Render:**
   - Dashboard → **New** → **Web Service**
   - Connect your GitHub repo
   - Settings:
     - **Name:** `freezery-api`
     - **Root Directory:** `backend`
     - **Runtime:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `node server.js`
     - **Plan:** Free

5. **Add Environment Variables** (in the Render dashboard under your service → Environment):
   ```
   DATABASE_URL      → [paste Internal Database URL from step 2]
   SESSION_SECRET    → [generate: run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` locally]
   ANTHROPIC_API_KEY → [your key from Guide 1]
   NODE_ENV          → production
   ```

6. **Deploy:** Render auto-deploys on every push to `main`. Your backend URL will be:
   `https://freezery-api.onrender.com`

7. **Update `frontend/js/config.js`** with this URL and push to GitHub (it will auto-redeploy GitHub Pages too).

> ⚠️ **Render free tier note:** The free tier spins down after 15 minutes of inactivity. The first request after spin-down takes ~30 seconds. This is fine for a demo — just open the backend URL in a browser tab first to wake it up before your presentation.

---

## GUIDE 5 — Test the Full Stack End-to-End

Run through this checklist before submitting:

```
[ ] Backend running locally on port 3000
[ ] Frontend served locally (Live Server or npx serve frontend/)
[ ] Register a new account — redirects to dashboard
[ ] Add 5+ items across different categories
[ ] Verify items appear in inventory with correct status badges
[ ] Test search — filters results as you type
[ ] Test filter by category and status
[ ] Test sort by name and quantity
[ ] Edit an item — changes persist after refresh
[ ] Delete an item — removed from list
[ ] Visit AI Recommendations — click Generate
[ ] Recommendations appear with priorities and reasons
[ ] Log out — redirected to login
[ ] Log back in — inventory still there
[ ] Test on mobile screen width — sidebar collapses, cards layout works
[ ] GitHub Pages URL loads correctly
[ ] Render backend URL responds to GET /api/auth/me with 401 (correct)
[ ] CORS works: frontend on GitHub Pages can call Render backend
```

---

## GUIDE 6 — Record Your Demo Video

**The challenge requires a short demo video.** Here's what to show:

1. Open the live GitHub Pages URL in a browser
2. Register a new account (live, not mocked)
3. Add 3-4 items with different statuses
4. Show the dashboard stat cards updating
5. Demonstrate search + filter in the inventory view
6. Edit one item, delete one item
7. Open AI Recommendations → click Generate → walk through the output
8. Briefly explain: "The app sends my live inventory to Claude, which analyzes stock levels and expiry dates to give actionable suggestions."

**Recording tools:** Loom (free, instant shareable link), OBS, or macOS screen record (Cmd+Shift+5).

Keep the video under 5 minutes.

---

## GUIDE 7 — Fill In Your AI Usage Disclosure

The challenge requires you to document your AI tool usage honestly. After building, fill in the README's "AI Usage Disclosure" section with:

- **Claude Code:** Used to scaffold the entire project structure, generate all backend routes, frontend pages, schema, middleware, and configuration files. Reviewed all generated code and ran verification steps. Corrected errors flagged during the build session.
- **Claude API (Anthropic):** Used as the AI backend for the recommendations feature. Prompt engineering was done manually to get structured JSON output.
- **What I changed/rejected:** [Write 2-3 specific examples — e.g., "Claude Code generated a generic error handler; I modified it to include field-level validation messages that match the frontend's error display format."]
- **What I built without AI:** [Fill this in during the no-AI evaluation session]

---

*Generated for Web Development Challenge — Freezery Grocery Inventory Tracker*
*Stack: HTML/CSS/JS + Node.js/Express + PostgreSQL + Claude API*
*Deployment: GitHub Pages (frontend) + Render (backend + DB)*
