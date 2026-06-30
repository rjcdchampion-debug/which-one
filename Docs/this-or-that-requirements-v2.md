# This or That — Product Requirements Document

**Version:** 0.2  
**Status:** Active development  
**Last updated:** June 2026

---

## 1. Overview

This or That is a mobile-first social voting app that lets users upload 2–4 photos of a decision they need help with, then get votes from the public and/or AI. Posts have a countdown timer and disappear when voting closes, creating urgency and a natural content cycle.

The app is built and deployed. Frontend on Netlify, backend on Railway, database on Supabase.

**Live URL:** https://singular-donut-6bb8c8.netlify.app

---

## 2. Core concepts

| Term | Definition |
|---|---|
| Post | A user-created decision containing 2–4 photos, a question, a category, and a mode |
| Mode | Either Real-time (free, timer options: 1 min / 15 min / 30 min / 1 hour) or 12-hour (Plus only or £0.99 one-off) |
| Vote | A single selection by a human or AI on one option within a post |
| AI verdict | A paid feature — AI analyses the uploaded photos and returns a recommendation with reasoning. Plus users get this automatically, free users can unlock for £0.99 per post |
| Expert vote | A vote + written opinion from a verified domain expert (Phase 2) |
| Boost | A one-off in-app purchase applied to a specific live post |

---

## 3. User roles

### 3.1 Guest
- Can view posts shared via direct link — no login required
- Can cast a single vote tracked via localStorage (no account needed)
- After voting sees subtle banner: "Enjoying This or That? Post your own decision — it's free"
- Prompted to register after voting

### 3.2 Registered user (free)
- Can create real-time posts (unlimited) with timer options: 1 min or 15 min
- Can vote on all posts in the feed
- Posts disappear from their For You feed after voting
- Basic vote counts and percentages on own posts
- No AI verdict strip on posts
- In My Posts tab sees upgrade prompt: "✨ Want AI insight on this decision? Unlock for £0.99 or upgrade to Plus"

### 3.3 Plus user (£4.99/month or £0.99 one-off per feature)
- All free features
- Can create 12-hour posts
- Real-time timer options: 1 min, 15 min, 30 min, 1 hour
- AI verdict on all posts (Anthropic API with vision)
- Demographic breakdowns on own posts
- No ads (when ads introduced)

### 3.4 Pro user (£12.99/month)
- All Plus features
- Unlimited boosts
- Shareable results card (image export)
- Analytics dashboard
- Business/brand profile badge
- API access (Phase 2)

### 3.5 Expert (verified, Phase 2)
- Domain-verified account (e.g. fashion stylist, interior designer)
- Receives posts routed to their category
- Paid per verified opinion left on a post
- Categories: fashion, food, home, design, beauty

---

## 4. Post creation flow

3-step flow. Steps completed in order.

### Step 1 — Choose mode

**Options:**
- Real-time — free. Timer pill selector: 1 min | 15 min | 30 min (Plus) | 1 hour (Plus)
- 12-hour — Plus only or £0.99 one-off. Shows upgrade prompt for free users.

Default: Real-time, 15 min selected.

### Step 2 — Select category

- Fashion | Food | Home | Design | Beauty | Other
- Required before proceeding
- Used to route post to relevant voters and contextualise AI verdict

### Step 3 — Upload photos and post

- 2–4 photos (minimum 2 required)
- Multi-select supported — photos auto-populate Option A/B/C/D slots in order
- Each photo max 10MB, JPEG/PNG/HEIC
- Question field (max 120 chars, auto-prompted by category)
- Two buttons at bottom:
  - **"Post · Start now"** — free, posts immediately, no AI
  - **"✨ Get AI verdict · £0.99"** — mock payment, posts with AI verdict enabled

---

## 5. Modes

### 5.1 Real-time mode

| Property | Value |
|---|---|
| Duration | User selected: 1 min, 15 min (free) / 30 min, 1 hour (Plus or £0.99) |
| Cost | Free for 1 min and 15 min |
| Feed placement | Live strip at top of For You and Live tabs |
| AI verdict | Plus users: automatic. Free users: £0.99 unlock |

**Timer behaviour:**
- Countdown ring on post card
- Last 10 seconds: ring pulses red, number scales up progressively each second
- At 0: thumbs up icon appears in dial, dial fills gold #854F0B, winning option gets gold border and Winner badge
- Holds for 3 seconds then card fades out over 2 seconds
- Next post slides up from below over 0.4 seconds

### 5.2 12-hour mode

| Property | Value |
|---|---|
| Duration | 12 hours |
| Cost | £0.99 one-off or included in Plus/Pro |
| Feed placement | Main feed, sorted by vote count |
| AI verdict | Plus users: automatic. Free users: £0.99 unlock in My Posts |

---

## 6. Feed

### 6.1 Tab structure

| Tab | Content | Landing? |
|---|---|---|
| For You | Personalised feed of unseen posts. Posts disappear after voting. | Yes — default landing tab |
| Live | All active posts (real-time and 12-hour) sorted by time remaining. Posts do NOT disappear after voting here. | No |
| My Votes | Every post the user has ever voted on, stored permanently. Shows stat: "X polls decided · You agree with the majority Y% of the time" | No |
| My Posts | Posts created by the logged-in user. Results, winner, vote counts. Upgrade prompt for AI verdict. | No |

### 6.2 Category filter

Horizontally scrollable pill bar below tabs:
**All · Fashion · Food · Home · Design · Beauty**

Filters the active tab. Live strip also filters by selected category. If no live posts in selected category, Live strip is hidden.

### 6.3 Live strip

- Horizontal scrollable strip of active real-time posts pinned above the feed
- Each card shows a single photo rotating through all options (A/B/C/D) every 3.5 seconds with 0.8 second fade
- A/B/C/D pill in corner updates to match currently showing photo
- Countdown timer ring on each card
- Expired cards fade out over 0.8 seconds, remaining cards slide left to fill
- Appears on For You and Live tabs

### 6.4 For You feed behaviour

- Shows only posts the logged-in user has NOT voted on
- After voting: option highlights, bars animate in (1 second), pause 3 seconds, "Vote logged — thanks from [username]" fades in over 1 second, card fades out over 2 seconds, next card slides up over 0.4 seconds
- Empty state: "You're all caught up! Check back soon for new decisions" + Browse Live button
- Guest users: posts don't disappear, show banner after voting prompting registration

### 6.5 Live feed behaviour

- Shows all active posts sorted by time remaining (least first)
- Posts stay after voting — user watches live results update via Supabase realtime
- Posts removed with expiry animation when timer reaches 0
- Expiry animation: thumbs up in dial, winner badge on photo, holds 3 seconds, fades out 2 seconds, next post slides up 0.4 seconds
- Multiple simultaneous expiries queued — one animation at a time

### 6.6 Post card — active state

- User avatar, username, category badge, time posted, vote count
- Question text
- 2–4 photo grid with "or" pill:
  - 2 photos: pill centred between the two
  - 3–4 photos: pill positioned in dead centre of 2x2 grid like a crosshair
- Vote bars and percentages visible after voting
- Timer ring (real-time) or text label "Xh left" (12-hour)
- AI verdict strip (Plus posts only): "AI voted Option A · [reason]"
- Action row: comment count · share button (Share2 icon + "Share" label)
- Share uses native Web Share API on mobile, copies link on desktop
- Share message: "[question] — vote now on This or That! 👇" with URL separate

### 6.7 Post card — closed state

- Voting disabled
- Winner highlighted with coloured border and Winner badge
- Final vote counts and percentages shown
- Share result button active

---

## 7. AI verdict system

### 7.1 Who gets AI verdict

- **Plus/Pro users:** AI verdict fires automatically on every post they create
- **Free users:** AI verdict available for £0.99 per post, unlocked via:
  - "✨ Get AI verdict · £0.99" button on Step 3 of post creation
  - Upgrade prompt in My Posts tab on their own posts
- **No AI strip shown** on free posts without purchase — no placeholder, no "pending" message

### 7.2 Implementation

- Backend calls Anthropic API (claude-sonnet-4-6) with vision enabled
- Sends all option photo URLs as images
- Prompt: "Look at these photos and pick the stronger option for someone asking: [question]. Category: [category]. Give a confident single recommendation and one short sentence reason. Format as JSON: { recommendation: 'Option A', reason: 'your reason here' }"
- Result stored in ai_verdicts table
- Displayed as purple strip below photos: "AI voted Option A · [reason]"
- ANTHROPIC_API_KEY set in Railway environment variables
- Graceful fallback if API unavailable

### 7.3 AI verdict display rule

AI strip only shows when:
- Post creator is Plus or Pro user, OR
- Post has ai_verdict_paid = true (free user paid £0.99)
AND a record exists in ai_verdicts table for that post

---

## 8. Seed data system

- Backend maintains minimum 30 active seed posts at all times
- Structure: 3 active 12-hour posts + 3 active real-time posts per category = 30 total
- Seed posts use realistic usernames (sophie.styles, homewithmark, foodie_dan etc)
- Photos from Unsplash source API by category
- No duplicate images or questions
- When a seed post expires it is automatically replaced in the same category
- Check runs every 20 minutes — if any category has fewer than 3 active posts of either type, new ones are created
- Seed posts rotate across 4 seed user accounts

---

## 9. Sharing

- Share button on every post card (Share2 icon + "Share" label)
- On mobile: native Web Share API with message "[question] — vote now on This or That! 👇" and URL separate
- On desktop: copies full message + URL to clipboard, shows "Link copied!" tooltip for 2 seconds
- Open Graph meta tags on post detail pages:
  - og:title — post question
  - og:description — "Vote now on This or That and help decide!"
  - og:image — first option photo URL
  - og:url — full post URL
  - twitter:card — summary_large_image
- Share count tracked in shares column on posts table

---

## 10. Pricing and monetisation

### Subscription tiers

| Feature | Free | Plus £4.99/mo | Pro £12.99/mo |
|---|---|---|---|
| Real-time posts (1 min, 15 min) | ✅ | ✅ | ✅ |
| Real-time posts (30 min, 1 hour) | ❌ | ✅ | ✅ |
| 12-hour posts | ❌ | ✅ | ✅ |
| AI verdict on posts | ❌ | ✅ | ✅ |
| Demographic breakdown | ❌ | ✅ | ✅ |
| No ads | ❌ | ✅ | ✅ |
| Unlimited boosts | ❌ | ❌ | ✅ |
| Shareable results card | ❌ | ❌ | ✅ |
| Analytics dashboard | ❌ | ❌ | ✅ |
| Brand profile badge | ❌ | ❌ | ✅ |

### One-off purchases (£0.99 each)

All one-off features cost £0.99 with no subscription required:

| Purchase | Trigger |
|---|---|
| AI verdict on single post | Step 3 of post creation or My Posts tab |
| Extended timer (30 min) | Step 1 — tapping 30 min timer as free user |
| Extended timer (1 hour) | Step 1 — tapping 1 hour timer as free user |
| 12-hour post | Step 1 — selecting 12-hour mode as free user |
| Extend timer +15 min | On live post nearing expiry |
| Demographic breakdown | My Posts on own post |
| Trending boost | On any active post |

### Upgrade counter
After 3 one-off purchases in a month show prompt: "You've spent £2.97 on boosts this month — get everything with Plus for just £4.99"

### Payment (v1 — mock)
All payments currently simulated. Real Stripe integration (Apple Pay / Google Pay) to be added in next phase.

---

## 11. Comments (planned)

Comments are not yet built. Current state shows "Be the first to comment — coming soon" with speech bubble icon.

**Planned architecture:**
- Comments are a considered activity, not part of the fast voting flow
- In For You: no comments visible — vote and move on
- In My Votes: tap any voted post to see full results and comments thread
- In My Posts: see comments on own posts
- Comments visible on post detail page (accessible from Live tab and shared links)

---

## 12. Post confirmation and sharing (planned — next session)

After posting, show a confirmation screen:
- "Your decision is live! You have X minutes to get votes" with live countdown
- Preview of the post
- Two prominent buttons: Share with friends (native share sheet) + Copy link
- Urgency messaging drives immediate sharing

---

## 13. Live tab — real-time vs 12-hour split (planned)

Current issue: 12-hour posts get buried below urgent real-time posts and may never be seen.

Planned solution (to be designed):
- Option A: Split Live into two sections — Deciding Now (real-time) and Open Decisions (12-hour)
- Option B: Two sub-tabs within Live — Real-time | 12-hour
- Option C: Weighted ranking combining urgency + engagement + recency

Decision pending.

---

## 14. Data model

### User
`id`, `username`, `avatar_url`, `plan` (free/plus/pro), `last_seen`, `created_at`

### Post
`id`, `user_id`, `mode` (realtime/twelve_hour), `category`, `question`, `status` (active/closed), `expires_at`, `shares`, `ai_verdict_paid` (boolean), `created_at`

### Option
`id`, `post_id`, `label`, `photo_url`, `vote_count`, `display_order`

### Vote
`id`, `post_id`, `option_id`, `voter_id` (nullable), `voter_type` (human/ai), `created_at`

### AIVerdict
`id`, `post_id`, `recommendation_option_id`, `reason`, `confidence`, `created_at`

### Purchase
`id`, `user_id`, `post_id` (nullable), `product_type`, `amount_pence`, `status`, `created_at`

---

## 15. Tech stack (deployed)

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | Supabase (Postgres + realtime) |
| File storage | Supabase Storage (bucket: post-images) |
| Auth | Supabase Auth (email/password) |
| AI | Anthropic API (claude-sonnet-4-6, vision) |
| Frontend hosting | Netlify |
| Backend hosting | Railway |
| Icons | Lucide React |
| Brand colour | Purple #534AB7 · Coral #993C1D · Teal #0F6E56 |

---

## 16. Known issues (as of June 2026)

| Issue | Priority | Status |
|---|---|---|
| Live strip — expired cards not fading out and sliding left | High | In progress |
| Live feed — post expiry animation clunky, caused regressions | High | Reverted, needs clean fix |
| iOS Safari display bug — content above viewport | Medium | Not yet fixed |
| Option A blank on some posts (browser only, works on mobile) | Medium | Investigating |
| Plan not saving correctly when user simulates upgrade | Medium | In progress |
| AI verdict not displaying despite records in ai_verdicts table | Medium | In progress |
| 12-hour posts buried below real-time in Live tab | Low | Planned |

---

## 17. Out of scope for v1

- Native mobile app (React Native)
- Expert user system
- Brand/sponsored polls
- Trend data licensing
- Real Stripe payments (currently mocked)
- Push notifications
- Direct messaging
- Followers/friends system
- Comments posting (display only planned)

---

*End of document — Version 0.2*
