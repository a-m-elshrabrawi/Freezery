# Freezery

A grocery inventory tracker that works out what you are running low on, and uses an LLM to
turn that into a shopping list with reasons attached.

**Status** Shipped, no longer under active development
**Built** April 2026
**Live** [Frontend](https://a-m-elshabrawi.github.io/Freezery/)

## Why this exists

I kept buying things I already had and running out of things I thought I had. The
underlying problem is not storage, it is that "am I low on rice" requires remembering a
number you never wrote down. So the app stores the number, and then computes the answer
instead of asking you to.

The AI layer came second, and for a specific reason. A list of low items is a fact, not
advice. Knowing that you have one box of pasta left and that the yoghurt expires Thursday
is only useful once someone turns it into "buy pasta, eat the yoghurt first". That
translation is the part I wanted to automate.

## What it does

Add items with quantity, unit, location, expiry, price and notes. Adjust quantities from
the list without opening a form. Search, filter by category or status, sort by any column.
The dashboard shows totals and a needs-attention list with a restock action. Ask for
recommendations and get one prioritised suggestion per item, each citing your actual
numbers and dates.

## Stack and rationale

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript | No build step, so GitHub Pages deploys on push. The UI is forms and a table; a framework would have been ceremony |
| Backend | Node and Express | Small surface area, direct `pg` access, no ORM sitting between me and the SQL |
| Database | PostgreSQL | I wanted foreign keys and triggers doing real work, not a document store I would have to validate by hand |
| AI | Groq, `llama-3.3-70b-versatile` | Fast enough that recommendations feel synchronous, and a large enough model to follow a strict JSON contract |
| Auth | JWT plus express-session with connect-pg-simple | JWT because mobile Safari blocks third-party cookies and the frontend is on a different origin to the API. Sessions kept as a fallback |
| Hosting | GitHub Pages and Render | Both free. The split origin is a direct consequence, and it is what forced the JWT decision above |

## Design decisions

1. **Item status is computed in Postgres, not in Node.** A `BEFORE INSERT OR UPDATE`
   trigger sets `status` on every write. Putting it in the application would have meant
   every code path that touches quantity has to remember to recompute, and one of them
   eventually would not.

2. **Status precedence is out, then expired, then low, then ok.** Zero quantity wins over
   an expiry date, because an item you do not have cannot spoil. This is arguable and I
   would defend it, but it is a choice rather than an obvious truth.

3. **Auth accepts either a Bearer token or a session cookie.** Same middleware, two paths.
   This exists because mobile Safari's cookie policy broke the session-only version on the
   deployed split-origin setup, and I would rather carry two mechanisms than tell people to
   change browsers.

4. **Categories are cloned per user at registration rather than shared.** Eleven defaults
   are copied into the new account. It duplicates rows, but it means a user can rename or
   delete a category without touching anyone else's.

5. **The model is given the inventory and told to use exact values.** The prompt forbids
   approximation and specifically forbids the generic reason "quantity below minimum
   quantity". Vague advice is worse than no advice, because it is still a card the user
   has to read.

## How the recommendations work

In `backend/controllers/recommendationsController.js`:

1. Check a module-level `Map` for a cached result for this user, less than five minutes
   old. If present, return it and stop.
2. Query the user's items, joined to category names, ordered by status then expiry with
   nulls last. If there are no items, return an empty array without calling the model.
3. Build a prompt containing today's date, the priority rules, the required JSON shape, and
   the full inventory serialised as JSON.
4. Call Groq with `max_tokens: 2048` and no streaming.
5. `JSON.parse` the response inside a `try`. On a parse failure, return an empty
   recommendations array rather than an error.
6. Deduplicate by `item_id` using a `Set`, keeping the first occurrence, because the model
   sometimes returns the same item twice despite being told not to.
7. Cache the result and return it.

Steps 5 and 6 exist because the model is not reliable. Step 5 fails soft, step 6 cleans up
after it.

## Data model

Three tables. `users`, `categories` and `items`, with `items` carrying the interesting
constraints.

`items.status` is `VARCHAR(20)` with a `CHECK` limiting it to `ok`, `low`, `out` or
`expired`, and is set by the `compute_item_status()` trigger on insert and update. A second
trigger keeps `updated_at` current. `category_id` is `ON DELETE SET NULL` so deleting a
category orphans items rather than destroying them, while `user_id` is `ON DELETE CASCADE`
because a deleted user's inventory is meaningless.

## API reference

All protected routes accept either a `Bearer <token>` header (JWT) or a session cookie. The
JWT is returned by login and register and is stored in `localStorage`.

Auth (`/api/auth`):

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account, returns `{ user, token }` |
| POST | `/api/auth/login` | Login, returns `{ user, token }` |
| POST | `/api/auth/logout` | Destroy session, clear client token |
| GET | `/api/auth/me` | Current user (auth required) |

Items (`/api/items`), protected:

| Method | Path | Description |
|---|---|---|
| GET | `/api/items` | List items. Supports `?search=&category=&status=&sort=&order=&limit=&offset=` |
| GET | `/api/items/summary` | Dashboard counts (total, low, out, expired) |
| GET | `/api/items/:id` | Single item |
| POST | `/api/items` | Create item |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Delete item |

Categories (`/api/categories`), protected:

| Method | Path | Description |
|---|---|---|
| GET | `/api/categories` | List the user's categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

Recommendations (`/api/recommendations`), protected:

| Method | Path | Description |
|---|---|---|
| POST | `/api/recommendations` | Generate AI recommendations, cached 5 minutes per user |

## What this is and is not

It is a working multi-user application. Registration, login, per-user data isolation and
the AI recommendations all function against a real Postgres database.

It is not production infrastructure and should not be treated as such. Account isolation
is enforced in application queries rather than by the database, and the account lifecycle
is incomplete: there is no email verification and no password reset. Run your own instance
rather than relying on the hosted one.

## Known limitations

**The recommendation cache is in-process.** A module-level `Map` keyed by user id, five
minute TTL, with no eviction. It works on one Render instance. A second instance would give
users inconsistent results depending on which one they hit, and the map grows for the life
of the process. Redis is the fix and it was not worth it for this.

**Expiry status is only correct after a write.** The trigger runs on insert and update, so
an item that quietly passes its expiry date while nobody touches it keeps its old status
until something writes the row. The dashboard undercounts expired items. A scheduled job or
a computed view would fix this properly.

**Free tier cold starts.** Render spins the service down after 15 minutes idle. The first
request afterwards takes around 30 seconds and often surfaces in the browser as a CORS
error rather than a timeout, which is misleading. Pinging `/health` every 10 minutes with an
external cron keeps it warm.

**A malformed model response returns nothing, silently.** The `catch` sets recommendations
to an empty array. The user sees no suggestions and no explanation. It should distinguish
"you have nothing to recommend" from "the model returned something I could not read".

## Running it locally

Requires Node 18+ and PostgreSQL 14+.

```bash
git clone https://github.com/a-m-elshabrawi/Freezery.git
cd Freezery/backend
cp .env.example .env
npm install
```

Create the database and apply the schema:

```bash
psql -U postgres -c "CREATE DATABASE freezery;"
psql -U postgres -d freezery -f schema.sql
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | Signs session cookies |
| `JWT_SECRET` | Signs tokens. Must differ from the session secret |
| `GROQ_API_KEY` | Recommendations. Without it that endpoint returns 503 |
| `FRONTEND_URL` | CORS origin |

Then `node server.js`, which prints `Freezery API running on port 3000`. Serve the frontend
separately with `npx serve docs/` and point `docs/js/config.js` at your API.

## Deploying

Frontend to GitHub Pages from the `/docs` folder on `main`. Backend to Render as a web
service with root directory `backend`, build `npm install`, start `node server.js`. Create
the Render Postgres instance first and run `schema.sql` against it.

Read the cold start note under limitations before you assume something is broken.

## AI usage disclosure

Claude Code was used throughout development to implement features, fix bugs and refactor,
including the auth layer, the recommendations engine, inventory CRUD and the responsive UI.
All generated code was reviewed before use.

Separately, the shipped product calls the Groq API at runtime using
`llama-3.3-70b-versatile` to generate the recommendations described above.

## Licence

MIT.
