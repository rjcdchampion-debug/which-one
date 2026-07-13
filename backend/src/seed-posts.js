const { supabase } = require('./supabaseClient')

// LoremFlickr — category-specific photos, deterministic per lock value, no API key needed
const LOREMFLICKR_KEYWORDS = {
  fashion: 'fashion',
  food:    'food',
  home:    'interior',
  design:  'design',
  beauty:  'beauty',
}

function categoryImages(category) {
  const kw = LOREMFLICKR_KEYWORDS[category] || category
  return Array.from({ length: 30 }, (_, i) =>
    `https://loremflickr.com/400/400/${kw}?lock=${i + 1}`
  )
}

const CATEGORY_QUESTIONS = {
  fashion: [
    'Which outfit for tonight?',
    'Casual or dressy for the party?',
    'Which colour works better on me?',
    'Boots or heels for this look?',
    'Summer dress — which one?',
    'Jacket or blazer for the office?',
    'Skirt or trousers?',
    'Prints or solid colours?',
    'Light or dark tones for autumn?',
    'Statement piece or minimal accessories?',
    'Vintage or modern aesthetic?',
    'Bold or neutral palette?',
    'Layered or sleek silhouette?',
    'Which shade of blue?',
    'Tucked or untucked for the event?',
  ],
  food: [
    'Pasta or risotto tonight?',
    'Which restaurant should we try?',
    'Spicy or mild for date night?',
    'Sweet or savoury for dessert?',
    'Coffee or tea this morning?',
    'Breakfast or brunch spread — which?',
    'Sushi or ramen tonight?',
    'Pizza or burger for the game?',
    'Salad or soup for lunch?',
    'Vegan or meat option — which looks better?',
    'Italian or Asian for the group?',
    'Chocolate or vanilla cake?',
    'Grilled or fried chicken?',
    'Light starter or hearty main?',
    'Street food or fine dining tonight?',
  ],
  home: [
    'Which colour for the living room wall?',
    'Modern or cosy feel for the space?',
    'Plant in the corner or leave it open?',
    'Wood or metal for the coffee table?',
    'Sofa placement — which layout works?',
    'Rug or no rug under the table?',
    'Curtains or blinds for the bedroom?',
    'Shelves or a gallery wall?',
    'Minimalist or maximalist styling?',
    'Warm or cool lighting for the kitchen?',
    'Hardwood or carpet in the bedroom?',
    'Paint or wallpaper for the feature wall?',
    'Open plan or keep the separate rooms?',
    'Which furniture style for the corner?',
    'Statement piece or keep it subtle?',
  ],
  design: [
    'Which logo direction?',
    'Minimalist or detailed layout?',
    'Dark mode or light mode for the app?',
    'Serif or sans-serif for this brand?',
    'Which colour scheme feels right?',
    'Modern or classic aesthetic?',
    'Geometric or organic shapes?',
    'Bold or subtle branding approach?',
    'Custom illustration or photography?',
    'Gradient or flat colour palette?',
    'Which font pairing works better?',
    'Symmetrical or asymmetrical layout?',
    'Playful or professional tone?',
    'Line icons or filled icons?',
    'Which grid layout for the homepage?',
  ],
  beauty: [
    'Natural or bold makeup for tonight?',
    'Which nail colour for the wedding?',
    'Curly or straight — which suits me?',
    'Red or nude lip for the occasion?',
    'Summer glow or matte finish?',
    'Smokey eye or cat eye?',
    'Dewy or satin highlighter?',
    'Warm or cool blush shade?',
    'Hair up or down for the event?',
    'Bold lashes or natural look?',
    'Matte or dewy foundation finish?',
    'Arched or soft eyebrow shape?',
    'Bronzer or contour for my face shape?',
    'Lip gloss or tinted lip balm?',
    'Which hair colour direction?',
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

  const images    = categoryImages(category)
  const questions = CATEGORY_QUESTIONS[category]
  const question  = getRandomElement(questions)

  // Pick 2 distinct images
  const shuffled = [...images].sort(() => Math.random() - 0.5)
  const selectedImages = shuffled.slice(0, 2)

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

async function ensureSeedStructure() {
  // Fetch seed users with their plan so we can decide AI verdict entitlement per post
  const { data: seedUsers } = await supabase
    .from('users')
    .select('id, username, plan')
    .limit(10)

  if (!seedUsers?.length) {
    console.log('[Seed] No users found — skipping')
    return
  }

  function nextUser() {
    const u = seedUsers[seedUserRotationIdx % seedUsers.length]
    seedUserRotationIdx++
    return u
  }

  const categories = ['fashion', 'food', 'home', 'design', 'beauty']

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
