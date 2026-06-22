# This or That

A mobile-first social voting app. Upload 2–4 photos, set a timer, get instant votes.

## Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + React Router |
| Backend  | Node.js + Express |
| Database | Supabase (Postgres + Auth + Storage) |
| Realtime | Supabase Realtime subscriptions |

---

## Quick start

### 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration:
   ```
   supabase/migrations/001_initial.sql
   ```
   Paste it into **SQL Editor → New query → Run** in the Supabase dashboard.
3. Create a storage bucket:
   - Dashboard → Storage → New bucket
   - Name: `post-images`
   - Public: **✓**
   - Max file size: 10 MB
   - Allowed MIME types: `image/jpeg, image/png, image/heic, image/heif, image/webp`

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev        # starts on http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev        # starts on http://localhost:5173
```

> **No Supabase? No problem.** The frontend falls back to mock data when
> environment variables are missing, so you can explore the UI straight away.

---

## Environment variables

### `frontend/.env`
| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key |
| `VITE_API_BASE_URL` | Express backend URL (default: `/api` via Vite proxy) |

### `backend/.env`
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `PORT` | Port to listen on (default: 4000) |
| `FRONTEND_URL` | Allowed CORS origin |

---

## App structure

```
this-or-that/
├── frontend/
│   └── src/
│       ├── components/   PostCard, TimerRing, PaymentModal, BottomNav
│       ├── screens/      Feed, PostDetail, CreatePost, Profile, Login, Register
│       ├── contexts/     AuthContext
│       ├── hooks/        useVoter, usePurchases
│       └── lib/          supabase.js, api.js, mockData.js
└── backend/
    └── src/
        ├── routes/       posts, votes, users
        ├── middleware/   auth
        └── index.js      Express app + expiry job
```

---

## Key behaviours

| Behaviour | Detail |
|-----------|--------|
| Timer | Starts on post creation, not first vote |
| Real-time | 15 min; circular countdown ring (purple → amber → red) |
| 12-hour | Text label "Xh left" |
| Expiry job | Runs every 60 s, sets `status = closed` |
| AI vote | Immediate for real-time; after 5 min with no votes for 12-hour |
| AI threshold | AI vote removed from tally once 50 human votes reached |
| Guest voting | Session ID stored in `localStorage` |
| Payments | Mock modal — "Simulate purchase" unlocks feature for session |
| Realtime | Supabase subscription updates vote counts live |

---

## Suggestions for v2

- **Real payments** via Stripe Checkout (replace `simulatePurchase`)
- **Real AI verdicts** via Anthropic API (`claude-sonnet-4-6`) — replace mock insights with structured output
- **Demographic breakdown** — collect optional age/location on signup and aggregate per post
- **Push notifications** — remind post owner when timer nears expiry
- **Comment posting** — the UI placeholder is already in place
- **Image compression** — resize/compress on upload with `browser-image-compression`
- **CDN** — serve `post-images` bucket through a CDN for faster loads
