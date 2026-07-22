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
- **Option ordering is not guaranteed by the DB — sort by label, don't trust fetch order.** The `options` table has no `display_order` column in the live schema (despite older docs implying one) and no query selecting options had an `ORDER BY`. Postgres doesn't guarantee scan order for an un-ordered `SELECT` — a row's physical position can shift after an `UPDATE` (e.g. every `vote_count` increment), so the same post's options could come back in a different order across requests. Since every "Option A"/"Option B" label is assigned deterministically at creation time (seed posts and `CreatePostScreen` both use `Option ${String.fromCharCode(65+i)}`), sorting by `label` after fetch restores the correct order regardless of DB fetch order. Fixed in `backend/src/routes/posts.js` (`sortOptions`, used in `enrichPosts`) and `backend/src/routes/votes.js` (`sortOptions`, used in `/mine` and the vote-response refetch) — both places that hand an `options` array to the frontend now sort it first. Also fixed a second instance of the same bug class in the AI verdict route (`posts.js`): it picked the recommended option by array index derived from the letter Claude replied with (`options[idx]`) instead of matching on `label`, so it could attribute the verdict to the wrong photo. `LiveCard.jsx` also sorts defensively client-side as a last line of defense (e.g. for the `mockData.js` offline-dev fallback, which doesn't go through the backend). This was the root cause of the mobile live-strip "images displaying incorrectly" bug — most visible with few posts per category (small seed floor) since the same post's photos get seen repeatedly, making any order flip obvious.

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
- **Mobile strip cycling is now synchronized across cards.** `LiveCard.jsx` used to run its own independent `setInterval(3500ms)` per card to cycle between option photos; since cards mount at slightly different moments, they drifted out of phase and flipped independently, reading as "busy." Fixed by moving the interval up to `FeedScreen.jsx` (`liveCycleTick`, one shared tick incremented every 3500ms) and passed down as a `cycleTick` prop — every `LiveCard` derives its `targetIdx` from the same tick (`cycleTick % options.length`), so all cards flip on the same beat regardless of individual option counts or mount time. Each card still does its own 800ms crossfade (fade out → swap → fade in) triggered by the shared tick changing, so the visual transition is unchanged, just synchronized.
- **The A/B option-letter chip no longer fades with the photo.** It originally shared the same `visible` opacity toggle as the `<img>`, so every ~3.5s photo cycle also blinked the corner badge out and back in — reported as the card's "text flashing/reloading." The badge doesn't need to animate at all, only the letter needs to change, so it now renders with no opacity transition and just swaps silently in sync with `activeIdx` at the moment the photo finishes swapping. The photo itself still crossfades as before — only the chip's own fade was removed.
- **Checked for remount-on-realtime-update — ruled out.** The Supabase `postgres_changes` handler for `options` (vote_count updates) in `FeedScreen.jsx` updates state via `setPosts(prev => prev.map(...))`, preserving the `post.id` React key and only patching `vote_count` in place — it doesn't replace/reorder the array or change component identity, so `LiveCard`/`TimerRing` don't remount from realtime updates (confirmed by tracing the handler, not just assumed). The full-skeleton swap (`loading` state hiding the whole feed, including the live strip) only happens on tab switches / `loadFeed()`, not from realtime events, so that's expected behavior, not a bug.
- **`TimerRing.jsx` colour transition smoothed.** The purple→amber→coral colour swap used to be a hard cutoff at exactly 5min/2min remaining, which could look like a sudden flash since it re-renders every second. Replaced with `getColor()`, which linearly interpolates RGB across a small band (±20s) around each threshold, plus bumped the ring's `stroke` CSS transition from 0.3s to 1s so the per-second colour updates blend continuously instead of stepping. Still used by `HeroBanner` (desktop Featured) and `PostCard`'s vote sheet — see below for why `LiveCard` no longer uses it at all.
- **`LiveCard.jsx` no longer uses `TimerRing`.** The ring + digital readout was too busy for a 160×240px card already showing a photo, an option-letter chip, and gradient text — reported as "messy." Replaced with plain colour text (white, coral `#FF8B69` under 2 minutes) matching desktop's `DecisionPairCard`, which never had a ring and wasn't a problem. Sits in the bottom bar next to the vote count instead of overlapping the photo corner. Note the coral used here is a lighter tint than the brand hex (`#993C1D`) — it needs to read against a dark photo scrim, not a white card.
- **Strip expiry is now idempotent regardless of remounts.** `handleStripExpire` (fades → collapses → marks closed when a strip card's timer hits zero) used to rely solely on each `LiveCard`'s local `hasFiredRef` to fire once — no parent-level backstop, unlike the main feed's equivalent flow which pairs its own local guard with `processedPostIdsRef` at the `FeedScreen` level. Added `processedStripIdsRef`, mirroring `processedPostIdsRef`, so `handleStripExpire` is now a no-op for a `postId` it's already processed — still a real gap worth closing, but turned out **not** to be the cause of the reported flashing (that was the A/B chip fade above, misdiagnosed at first). If several strip posts ever do expire in close succession, their fade→collapse→close animations still aren't queued/paced the way the main feed's are (`expiryQueueRef`/`startNextExpiry`, "one at a time") — each fires independently and immediately, which could still look like rapid churn at the front of the strip. Not fixed this session since it turned out to be a separate issue from what was reported; worth doing if that specific batch-expiry scenario comes up again.

### Desktop layout (≥768px)
- Single breakpoint, `useIsDesktop()` (matchMedia on `768px`), used wherever mobile and desktop need genuinely different component trees (nav chrome, modal shape). Pure spacing/sizing differences use Tailwind `md:` classes instead.
- Below 768px nothing changed — same markup, same classes, same behavior as before this work. `BottomNav` still owns mobile nav; `DesktopTopNav` takes over at 768px and up.
- `FeedScreen.jsx` branches on `useIsDesktop()` for layout only. All data fetching, vote/expiry state machines, and realtime subscriptions are shared — desktop and mobile read from the same `posts`/`mainPosts`/`realtimePosts` values, just render them differently. Don't fork the data logic if you touch this again.
- Desktop's live strip has no post cap (`realtimePostsSorted` unsliced); mobile keeps the original top-3 cap (`.slice(0, 3)`) — deliberate, don't unify these. Strip has left/right scroll-arrow buttons (`DesktopLiveStrip`) that show/hide based on scroll position, in addition to native drag/wheel scrolling.
- `DesktopLiveStrip` (Featured + Live Now together) is fed by `stripPosts` in `FeedScreen.jsx`, a separate pool from `realtimePosts` — all active realtime posts system-wide, sorted by urgency, deliberately **not** run through `filterByCat` or the For You `hasVoted` exclusion. `realtimePosts` is scoped to the viewer's category filter and hides posts they've already voted on, so it can legitimately hit zero (a single category between seed-cycle top-ups, or an active voter who's cleared their filtered pool) — that emptiness used to propagate straight into `DesktopLiveStrip`'s `if (posts.length === 0) return null`, making Featured and Live Now vanish together even though other categories/unvoted posts were still live. The strip is a discovery surface, not the personalized feed, so it now always reflects the full live pool and only goes empty when there are truly zero active realtime posts anywhere (the seed system's per-category floor of 3 makes that a 15-post system-wide minimum in steady state). `realtimePosts` itself is untouched — still used for the mobile strip, the For You feed's dedupe-from-strip logic, and the sidebar's "Deciding right now" count.
- Hero banner (`DesktopLiveStrip`'s `HeroBanner`): both option photos shown with an "or" divider pill and A/B badges, 7.5s dwell time per decision before it rotates.
- Sidebar content is real, not placeholder: `categoryVotes` (CategorySidebar) and the My Votes stats (MyVotesSidebar) are computed client-side from actual vote counts / vote history already in state. The demographics widget is intentionally still "Coming soon" — there's no age/location field anywhere in the schema, and adding one is a deliberate future decision (privacy/consent implications), not a quick add.
- **CategorySidebar's Categories panel redesigned as an icon grid, pinned to a fixed height for cross-column alignment.** The old version was a plain vertical list of full-width rows (no card chrome) — with 9 categories now (see Categories below) it read as long and sparse, especially the "All" pill stretching the full 240px sidebar width with mostly empty space. Replaced with a 2-column grid of icon+label chips (icons reuse `CreatePostScreen`'s `CATEGORIES` emoji — yet another spot kept in sync manually, same as `CATEGORY_COLOURS`), wrapped in the same white-card style as the other sidebar widgets. The panel is also pinned to a literal `height: 248` (`CATEGORIES_PANEL_HEIGHT` in `CategorySidebar.jsx`) with an enlarged 60px gap below it (`GAP_TO_LIVE_STATS`) instead of the default 20px flex gap, so its bottom edge lines up with the bottom of the Featured hero image and the Live stats card's top edge lines up with the top of the Live Now photos — deliberate visual pairing between the sidebar and the two sections of the main column. Both numbers are derived from `DesktopLiveStrip.jsx`'s actual markup (hero's literal `height: 220` plus label/spacing), not measured in a live browser — cross-referenced with a comment in both files so a future change to the hero height doesn't silently break the alignment.
- The hero "Featured" slot is gated exactly like AI verdict: `posts.featured_paid` (migration `005_featured_paid.sql`, set via `POST /api/posts/:id/feature`), free for Plus/Pro, £0.99 one-off otherwise. Purchasable two ways: from "My Posts" on an already-published realtime post, or at creation time in `CreatePostScreen` Step 3 ("Include Featured placement · +£0.99", realtime posts only — button is hidden for 12-hour posts since they're never eligible for the hero slot). `DesktopLiveStrip` filters the live pool for `featured_paid` posts first; if none exist yet, it falls back to auto-picking from the live pool so the section is never empty — those auto-picked posts render the plain coral "Deciding right now" badge instead of the purple "Featured decision" one, so it's never ambiguous which posts actually paid.
- **`005_featured_paid.sql` has been run against the live Supabase project** — `featured_paid` exists as a column and the purchase buttons work.
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
- `seed-posts.js` maintains ≥48 active posts: 3 realtime + 3 twelve_hour per category (8 categories = 48 total, since Travel/Sport/Pets were added — see Categories below).
- Runs via `setInterval` in `index.js`, cadence controlled by `SEED_JOB_INTERVAL_MS` (default 30 min — see "Background job cadence" under Deployments for why this changed from the original 5 min).
- Photos pulled from LoremFlickr (`loremflickr.com/400/400/{keyword}?lock=n`), deterministic per lock value. (This briefly got swapped to Picsum during the desktop-layout work — Picsum is more reliable but not category-relevant, so it was reverted.)
- **Seed photo/question coherence:** `CATEGORY_QUESTIONS` used to be a flat list of questions per category, paired with 2 random photos from one generic per-category LoremFlickr pool (e.g. all "food" posts drew from the same 30-photo "food" tag) — the photo pick and question pick were fully decoupled, so a post like "Sushi or ramen tonight?" could just as easily show two random salad/cake photos. Fixed this session with a lighter-weight approach: each question in `CATEGORY_QUESTIONS` now carries its own `keywords: [optionAKeyword, optionBKeyword]`, so e.g. "Sushi or ramen tonight?" pulls one photo from a `sushi` pool and one from a `ramen` pool. Falls back to the same keyword for both options when a question has no distinct second visual subject (e.g. "Which logo direction?" → `['logo','logo']`), still picking 2 distinct photos from that one pool rather than risking a duplicate. `FALLBACK_KEYWORDS` (was `LOREMFLICKR_KEYWORDS`) is now only used when a category has no curated question pool at all.
- **AI-generated seed photos (`Docs/ai-seed-content-pilot.md`) — considered, not executed.** That plan is the better long-term fix (genuinely coherent, purpose-generated photo pairs) but needs an image-gen API key (Imagen 4 Fast or GPT Image 1 Mini) that hasn't been provided yet. The keyword-pairing fix above is the interim improvement; revisit the AI pilot once a provider/key decision is made.
- **Seed content was being attributed to real registered users, not just bot accounts — fixed.** `ensureSeedStructure()` used to fetch seed authors via `supabase.from('users').select(...).limit(10)` with no filter at all — it just grabbed whatever rows existed in `users` and round-robinned through all of them (`nextUser()`) as the credited author of auto-generated posts. The live DB has exactly 4 dedicated bot accounts for this purpose (`stylestar`, `foodie_uk`, `interior.xyz`, `glowup.daily` — all using placeholder UUIDs `00000000-0000-0000-0000-000000000001` through `004`, all created in the same initial seed insert), but once real users signed up (`rossc`, `mthep`, `ross2`, `rosstest`) they entered the same unfiltered pool and started being credited as the "author" of generated seed posts — which then showed up in that real user's own **My Posts** tab as content they never created (discovered via live QA: a real account showed "50 posts" in My Posts against "0 posts" on its own Profile page). Fixed by filtering to only the placeholder-UUID pattern (`SEED_BOT_ID_PATTERN = /^00000000-0000-0000-0000-\d{12}$/`) before building the rotation pool, so real accounts — present or future — can never be swept into seed authorship again. Note: this only stops the bug going forward; posts already misattributed to real accounts before this fix are still sitting in the DB with the real user's `user_id` and need a separate one-off data cleanup (not yet done).

### Categories
- Categories: `fashion`, `food`, `home`, `design`, `beauty`, `travel`, `sport`, `pets`, plus `other` (post-creation only, no live-feed filter pill for it). Travel/Sport/Pets added this session, end to end:
  - `frontend/src/lib/feedConfig.js` (`CAT_FILTERS`) — feed filter pills.
  - `backend/src/seed-posts.js` (`FALLBACK_KEYWORDS`, `CATEGORY_QUESTIONS`, the `categories` array in `ensureSeedStructure`, `verdictReasons`).
  - `frontend/src/screens/CreatePostScreen.jsx` (`CATEGORIES`, `QUESTION_PLACEHOLDERS`) — so users can actually pick the new categories when posting.
  - `CATEGORY_COLOURS` — duplicated in three places (`PostCard.jsx`, `desktop/CategorySidebar.jsx`, `desktop/MyVotesSidebar.jsx`, all kept in sync manually, no shared constant): Travel `#B8860B` (amber), Sport `#2F7D4F` (forest green), Pets `#B5495B` (rose). Chosen to sit alongside the existing set (Fashion purple `#534AB7`, Food teal `#0F6E56`, Home blue `#185FA5`, Design black `#1A1A1A`, Beauty coral/rust `#993C1D`) without hue-clashing.
  - `posts.category` is **not** free text — it has a DB-level `CHECK` constraint (`001_initial.sql`) restricting values to the original 6. Migration `006_add_travel_sport_pets_categories.sql` extends the constraint to include `travel`/`sport`/`pets`.
  - **`006_add_travel_sport_pets_categories.sql` has been run against the live Supabase project** — `travel`/`sport`/`pets` are now valid `posts.category` values end to end (seed cron, `CreatePostScreen`, all category surfaces).

### Post creation
- **Mobile camera fast-path (`CreatePostScreen.jsx`, `PhotoSlot`).** Each of the 4 photo slots has two hidden file inputs, not one: the original plain `<input type="file">` (opens the OS picker sheet — camera or library, user's choice) and a second `capture="environment"` input triggered by a small camera-icon button in the slot's top-right corner, which skips the picker and jumps straight to the camera. The icon is `md:hidden` — desktop file inputs can't open a camera at all (`capture` is a no-op there), so the icon only renders below 768px, and desktop keeps the single plain upload button. Both inputs call the same `onFileChange` handler, so there's no divergent upload/compression logic between the two paths.

---

## Data model (Supabase)

### posts
`id, user_id, mode (realtime|twelve_hour), category, question, status (active|closed), expires_at, share_count, ai_verdict_paid, featured_paid, created_at`

### options
`id, post_id, label, photo_url, vote_count, created_at`

Note: this used to be documented as ending in `display_order`, but no migration ever actually added that column — the live schema (`001_initial.sql`) has no ordering column at all. See "Option ordering" under Voting above for why that matters and how it's handled (sort by `label` after fetch, not a DB column).

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
- **Correction (checked directly against the live Railway account):** despite the table above, no Railway `staging` environment actually exists — the project has exactly one environment (`production`) and one service, and every recent deployment is from `main`. Either the staging environment described here was never provisioned or was removed at some point. Revisit whether to actually build it or just drop it from these docs.

### Background job cadence (Railway cost)
- `backend/src/index.js`'s two background jobs (`expirePostsJob`, `seedPostsJob`) are the service's only regular outbound traffic. Railway's Serverless/sleep-on-idle feature only sleeps a service after 10+ minutes with zero outbound traffic — at the original cadence (expiry check every 60s, seed job every 5min) the service could never accumulate a 10-minute quiet gap, so it would run (and bill) continuously regardless of real traffic.
- Both intervals are now env-configurable: `EXPIRY_CHECK_INTERVAL_MS` (default 15 min, was 60s) and `SEED_JOB_INTERVAL_MS` (default 30 min, was 5 min). This is a pre-launch cost measure — the account is on Railway's Hobby plan ($5/mo) and this lets Serverless actually engage between pings instead of never sleeping.
- Not a UX regression: the user-visible countdown/expiry behavior (cards fading out, timers hitting zero) is driven client-side (`FeedScreen`'s 1s interval — see "For You feed mechanics" and "Live strip" above), not by this backend job. The backend job is a safety-net cleanup pass a few minutes behind, not something a user is watching in real time.
- Tighten both back up via Railway env vars (no code change needed) once real user traffic justifies faster cleanup/reseeding — e.g. `EXPIRY_CHECK_INTERVAL_MS=60000`, `SEED_JOB_INTERVAL_MS=300000` to restore the original cadence.

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
