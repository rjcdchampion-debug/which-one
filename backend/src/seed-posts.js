const { supabase } = require('./supabaseClient')

// LoremFlickr — category-specific photos, deterministic per lock value, no API key needed.
//
// Seed photo quality: LOREMFLICKR_KEYWORDS used to be one generic tag per category
// (e.g. all of "food" pulled from the same 30-photo "food" pool), then paired with
// a random question from CATEGORY_QUESTIONS — so a "Sushi or ramen tonight?" post
// could just as easily get two random salad/cake photos, since the photo pick and
// the question pick were fully decoupled. This is the lighter-weight fix decided on
// this session (see Docs/ai-seed-content-pilot.md for the heavier AI-generated-photo
// pilot, which is still the better long-term answer but needs an image-gen API key
// that hasn't been provided yet): each question now carries its own pair of
// LoremFlickr keywords, one per option, so the two photos are at least thematically
// tied to what the question is actually asking. It's still stock photography, not a
// guaranteed visual match, but far more coherent than a fully random pairing. Falls
// back to the plain category tag for both options when a question doesn't have two
// distinctly photographable subjects (e.g. "Which logo direction?").
const FALLBACK_KEYWORDS = {
  fashion: 'fashion',
  food:    'food',
  home:    'interior',
  design:  'design',
  beauty:  'beauty',
  travel:  'travel',
  sport:   'sports',
  pets:    'pets',
}

function imagesForKeyword(keyword) {
  return Array.from({ length: 15 }, (_, i) =>
    `https://loremflickr.com/400/400/${keyword}?lock=${i + 1}`
  )
}

// { question, keywords: [optionAKeyword, optionBKeyword] }
const CATEGORY_QUESTIONS = {
  fashion: [
    { question: 'Which outfit for tonight?',              keywords: ['outfit', 'outfit'] },
    { question: 'Casual or dressy for the party?',        keywords: ['casual', 'dress'] },
    { question: 'Which colour works better on me?',       keywords: ['fashion', 'fashion'] },
    { question: 'Boots or heels for this look?',           keywords: ['boots', 'heels'] },
    { question: 'Summer dress — which one?',               keywords: ['dress', 'dress'] },
    { question: 'Jacket or blazer for the office?',        keywords: ['jacket', 'blazer'] },
    { question: 'Skirt or trousers?',                      keywords: ['skirt', 'trousers'] },
    { question: 'Prints or solid colours?',                keywords: ['pattern', 'fashion'] },
    { question: 'Light or dark tones for autumn?',         keywords: ['fashion', 'fashion'] },
    { question: 'Statement piece or minimal accessories?', keywords: ['jewelry', 'minimalist'] },
    { question: 'Vintage or modern aesthetic?',            keywords: ['vintage', 'fashion'] },
    { question: 'Bold or neutral palette?',                keywords: ['colorful', 'neutral'] },
    { question: 'Layered or sleek silhouette?',            keywords: ['coat', 'dress'] },
    { question: 'Which shade of blue?',                    keywords: ['blue', 'blue'] },
    { question: 'Tucked or untucked for the event?',       keywords: ['shirt', 'shirt'] },
  ],
  food: [
    { question: 'Pasta or risotto tonight?',                    keywords: ['pasta', 'risotto'] },
    { question: 'Which restaurant should we try?',              keywords: ['restaurant', 'restaurant'] },
    { question: 'Spicy or mild for date night?',                keywords: ['curry', 'pasta'] },
    { question: 'Sweet or savoury for dessert?',                keywords: ['cake', 'cheese'] },
    { question: 'Coffee or tea this morning?',                  keywords: ['coffee', 'tea'] },
    { question: 'Breakfast or brunch spread — which?',           keywords: ['breakfast', 'brunch'] },
    { question: 'Sushi or ramen tonight?',                      keywords: ['sushi', 'ramen'] },
    { question: 'Pizza or burger for the game?',                keywords: ['pizza', 'burger'] },
    { question: 'Salad or soup for lunch?',                     keywords: ['salad', 'soup'] },
    { question: 'Vegan or meat option — which looks better?',   keywords: ['vegetables', 'steak'] },
    { question: 'Italian or Asian for the group?',              keywords: ['pasta', 'noodles'] },
    { question: 'Chocolate or vanilla cake?',                   keywords: ['chocolate', 'cake'] },
    { question: 'Grilled or fried chicken?',                    keywords: ['grill', 'chicken'] },
    { question: 'Light starter or hearty main?',                keywords: ['salad', 'steak'] },
    { question: 'Street food or fine dining tonight?',          keywords: ['streetfood', 'restaurant'] },
  ],
  home: [
    { question: 'Which colour for the living room wall?',   keywords: ['livingroom', 'paint'] },
    { question: 'Modern or cosy feel for the space?',       keywords: ['modern', 'cozy'] },
    { question: 'Plant in the corner or leave it open?',    keywords: ['plant', 'interior'] },
    { question: 'Wood or metal for the coffee table?',      keywords: ['wood', 'metal'] },
    { question: 'Sofa placement — which layout works?',     keywords: ['sofa', 'livingroom'] },
    { question: 'Rug or no rug under the table?',           keywords: ['rug', 'floor'] },
    { question: 'Curtains or blinds for the bedroom?',      keywords: ['curtains', 'blinds'] },
    { question: 'Shelves or a gallery wall?',               keywords: ['shelves', 'wall'] },
    { question: 'Minimalist or maximalist styling?',        keywords: ['minimalist', 'interior'] },
    { question: 'Warm or cool lighting for the kitchen?',   keywords: ['kitchen', 'lighting'] },
    { question: 'Hardwood or carpet in the bedroom?',       keywords: ['hardwood', 'carpet'] },
    { question: 'Paint or wallpaper for the feature wall?', keywords: ['paint', 'wallpaper'] },
    { question: 'Open plan or keep the separate rooms?',    keywords: ['openplan', 'room'] },
    { question: 'Which furniture style for the corner?',   keywords: ['furniture', 'furniture'] },
    { question: 'Statement piece or keep it subtle?',       keywords: ['furniture', 'interior'] },
  ],
  design: [
    { question: 'Which logo direction?',                keywords: ['logo', 'logo'] },
    { question: 'Minimalist or detailed layout?',       keywords: ['minimalist', 'pattern'] },
    { question: 'Dark mode or light mode for the app?', keywords: ['dark', 'light'] },
    { question: 'Serif or sans-serif for this brand?',  keywords: ['typography', 'typography'] },
    { question: 'Which colour scheme feels right?',     keywords: ['colorful', 'design'] },
    { question: 'Modern or classic aesthetic?',         keywords: ['modern', 'classic'] },
    { question: 'Geometric or organic shapes?',         keywords: ['geometric', 'abstract'] },
    { question: 'Bold or subtle branding approach?',    keywords: ['branding', 'design'] },
    { question: 'Custom illustration or photography?',  keywords: ['illustration', 'photography'] },
    { question: 'Gradient or flat colour palette?',     keywords: ['gradient', 'design'] },
    { question: 'Which font pairing works better?',     keywords: ['typography', 'typography'] },
    { question: 'Symmetrical or asymmetrical layout?',  keywords: ['pattern', 'design'] },
    { question: 'Playful or professional tone?',        keywords: ['colorful', 'minimalist'] },
    { question: 'Line icons or filled icons?',           keywords: ['design', 'design'] },
    { question: 'Which grid layout for the homepage?',  keywords: ['design', 'design'] },
  ],
  beauty: [
    { question: 'Natural or bold makeup for tonight?',      keywords: ['makeup', 'makeup'] },
    { question: 'Which nail colour for the wedding?',       keywords: ['nails', 'nails'] },
    { question: 'Curly or straight — which suits me?',      keywords: ['curls', 'hairstyle'] },
    { question: 'Red or nude lip for the occasion?',        keywords: ['lipstick', 'lipstick'] },
    { question: 'Summer glow or matte finish?',             keywords: ['makeup', 'makeup'] },
    { question: 'Smokey eye or cat eye?',                   keywords: ['eyeshadow', 'eyeliner'] },
    { question: 'Dewy or satin highlighter?',               keywords: ['makeup', 'makeup'] },
    { question: 'Warm or cool blush shade?',                keywords: ['blush', 'makeup'] },
    { question: 'Hair up or down for the event?',           keywords: ['updo', 'hairstyle'] },
    { question: 'Bold lashes or natural look?',             keywords: ['eyelashes', 'makeup'] },
    { question: 'Matte or dewy foundation finish?',         keywords: ['foundation', 'makeup'] },
    { question: 'Arched or soft eyebrow shape?',            keywords: ['eyebrows', 'makeup'] },
    { question: 'Bronzer or contour for my face shape?',    keywords: ['bronzer', 'makeup'] },
    { question: 'Lip gloss or tinted lip balm?',            keywords: ['lipgloss', 'lipbalm'] },
    { question: 'Which hair colour direction?',             keywords: ['hairstyle', 'hairstyle'] },
  ],
  travel: [
    { question: 'Beach or mountains for the trip?',        keywords: ['beach', 'mountains'] },
    { question: 'City break or countryside escape?',       keywords: ['city', 'countryside'] },
    { question: 'Which view is more breathtaking?',        keywords: ['travel', 'travel'] },
    { question: 'Road trip or flight for this one?',       keywords: ['roadtrip', 'airplane'] },
    { question: 'Which hotel room would you pick?',         keywords: ['hotel', 'hotel'] },
    { question: 'Backpacking or resort — which style?',    keywords: ['backpacking', 'resort'] },
    { question: 'Sunrise or sunset at this spot?',          keywords: ['sunrise', 'sunset'] },
    { question: 'Which city skyline wins?',                 keywords: ['cityscape', 'cityscape'] },
    { question: 'Desert or rainforest adventure?',          keywords: ['desert', 'rainforest'] },
    { question: 'Which beach looks more inviting?',        keywords: ['beach', 'beach'] },
    { question: 'Camping or glamping this weekend?',        keywords: ['camping', 'glamping'] },
    { question: 'Which local street food stall?',           keywords: ['streetfood', 'market'] },
    { question: 'Island hopping or one long stay?',         keywords: ['island', 'coastline'] },
    { question: 'Which trail should we hike?',              keywords: ['hiking', 'mountains'] },
    { question: 'Old town charm or modern skyline?',        keywords: ['oldtown', 'skyline'] },
  ],
  sport: [
    { question: 'Football or basketball tonight?',         keywords: ['football', 'basketball'] },
    { question: "Which team's kit looks better?",           keywords: ['jersey', 'jersey'] },
    { question: 'Gym session or outdoor run?',              keywords: ['gym', 'running'] },
    { question: 'Tennis or golf this weekend?',             keywords: ['tennis', 'golf'] },
    { question: 'Which stadium atmosphere wins?',           keywords: ['stadium', 'stadium'] },
    { question: 'Cycling or swimming for cardio?',          keywords: ['cycling', 'swimming'] },
    { question: 'Which sneaker for match day?',              keywords: ['sneakers', 'sneakers'] },
    { question: 'Boxing or martial arts training?',         keywords: ['boxing', 'martialarts'] },
    { question: 'Which play was the better call?',          keywords: ['sports', 'sports'] },
    { question: 'Yoga or weights this morning?',            keywords: ['yoga', 'weightlifting'] },
    { question: 'Surfing or skateboarding — which looks cooler?', keywords: ['surfing', 'skateboarding'] },
    { question: 'Which goal celebration was better?',       keywords: ['soccer', 'soccer'] },
    { question: 'Cricket or rugby for the highlight?',      keywords: ['cricket', 'rugby'] },
    { question: 'Marathon or triathlon — which is tougher?', keywords: ['marathon', 'triathlon'] },
    { question: 'Which court or pitch setup is better?',    keywords: ['basketball', 'football'] },
  ],
  pets: [
    { question: 'Which good boy is cuter?',                 keywords: ['dog', 'dog'] },
    { question: 'Cat or dog — which wins your heart?',      keywords: ['cat', 'dog'] },
    { question: 'Which puppy photo is more adorable?',      keywords: ['puppy', 'puppy'] },
    { question: 'Which kitten pose is cutest?',              keywords: ['kitten', 'kitten'] },
    { question: 'Which pet costume is more fun?',            keywords: ['petcostume', 'petcostume'] },
    { question: "Which one's having a better nap?",          keywords: ['sleepingdog', 'sleepingcat'] },
    { question: 'Which good girl deserves a treat?',        keywords: ['dog', 'dog'] },
    { question: 'Bunny or hamster — which is cuter?',       keywords: ['rabbit', 'hamster'] },
    { question: 'Which dog breed steals the show?',        keywords: ['dog', 'dog'] },
    { question: "Which pet's reaction is funnier?",          keywords: ['dog', 'cat'] },
    { question: 'Parrot or fish — which tank wins?',        keywords: ['parrot', 'aquarium'] },
    { question: 'Which walk-in-the-park moment is cuter?', keywords: ['dogwalk', 'dogwalk'] },
    { question: 'Which pet is the better photobomb?',       keywords: ['pet', 'pet'] },
    { question: 'Which paw print wins the vote?',            keywords: ['dog', 'cat'] },
    { question: "Which one's the goodest boy today?",       keywords: ['dog', 'dog'] },
  ],
}

// Plan mix for seed posts — makes the feed realistic
// plus/pro users show AI strip automatically; free users may or may not have paid
const SEED_PLAN_WEIGHTS = ['free', 'free', 'plus', 'plus', 'pro']

function pickRandomPlan() {
  return SEED_PLAN_WEIGHTS[Math.floor(Math.random() * SEED_PLAN_WEIGHTS.length)]
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomVoteCount() {
  return getRandomInt(15, 180)
}

async function createSeedPost(user, category, mode) {
  const isRealtime = mode === 'realtime'
  const expiresAt  = new Date()

  if (isRealtime) {
    expiresAt.setMinutes(expiresAt.getMinutes() + getRandomInt(8, 14))
  } else {
    expiresAt.setHours(expiresAt.getHours() + getRandomInt(10, 12))
  }

  const userPlan = user.plan || 'free'
  const isPlus   = userPlan === 'plus' || userPlan === 'pro'
  // Free users: 55% chance they paid for AI verdict on this post
  const freePaid = !isPlus && Math.random() < 0.55

  const questionPool = CATEGORY_QUESTIONS[category] || []
  const fallbackKw   = FALLBACK_KEYWORDS[category] || category
  const picked       = questionPool.length
    ? getRandomElement(questionPool)
    : { question: 'Which one do you prefer?', keywords: [fallbackKw, fallbackKw] }
  const { question, keywords: [kwA, kwB] } = picked

  // Each option draws from its own keyword's photo pool — see the comment above
  // CATEGORY_QUESTIONS for why (keeps the two photos thematically tied to the
  // question instead of two unrelated random category photos). When both options
  // share a keyword (no distinct second subject for this question), pick 2
  // different photos from that one pool rather than risking the same lock twice.
  let selectedImages
  if (kwA === kwB) {
    const shuffled = [...imagesForKeyword(kwA)].sort(() => Math.random() - 0.5)
    selectedImages = shuffled.slice(0, 2)
  } else {
    selectedImages = [
      getRandomElement(imagesForKeyword(kwA)),
      getRandomElement(imagesForKeyword(kwB)),
    ]
  }

  const postData = {
    user_id:    user.id,
    mode,
    category,
    question,
    status:     'active',
    expires_at: expiresAt.toISOString(),
    ai_verdict_paid: freePaid,
  }

  let { data: post, error: postErr } = await supabase
    .from('posts')
    .insert(postData)
    .select()
    .single()

  if (postErr?.message?.includes('ai_verdict_paid')) {
    const { ai_verdict_paid: _ignored, ...fallbackData } = postData
    ;({ data: post, error: postErr } = await supabase
      .from('posts').insert(fallbackData).select().single())
  }

  if (postErr || !post) {
    console.error('[Seed] Failed to create post:', postErr?.message)
    return null
  }

  const optionData = [
    { post_id: post.id, label: 'Option A', photo_url: selectedImages[0], vote_count: getRandomVoteCount() },
    { post_id: post.id, label: 'Option B', photo_url: selectedImages[1], vote_count: getRandomVoteCount() },
  ]

  const { data: createdOptions, error: optErr } = await supabase
    .from('options').insert(optionData).select()

  if (optErr || !createdOptions) {
    console.error('[Seed] Failed to create options:', optErr?.message)
    return null
  }

  // Only create AI verdict when the post is entitled to show the strip:
  // — plus/pro creator (plan covers it), or free creator who paid the £0.99 boost
  if (isPlus || freePaid) {
    const winningIdx  = createdOptions[0].vote_count > createdOptions[1].vote_count ? 0 : 1
    const verdictReasons = {
      fashion: 'Stronger visual appeal and better colour balance for the occasion.',
      food:    'More visually appetising presentation and better plating.',
      home:    'Better proportions and visual harmony with the space.',
      design:  'Cleaner composition with stronger brand recall.',
      beauty:  'More flattering tones that complement natural features.',
      travel:  'More striking scenery and stronger overall travel appeal.',
      sport:   'Better action and energy captured in the moment.',
      pets:    'More expressive and higher overall cuteness factor.',
    }
    await supabase.from('ai_verdicts').insert({
      post_id: post.id,
      recommendation_option_id: createdOptions[winningIdx].id,
      confidence: parseFloat((0.7 + Math.random() * 0.25).toFixed(2)),
      insights: [
        { text: verdictReasons[category] || 'Best choice based on visual analysis.' },
        { text: 'Community preference aligns with this option.' },
        { text: 'Higher engagement predicted in this category.' },
      ],
      sources: [
        { name: 'Trend analysis' },
        { name: 'Community insights' },
      ],
    })
  }

  return post
}

let seedUserRotationIdx = 0

// Dedicated placeholder-UUID bot accounts (00000000-0000-0000-0000-000000000001,
// 002, 003, 004 — stylestar / foodie_uk / interior.xyz / glowup.daily in the live
// DB) are the only accounts seed content should ever be attributed to.
const SEED_BOT_ID_PATTERN = /^00000000-0000-0000-0000-\d{12}$/

async function ensureSeedStructure() {
  // Fetch seed users with their plan so we can decide AI verdict entitlement per post.
  // IMPORTANT: this used to be `.limit(10)` with no filter at all, which pulled
  // whatever rows happened to be in `users` — including real registered accounts,
  // not just the dedicated bot accounts. Once a real user signed up, they entered
  // the same round-robin rotation as the bots (see `nextUser()` below) and started
  // being credited as the "author" of auto-generated seed posts, which then showed
  // up in that real user's own "My Posts" tab as content they never created. Now
  // scoped to only the dedicated placeholder-UUID bot accounts (see
  // SEED_BOT_ID_PATTERN above) so real accounts can never be swept into seeding.
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, username, plan')

  const seedUsers = (allUsers || []).filter(u => SEED_BOT_ID_PATTERN.test(u.id))

  if (!seedUsers.length) {
    console.log('[Seed] No dedicated seed-bot users found — skipping')
    return
  }

  function nextUser() {
    const u = seedUsers[seedUserRotationIdx % seedUsers.length]
    seedUserRotationIdx++
    return u
  }

  const categories = ['fashion', 'food', 'home', 'design', 'beauty', 'travel', 'sport', 'pets']

  for (const category of categories) {
    const { count: count12h } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('category', category)
      .eq('mode', 'twelve_hour')
      .eq('status', 'active')

    if ((count12h || 0) < 3) {
      const needed = 3 - (count12h || 0)
      console.log(`[Seed] ${category}: creating ${needed} twelve_hour posts`)
      for (let i = 0; i < needed; i++) {
        await createSeedPost(nextUser(), category, 'twelve_hour')
      }
    }

    const { count: countRT } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('category', category)
      .eq('mode', 'realtime')
      .eq('status', 'active')

    if ((countRT || 0) < 3) {
      const needed = 3 - (countRT || 0)
      console.log(`[Seed] ${category}: creating ${needed} realtime posts`)
      for (let i = 0; i < needed; i++) {
        await createSeedPost(nextUser(), category, 'realtime')
      }
    }
  }

  const { count: totalActive } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  console.log(`[Seed] Active posts: ${totalActive || 0}`)
}

module.exports = { ensureSeedStructure }
