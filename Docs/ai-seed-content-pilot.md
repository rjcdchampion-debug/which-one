# AI-generated seed content — pilot scope (food category)

## Goal

Replace the current seed photos (random stock images with no real relationship to each other) with genuinely paired, AI-generated decision images — two coherent, comparable options per post, with a sensible caption, that someone could actually cast a meaningful vote on.

## Why food first

Food is the lowest-risk category to pilot: no people, no bodies, no faces, so the age-appropriateness and content-safety surface is small. It's also easy to get two visually comparable, appetizing options from a shared prompt template. Fashion, beauty, and home-with-people categories need a stricter review pass before AI generation touches them — treat this pilot as the thing that proves the pipeline, not the final scope.

## How the current seeding actually works (relevant detail)

`backend/src/seed-posts.js` doesn't generate a fresh photo per post — it pre-builds a pool of 30 image URLs per category (`categoryImages()`) and recombines them into posts as it tops the active pool back up to 30 every 5 minutes. That means this pilot is a **one-time batch of ~30 generated images for the food category**, not a continuous generation job. That matters for cost — see below.

## Proposed pipeline

1. **Question + prompt generation (uses the `ANTHROPIC_API_KEY` already in `backend/.env` — no new key needed).** Ask Claude for a batch of food decision questions, each with two short image-generation prompts for option A and option B, e.g.:
   > "Generate 15 simple, relatable food decision questions (the kind someone would actually have an opinion on) with two comparable options each. For each, give a 6–10 word visual description suitable for a food-photography image prompt. Keep it universal and appetizing — no allergens called out as the deciding factor, no alcohol, nothing that reads as a health claim."
2. **Image generation.** Feed each option prompt into an image-generation API with a fixed style suffix appended to every call (e.g. "overhead shot, natural light, shallow depth of field, on a wooden table, professional food photography") so option A and option B in a pair look like they belong to the same photoshoot rather than two random photos.
3. **Storage.** Upload the ~30 generated images to Supabase Storage (the same bucket flow `frontend/src/lib/supabase.js` already uses for user-uploaded photos) instead of hot-linking a third-party URL — more reliable than LoremFlickr/Picsum, and consistent with how real posts store images.
4. **Safety.** Rely on the provider's generation-time safety filter first (see below), plus a manual look through the ~30-image batch before it goes live — genuinely feasible at this volume. Before expanding beyond food, add a dedicated moderation pass (Google SafeSearch or Azure AI Content Safety) ahead of anything involving people.

## Provider recommendation

| Provider | Cost/image | Notes |
|---|---|---|
| **Google Imagen 4 Fast** | ~$0.02 | Best price-to-quality ratio per current comparisons; built-in safety filtering at generation time; watermarks output. |
| **OpenAI GPT Image 1 Mini** | ~$0.005 | Cheapest option; still has content filters; slightly behind Imagen/GPT Image 1 on quality. |
| OpenAI GPT Image 1.5 | up to ~$0.17 | Highest quality benchmark, but overkill (and overpriced) for a stock-style food photo pool. |

Given this is a one-time ~30-image batch, cost is trivial either way (roughly $0.15–$0.60 total) — I'd pick **Google Imagen 4 Fast** for the quality/cost balance and built-in safety filtering, but GPT Image 1 Mini is a reasonable fallback if you'd rather stay in the OpenAI ecosystem. Neither requires a separate moderation API for this pilot given the category and volume — worth adding one before scaling to people-containing categories.

Sources:
- [AI Image Generation API Comparison 2026: Pricing, Quality, and the Best Value Pick](https://blog.laozhang.ai/en/posts/ai-image-generation-api-comparison-2026)
- [AI Image Pricing 2026: Google Gemini vs. OpenAI GPT Cost Analysis](https://intuitionlabs.ai/articles/ai-image-generation-pricing-google-openai)
- [Best Image Moderation APIs in 2026](https://www.edenai.co/post/best-image-moderation-apis)

## On the "valuable data" angle

Worth being modest here: because the two options in each pair come from a controlled, shared prompt template, the resulting vote split is a light signal about which visual framing people prefer (e.g. does option-A framing systematically pull more votes than option-B framing) — not a research-grade dataset. The main near-term value is a seed feed that actually looks like a coherent product on day one, not a secondary data asset. If real preference-data value is something you want to pursue deliberately later, that's a separate conversation with its own consent/privacy-notice implications for guest voters — flagging it now so it isn't a surprise later, not proposing it as part of this pilot.

## What I need to proceed

1. Confirm provider (Imagen 4 Fast recommended, or say if you'd rather use GPT Image 1 Mini).
2. An API key for that provider added to `backend/.env`.
3. Sign-off on the question/prompt generation guardrails above (no allergens, no alcohol, no health claims as the deciding factor) — happy to adjust.

Once I have the key, I'll write the actual one-off generation script and run the food-category batch.
