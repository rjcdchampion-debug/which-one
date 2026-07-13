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
│       │   ├── BottomNav.jsx     # Tab bar (Home/Create/Profile) — mobile only, hidden ≥768px
│       │   ├── LiveCard.jsx      # Single cycling-photo live card — mobile strip only
│       │   ├── PaymentModal.jsx  # Mock £0.99 payment sheet (bottom sheet on mobile, centered dialog ≥768px)
│       │   └── desktop/                  # Desktop-only chrome, rendered when useIsDesktop() is true
│       │       ├── DesktopTopNav.jsx     # Replaces BottomNav ≥768px — logo left, tabs + Post/bell/avatar right
│       │       ├── CategorySidebar.jsx   # Left column on For You/Live/My Posts: categories, live stats, votes-by-category, demographics (Plus, "coming soon"), upgrade nudge
│       │       ├── MyVotesSidebar.jsx    # Left column on My Votes: personal stats, votes by category, "most in sync with the crowd" ranking — all computed client-side from myVotes, nothing fabricated
│       │       └── DesktopLiveStrip.jsx  # Hero banner (rotating paired photos) + horizontally scrolling strip of DecisionPairCard (paired photos + "or" divider, unlike mobile's single-photo LiveCard)
│       ├── screens/
│       │   ├── FeedScreen.jsx         # Feed with 4 tabs + live strip; branches on useIsDesktop() for chrome/layout only — data/vote/expiry logic is shared between mobile and desktop, not duplicated
│       │   ├── CreatePostScreen.jsx   # 3-step post creation (mobile layout only — desktop not yet built, see Desktop layout notes)
│       │   ├── PostDetailScreen.jsx   # Full post + AI deep-dive (mobile layout only)
│       │   ├── ProfileScreen.jsx      # User profile + post grid (mobile layout only)
│       │   ├── PricingScreen.jsx      # Plan tiers + mock upgrade (mobile layout only)
│       │   ├── LoginScreen.jsx
│       │   ├── RegisterScreen.jsx
│       │   └── SetupUsernameScreen.jsx
│       ├── contexts/
│       │   └── AuthContext.jsx   # Supabase auth + profile fetch
│       ├── hooks/
│       │   ├── usePlan.js       # Plan tier from DB + localStorage override
│       │   ├── useVoter.js      # Guest voter ID + vote localStorage cache
│       │   ├── useIsDesktop.js  # matchMedia('(min-width: 768px)') hook — the one source of truth for the desktop breakpoint
│       │   └── usePurchases.js
│       └── lib/
│           ├── api.js          # All backend API calls
│           ├── supabase.js     # Supabase client + image upload
│           ├── utils.js        # uuid()
│           ├── feedConfig.js   # TABS and CAT_FILTERS — shared by FeedScreen, DesktopTopNav, CategorySidebar
│           └── mockData.js     # Fallback seed posts for offline dev
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
│   ├── this-or-that-requirements-v2.md   # Full PRD
│   ├── desktop-layout-build-spec.md      # Desktop layout implementation spec
│   └── ai-seed-content-pilot.md          # Scoped pilot: AI-generated seed photos, food category first
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

### For You feed mechanics
- Posts sorted by `expires_at` ascending (most urgent first).
- After voting: results animate in → 4s hold → "Vote logged — thanks from [username]" overlay fades in → card fades out and collapses (posts below slide up).
- Works for both authenticated and guest users — `isForYou={tab === 'foryou'}` (no `&&user` guard).
- When a post closes (timer expires): detected by 1-second client-side interval → card fades out and collapses via `collapsingPostIds` (same animation as voted posts).
- `processedPostIdsRef` guards against processing the same expiry twice.

### Live strip
- Tapping a live strip card opens an inline bottom sheet (no navigation) with the full PostCard.
- User votes in the sheet → same "Vote logged" animation as For You → sheet fades out and closes (800ms fade).
- Tapping the dark overlay dismisses the sheet without voting.
- Underlying feed remains mounted and visible behind the overlay.

### Desktop layout (≥768px)
- Single breakpoint, `useIsDesktop()` (matchMedia on `768px`), used wherever mobile and desktop need genuinely different component trees (nav chrome, modal shape). Pure spacing/sizing differences use Tailwind `md:` classes instead.
- Below 768px nothing changed — same markup, same classes, same behavior as before this work. `BottomNav` still owns mobile nav; `DesktopTopNav` takes over at 768px and up.
- `FeedScreen.jsx` branches on `useIsDesktop()` for layout only. All data fetching, vote/expiry state machines, and realtime subscriptions are shared — desktop and mobile read from the same `posts`/`mainPosts`/`realtimePosts` values, just render them differently. Don't fork the data logic if you touch this again.
- Desktop's live strip has no post cap (`realtimePostsSorted` unsliced); mobile keeps the original top-3 cap (`.slice(0, 3)`) — deliberate, don't unify these. Strip has left/right scroll-arrow buttons (`DesktopLiveStrip`) that show/hide based on scroll position, in addition to native drag/wheel scrolling.
- `DesktopLiveStrip` (Featured + Live Now together) is fed by `stripPosts` in `FeedScreen.jsx`, a separate pool from `realtimePosts` — all active realtime posts system-wide, sorted by urgency, deliberately **not** run through `filterByCat` or the For You `hasVoted` exclusion. `realtimePosts` is scoped to the viewer's category filter and hides posts they've already voted on, so it can legitimately hit zero (a single category between seed-cycle top-ups, or an active voter who's cleared their filtered pool) — that emptiness used to propagate straight into `DesktopLiveStrip`'s `if (posts.length === 0) return null`, making Featured and Live Now vanish together even though other categories/unvoted posts were still live. The strip is a discovery surface, not the personalized feed, so it now always reflects the full live pool and only goes empty when there are truly zero active realtime posts anywhere (the seed system's per-category floor of 3 makes that a 15-post system-wide minimum in steady state). `realtimePosts` itself is untouched — still used for the mobile strip, the For You feed's dedupe-from-strip logic, and the sidebar's "Deciding right now" count.
- Hero banner (`DesktopLiveStrip`'s `HeroBanner`): both option photos shown with an "or" divider pill and A/B badges, 7.5s dwell time per decision before it rotates.
- Sidebar content is real, not placeholder: `categoryVotes` (CategorySidebar) and the My Votes stats (MyVotesSidebar) are computed client-side from actual vote counts / vote history already in state. The demographics widget is intentionally still "Coming soon" — there's no age/location field anywhere in the schema, and adding one is a deliberate future decision (privacy/consent implications), not a quick add.
- The hero "Featured" slot is gated exactly like AI verdict: `posts.featured_paid` (migration `005_featured_paid.sql`, set via `POST /api/posts/:id/feature`), free for Plus/Pro, £0.99 one-off otherwise. Purchasable two ways: from "My Posts" on an already-published realtime post, or at creation time in `CreatePostScreen` Step 3 ("Include Featured placement · +£0.99", realtime posts only — button is hidden for 12-hour posts since they're never eligible for the hero slot). `DesktopLiveStrip` filters the live pool for `featured_paid` posts first; if none exist yet, it falls back to auto-picking from the live pool so the section is never empty — those auto-picked posts render the plain coral "Deciding right now" badge instead of the purple "Featured decision" one, so it's never ambiguous which posts actually paid.
- **`005_featured_paid.sql` still needs to be run against the live Supabase project** (dashboard SQL editor or CLI) — it was never applied through this tooling, only saved to the repo. Until it runs, `featured_paid` doesn't exist as a column and the purchase buttons will fail on click (everything else degrades gracefully to the auto-pick fallback).
- My Posts has a status filter above the post list (`MineStatusFilter` in `FeedScreen.jsx`) — All / Live / Completed pills with real counts from the loaded posts, same visual pattern as the category pills. Resets to "All" on tab change like `catFilter` does.
- Scope is the feed surface only: top nav, live strip, category sidebar, My Votes sidebar, main feed, and the modals it opens (`PaymentModal`, live-strip vote sheet, boost prompt). `CreatePostScreen`'s Featured button is the one exception that reaches outside the feed surface. `PostDetailScreen`, `ProfileScreen`, `PricingScreen`, and the auth screens still render their mobile `max-w-app` column at every width — not yet extended to desktop.
- See `Docs/desktop-layout-build-spec.md` for the original build spec and rationale.

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
- Photos pulled from LoremFlickr (`loremflickr.com/400/400/{keyword}?lock=n`) by category keyword, deterministic per lock value. (This briefly got swapped to Picsum during the desktop-layout work — Picsum is more reliable but not category-relevant, so it was reverted. See `Docs/ai-seed-content-pilot.md` for the actual planned fix: AI-generated, category-coherent seed photos, piloted on the food category first.)

---

## Data model (Supabase)

### posts
`id, user_id, mode (realtime|twelve_hour), category, question, status (active|closed), expires_at, share_count, ai_verdict_paid, featured_paid, created_at`

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

## Deployments

| Environment | Branch | Frontend | Backend | Database |
|---|---|---|---|---|
| Production | `main` | Netlify (live URL above) | Railway | Supabase (live project) |
| Staging | `develop` | Netlify branch deploy — `develop--singular-donut-6bb8c8.netlify.app` | Railway `staging` environment | **Same Supabase project as production** (deliberate — no separate staging DB) |

- Push to `develop` (not `main`) to test changes before they go live — Netlify branch deploys and the Railway `staging` environment both auto-deploy on push, same as production does for `main`.
- Staging intentionally shares the production Supabase database. There is no data isolation between the two — a seed post or test vote created on staging is real data in the same tables production reads from. This was a deliberate simplicity-over-isolation tradeoff, not an oversight; revisit if staging ever needs to run destructive/schema-changing tests.
- Staging env vars mirror production (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` / `VITE_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`) except:
  - Railway `staging` → `FRONTEND_URL` points at the Netlify `develop` branch URL (CORS)
  - Netlify `develop` branch context → `VITE_API_BASE_URL` points at the Railway `staging` backend URL
- No branch protection on `main` — merges/pushes go straight through, staging is a manual "test before you push to main" step, not an enforced gate.

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

## Known issues (as of July 2026)

| Issue | Priority |
|---|---|
| iOS Safari display bug — content above viewport | Medium |
| Option A photo blank on some posts (browser-only) | Medium |
| Plan not persisting correctly after simulated upgrade | Medium |
| AI verdict strip not displaying despite DB records existing | Medium |

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
| Featured placement (desktop hero) | ❌ | ✅ | ✅ | ✅ |
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
