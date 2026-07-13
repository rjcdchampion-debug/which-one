# Desktop layout — build spec

Read `CLAUDE.md` in the project root first. This spec assumes that context.

## Goal

Add a responsive desktop layout to This or That that activates at `≥768px` viewport width, as an additive layer on top of the existing mobile-first app. Below 768px, nothing changes — same components, same markup paths, same behavior, pixel-identical to what ships today.

This is not a new app, a new route tree, or a redesign. Same React tree, same data hooks (`useAuth`, `useVoter`, `usePlan`), same `lib/api.js` calls, same Supabase realtime subscriptions. Desktop just gets different chrome and layout around the same functional core.

## Non-negotiables

- Nothing below 768px changes. Not spacing, not markup order, not class names that affect mobile rendering. If a shared component needs a desktop variant, add new conditional branches/classes — don't restructure the mobile path to "make room" for desktop.
- No new CSS approach. Stay in Tailwind utility classes, same as the rest of the app. Extend `tailwind.config.js` (colors, radii, breakpoints, max-widths) rather than writing new CSS files or inline styles for layout.
- Reuse `PostCard.jsx` — don't fork it into a separate `DesktopPostCard`. It already doesn't hardcode width (parent constrains it), so it should mostly work unchanged inside a wider container. Only touch it if the image grid or timer ring genuinely need desktop-specific treatment.
- Auth, voting, realtime, plan-gating logic is unchanged. This is a presentational/layout task only.

## Reference mockup

The approved visual direction is the desktop mockup already shown in this conversation: sticky top nav (logo, tab links, Post button, bell, avatar) → rotating "deciding right now" hero banner → horizontal live-strip of paired-photo decision cards → two-column body (left category/stats sidebar + main feed). Brand colors, spacing, and card treatment in that mockup should carry through directly: purple `#534AB7` primary, coral `#993C1D`, teal `#0F6E56`, hairline `0.5px` borders, `12px` card radius, flat surfaces (no drop shadows, no gradients on real UI — the mockup's flat color tiles were photo placeholders only; real posts use actual `photo_url` images).

## Scope for this phase

In scope — the same surfaces called out in the original brief: feed (`FeedScreen.jsx`), top bar, bottom nav replacement, live strip, category pills.

Out of scope for this phase: `CreatePostScreen`, `PostDetailScreen`, `ProfileScreen`, `PricingScreen`, `LoginScreen`, `RegisterScreen`, `SetupUsernameScreen`. These keep rendering in their current centered `max-w-app` mobile column at all viewport widths for now — don't touch them. Flag before starting if you think any of these need to be in scope; otherwise leave as-is.

## Breakpoint mechanism

Two different problems need two different solutions:

1. **Pure style differences** (padding, font-size, grid-cols) → Tailwind's `md:` prefix (768px default breakpoint, matches the spec). No JS needed.
2. **Structurally different components** (`BottomNav` vs. a top nav + sidebar; bottom-sheet modal vs. centered dialog) → these aren't CSS variants of the same markup, they're different component trees. Add a small `useIsDesktop()` hook (`frontend/src/hooks/useIsDesktop.js`) backed by `window.matchMedia('(min-width: 768px)')` with a resize listener, and conditionally render at the point where the trees diverge (e.g., in `App.jsx` where `BottomNav` is currently always mounted alongside routes).

Don't use `useIsDesktop()` for things `md:` classes can handle — reserve it for actual component swaps to avoid double-rendering or hydration flicker.

## Component plan

New files:

| File | Purpose |
|---|---|
| `frontend/src/components/desktop/DesktopTopNav.jsx` | Replaces `BottomNav` at ≥768px. Logo + tagline, tab links (For You / Live / My Votes / My Posts, same `TABS` config currently inline in `FeedScreen.jsx` — extract it), Post button, bell icon, avatar → profile/login. |
| `frontend/src/components/desktop/CategorySidebar.jsx` | Left sidebar: category filter (replaces the horizontal scrolling pill row from `FeedScreen.jsx` on desktop), a "Live stats" widget, and the "Upgrade to Plus" box gated the same way `PricingScreen`/`usePlan` already gate upsells. Demographics widget only renders if `isPlus` (matches the existing feature gate table in `CLAUDE.md` — demographic breakdown is Plus/Pro only). |
| `frontend/src/components/desktop/DesktopLiveStrip.jsx` | Desktop-sized version of the live strip. Reuses the same `realtimePosts` data and expiry logic already in `FeedScreen.jsx` (`fadingStripIds`, `collapsingStripIds`, `handleStripExpire`) — don't duplicate that state machine, just render wider/differently sized cards from the same source. |

Modified files:

| File | Change |
|---|---|
| `frontend/src/App.jsx` | Swap `<BottomNav />` for `useIsDesktop() ? null : <BottomNav />` on the routes that currently render it, and mount `DesktopTopNav` at the app shell level when desktop (it needs to be present on every route, similar to how `BottomNav` is today). |
| `frontend/src/screens/FeedScreen.jsx` | This is the main body of work. On desktop: hide the existing mobile `<header>` block, render `DesktopLiveStrip` + `CategorySidebar` + a wider feed grid instead. The `mainPosts`/`realtimePosts` computed values, tab state, category filter state, and all the animation/expiry logic stay exactly as-is — only the render branch changes based on `useIsDesktop()`. Don't duplicate the data logic into a separate desktop feed screen. |
| `frontend/src/components/PaymentModal.jsx`, live-strip vote sheet + boost prompt in `FeedScreen.jsx` | These currently use `fixed inset-0 flex items-end` (bottom sheet). Add `md:items-center md:justify-center` and cap the inner panel with `md:max-w-md md:rounded-2xl` (currently only rounded on top corners for the bottom-sheet look) so they present as centered dialogs on desktop instead of full-bleed sheets. |
| `frontend/tailwind.config.js` | Add a desktop content max-width token, e.g. `maxWidth: { app: '430px', 'app-desktop': '1240px' }`, alongside the existing one — don't remove `app`. |

## Known codebase friction — handle deliberately, don't paper over

- Every screen currently wraps its content in its own `flex justify-center` → `w-full max-w-app` pair (there's no shared layout component). For this phase you only need to change that pattern inside `FeedScreen.jsx`. Don't refactor the other 7 screens to share a `PageContainer` — that's a separate cleanup, out of scope here, but worth flagging as a future task since it'll make extending desktop to those screens later easier.
- `index.css` sets `html, body { overflow: hidden }` and `#root { position: fixed; inset: 0 }`, with each screen owning its own internal scroll region (`FeedScreen.jsx`'s `<main className="flex-1 overflow-y-auto">`). Desktop's two-column body (sidebar + feed) needs the sidebar to stay in view while the feed scrolls independently — don't let the sidebar scroll away with the feed, and don't accidentally introduce a second nested scroll container inside the feed column beyond the existing one.
- `BottomNav` is `fixed bottom-0` and unconditionally mounted on several routes today. Make sure the desktop swap doesn't leave a route where neither nav renders, or where both render at once during a resize.

## Acceptance criteria

- At 375px (iPhone SE) and 390px (iPhone 12/13/14) viewport widths: pixel-identical to production today. Diff a screenshot before/after if unsure.
- At 768px and above: top nav + sidebar + live strip + feed render per the mockup; `BottomNav` is gone.
- Resizing the browser window across the 768px boundary swaps layouts cleanly with no console errors, no duplicate nav bars, no layout jump.
- Voting, tab switching, category filtering, realtime updates, and the live-strip inline vote sheet all still work identically on desktop — this is a layout change, not a logic change.
- `npm run build` in `frontend/` succeeds with no new warnings.
