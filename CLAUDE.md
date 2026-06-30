# This or That — CLAUDE.md

## Project overview

This or That is a mobile-first social voting app. Users upload 2–4 photos of a real-life decision (e.g. which outfit, which dish) and get public votes. Posts have countdown timers and disappear when voting closes.

**Live URL:** https://singular-donut-6bb8c8.netlify.app

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + Tailwind CSS — deployed on Netlify |
| Backend | Node.js + Express — deployed on Railway |
| Database | Supabase (Postgres + realtime + Storage) |
| Auth | Supabase email/password |
| AI | Anthropic API `claude-sonnet-4-6` with vision |
| Icons | Lucide React |
| Brand colour | Purple `#534AB7` · Coral `#993C1D` · Teal `#0F6E56` |

---

## Project layout

```
this-or-that/
├── frontend/               # React + Vite app
│   └── src/
│       ├── App.jsx         # Routing, auth guard, loading state
│       ├── main.jsx        # Entry point, AuthProvider wrapper
│       ├── index.css       # Tailwind + global keyframes
│       ├── components/
│       │   ├── PostCard.jsx      # Core voting card + all state
│       │   ├── TimerRing.jsx     # Countdown SVG ring
│       │   ├── BottomNav.jsx     # Tab bar (Home/Create/Profile)
│       │   └── PaymentModal.jsx  # Mock £0.99 payment sheet
│       ├── screens/
│       │   ├── FeedScreen.jsx         # Feed with 4 tabs + live strip
│       │   ├── CreatePostScreen.jsx   # 3-step post creation
│       │   ├── PostDetailScreen.jsx   # Full post + AI deep-dive
│       │   ├── ProfileScreen.jsx      # User profile + post grid
│       │   ├── PricingScreen.jsx      # Plan tiers + mock upgrade
│       │   ├── LoginScreen.jsx
│       │   ├── RegisterScreen.jsx
│       │   └── SetupUsernameScreen.jsx
│       ├── contexts/
│       │   └── AuthContext.jsx   # Supabase auth + profile fetch
│       ├── hooks/
│       │   ├── usePlan.js    # Plan tier from DB + localStorage override
│       │   ├── useVoter.js   # Guest voter ID + vote localStorage cache
│       │   └── usePurchases.js
│       └── lib/
│           ├── api.js        # All backend API calls
│           ├── supabase.js   # Supabase client + image upload
│           ├── utils.js      # uuid()
│           └── mockData.js   # Fallback seed posts for offline dev
├── backend/
│   └── src/
│       ├── index.js              # Express server, CORS, background jobs
│       ├── supabaseClient.js     # Supabase service-role client
│       ├── seed-posts.js         # Auto seed: 30 posts minimum
│       ├── middleware/
│       │   └── auth.js           # JWT decode (no external lib)
│       └── routes/
│           ├── posts.js    # CRUD + AI verdict + share count
│           ├── votes.js    # Cast vote + my-votes history
│           ├── users.js    # Profile create/get + plan upgrade
│           └── seed.js     # Seed trigger endpoint
├── Docs/
│   └── this-or-that-requirements-v2.md   # Full PRD
└── netlify.toml
```

---

## Key architecture notes

### Auth flow
- Supabase auth session lives in `AuthContext`. The JWT token from `session.access_token` is passed as `Bearer` header to all protected backend routes.
- The backend auth middleware decodes the JWT manually (no external library) — it only validates the `sub` and `exp` claims.
- Profile is fetched from the `users` table separately from Supabase Auth. If the users row doesn't exist, `profileMissing = true` → redirect to `/setup-username`.

### Plan system
- User's `plan` field is in the `users` DB table (`free` / `plus` / `pro`).
- `usePlan.js` merges DB plan with a `localStorage` override (`this_or_that_plan_override`) — the override is set after a simulated upgrade so the UI updates immediately.
- `isPlus` is true for both `plus` and `pro`.

### Voting
- Votes are **optimistic** — UI updates immediately on tap, then syncs to backend.
- Guest voters use a localStorage UUID (`this_or_that_voter_id`).
- `useVoter.js` caches voted post IDs in localStorage (`voted_<postId>` key).
- Duplicate vote protection: backend checks for existing vote row and returns 409.

### AI verdict
- Backend route: `POST /api/posts/:id/ai-verdict`
- Calls Anthropic API with vision — sends all option photo URLs as images.
- Result stored in `ai_verdicts` table.
- AI also casts a vote (voter_type = 'ai') which is excluded from human percentage calculations.
- AI strip only shows on the card when: creator is Plus/Pro **or** `post.ai_verdict_paid = true`.
- After 50 human votes the AI vote is automatically removed.

### Feed tabs
| Tab | API call | Notes |
|---|---|---|
| For You | `GET /api/posts?tab=foryou` | Active posts; voted posts hidden (localStorage) |
| Live | `GET /api/posts?tab=live` | Realtime posts only, sorted by `expires_at` ASC |
| My Votes | `GET /api/votes/mine` | Returns enriched voted posts + stats |
| My Posts | `GET /api/posts?tab=mine` | Auth required; all statuses |

### Realtime
- Supabase realtime subscriptions in `FeedScreen` listen on `options` (vote_count updates), `posts` (status changes), and `ai_verdicts` (new verdicts).
- Live strip cards have independent countdown timers — fire `onExpire` when `expires_at` passes.
- Post expiry animations are queued (one at a time) via `expiryQueueRef`.

### Seed system
- `seed-posts.js` maintains ≥30 active posts: 3 realtime + 3 twelve_hour per category (5 categories = 30 total).
- Runs every 5 minutes via `setInterval` in `index.js`.
- Photos pulled from Unsplash (`source.unsplash.com/...`) by category keyword.

---

## Data model (Supabase)

### posts
`id, user_id, mode (realtime|twelve_hour), category, question, status (active|closed), expires_at, share_count, ai_verdict_paid, created_at`

### options
`id, post_id, label, photo_url, vote_count, display_order`

### votes
`id, post_id, option_id, voter_id, voter_type (human|ai), created_at`

### ai_verdicts
`id, post_id, recommendation_option_id, confidence, insights (jsonb), sources (jsonb), created_at`

### users
`id, username, avatar_url, plan (free|plus|pro), last_seen, created_at`

---

## Environment variables

### Frontend (Netlify / `.env.local`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=    # e.g. https://your-railway-app.up.railway.app (empty = use Vite proxy)
```

### Backend (Railway / `.env`)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
FRONTEND_URL=    # e.g. https://singular-donut-6bb8c8.netlify.app
PORT=4000
```

---

## Running locally

```bash
# Backend
cd backend && npm install && npm run dev   # nodemon, port 4000

# Frontend
cd frontend && npm install && npm run dev  # Vite, port 5173
```

Vite proxy (`vite.config.js`) forwards `/api/*` to `http://localhost:4000` when `VITE_API_BASE_URL` is not set.

---

## Known issues (as of June 2026)

| Issue | Priority |
|---|---|
| Live strip — expired cards not fading out and sliding left consistently | High |
| iOS Safari display bug — content above viewport | Medium |
| Option A photo blank on some posts (browser-only) | Medium |
| Plan not persisting correctly after simulated upgrade | Medium |
| AI verdict strip not displaying despite DB records existing | Medium |
| 12-hour posts buried below real-time posts in Live tab | Low |

---

## Payments (v1 — mocked)

All purchases are simulated — no real Stripe/Apple Pay. The UI flow is complete:
- `PaymentModal` shows price and "Confirm purchase" button
- `usePlan.recordBoost()` increments monthly boost counter in localStorage
- After 3 boosts, `showBoostPrompt = true` → upgrade nudge modal
- Real Stripe integration is a future phase

---

## Feature gates

| Feature | Free | Plus | Pro | One-off (£0.99) |
|---|---|---|---|---|
| Realtime post (1 min, 15 min) | ✅ | ✅ | ✅ | — |
| Realtime post (30 min, 1 hr) | ❌ | ✅ | ✅ | ✅ |
| 12-hour post | ❌ | ✅ | ✅ | ✅ |
| AI verdict | ❌ | ✅ | ✅ | ✅ |
| Demographic breakdown | ❌ | ✅ | ✅ | — |
| Unlimited boosts | ❌ | ❌ | ✅ | — |
| Analytics dashboard | ❌ | ❌ | ✅ | — |

---

## Not yet built (planned)

- Comments (placeholder "coming soon" shown)
- Post-creation confirmation screen with countdown + share prompt
- Live tab split: "Deciding Now" (realtime) vs "Open Decisions" (12-hour)
- Open Graph meta tags on post detail pages
- Real Stripe payments
- Demographic breakdown UI
- Expert voter system (Phase 2)
