const { supabase } = require('./supabaseClient')

const REALISTIC_USERNAMES = [
  'sophie.styles', 'homewithmark', 'foodie_dan', 'designbyjess', 'beautywithlena',
  'alex.chen', 'maya_patel', 'jordan_lee', 'rav.gupta', 'lily.j',
  'noah_black', 'emma.s', 'ethan.w', 'ava_prince', 'liam.k',
  'zoe_woods', 'marco.r', 'nina.g', 'oscar.t', 'ruby.m',
]

// Extensive unique image URLs per category (30+ per category to never repeat)
const CATEGORY_IMAGES = {
  fashion: [
    'https://picsum.photos/seed/fashion_01/400/400',
    'https://picsum.photos/seed/fashion_02/400/400',
    'https://picsum.photos/seed/fashion_03/400/400',
    'https://picsum.photos/seed/fashion_04/400/400',
    'https://picsum.photos/seed/fashion_05/400/400',
    'https://picsum.photos/seed/fashion_06/400/400',
    'https://picsum.photos/seed/fashion_07/400/400',
    'https://picsum.photos/seed/fashion_08/400/400',
    'https://picsum.photos/seed/fashion_09/400/400',
    'https://picsum.photos/seed/fashion_10/400/400',
    'https://picsum.photos/seed/fashion_11/400/400',
    'https://picsum.photos/seed/fashion_12/400/400',
    'https://picsum.photos/seed/fashion_13/400/400',
    'https://picsum.photos/seed/fashion_14/400/400',
    'https://picsum.photos/seed/fashion_15/400/400',
    'https://picsum.photos/seed/fashion_16/400/400',
    'https://picsum.photos/seed/fashion_17/400/400',
    'https://picsum.photos/seed/fashion_18/400/400',
    'https://picsum.photos/seed/fashion_19/400/400',
    'https://picsum.photos/seed/fashion_20/400/400',
    'https://picsum.photos/seed/fashion_21/400/400',
    'https://picsum.photos/seed/fashion_22/400/400',
    'https://picsum.photos/seed/fashion_23/400/400',
    'https://picsum.photos/seed/fashion_24/400/400',
    'https://picsum.photos/seed/fashion_25/400/400',
    'https://picsum.photos/seed/fashion_26/400/400',
    'https://picsum.photos/seed/fashion_27/400/400',
    'https://picsum.photos/seed/fashion_28/400/400',
    'https://picsum.photos/seed/fashion_29/400/400',
    'https://picsum.photos/seed/fashion_30/400/400',
  ],
  food: [
    'https://picsum.photos/seed/food_01/400/400',
    'https://picsum.photos/seed/food_02/400/400',
    'https://picsum.photos/seed/food_03/400/400',
    'https://picsum.photos/seed/food_04/400/400',
    'https://picsum.photos/seed/food_05/400/400',
    'https://picsum.photos/seed/food_06/400/400',
    'https://picsum.photos/seed/food_07/400/400',
    'https://picsum.photos/seed/food_08/400/400',
    'https://picsum.photos/seed/food_09/400/400',
    'https://picsum.photos/seed/food_10/400/400',
    'https://picsum.photos/seed/food_11/400/400',
    'https://picsum.photos/seed/food_12/400/400',
    'https://picsum.photos/seed/food_13/400/400',
    'https://picsum.photos/seed/food_14/400/400',
    'https://picsum.photos/seed/food_15/400/400',
    'https://picsum.photos/seed/food_16/400/400',
    'https://picsum.photos/seed/food_17/400/400',
    'https://picsum.photos/seed/food_18/400/400',
    'https://picsum.photos/seed/food_19/400/400',
    'https://picsum.photos/seed/food_20/400/400',
    'https://picsum.photos/seed/food_21/400/400',
    'https://picsum.photos/seed/food_22/400/400',
    'https://picsum.photos/seed/food_23/400/400',
    'https://picsum.photos/seed/food_24/400/400',
    'https://picsum.photos/seed/food_25/400/400',
    'https://picsum.photos/seed/food_26/400/400',
    'https://picsum.photos/seed/food_27/400/400',
    'https://picsum.photos/seed/food_28/400/400',
    'https://picsum.photos/seed/food_29/400/400',
    'https://picsum.photos/seed/food_30/400/400',
  ],
  home: [
    'https://picsum.photos/seed/home_01/400/400',
    'https://picsum.photos/seed/home_02/400/400',
    'https://picsum.photos/seed/home_03/400/400',
    'https://picsum.photos/seed/home_04/400/400',
    'https://picsum.photos/seed/home_05/400/400',
    'https://picsum.photos/seed/home_06/400/400',
    'https://picsum.photos/seed/home_07/400/400',
    'https://picsum.photos/seed/home_08/400/400',
    'https://picsum.photos/seed/home_09/400/400',
    'https://picsum.photos/seed/home_10/400/400',
    'https://picsum.photos/seed/home_11/400/400',
    'https://picsum.photos/seed/home_12/400/400',
    'https://picsum.photos/seed/home_13/400/400',
    'https://picsum.photos/seed/home_14/400/400',
    'https://picsum.photos/seed/home_15/400/400',
    'https://picsum.photos/seed/home_16/400/400',
    'https://picsum.photos/seed/home_17/400/400',
    'https://picsum.photos/seed/home_18/400/400',
    'https://picsum.photos/seed/home_19/400/400',
    'https://picsum.photos/seed/home_20/400/400',
    'https://picsum.photos/seed/home_21/400/400',
    'https://picsum.photos/seed/home_22/400/400',
    'https://picsum.photos/seed/home_23/400/400',
    'https://picsum.photos/seed/home_24/400/400',
    'https://picsum.photos/seed/home_25/400/400',
    'https://picsum.photos/seed/home_26/400/400',
    'https://picsum.photos/seed/home_27/400/400',
    'https://picsum.photos/seed/home_28/400/400',
    'https://picsum.photos/seed/home_29/400/400',
    'https://picsum.photos/seed/home_30/400/400',
  ],
  design: [
    'https://picsum.photos/seed/design_01/400/400',
    'https://picsum.photos/seed/design_02/400/400',
    'https://picsum.photos/seed/design_03/400/400',
    'https://picsum.photos/seed/design_04/400/400',
    'https://picsum.photos/seed/design_05/400/400',
    'https://picsum.photos/seed/design_06/400/400',
    'https://picsum.photos/seed/design_07/400/400',
    'https://picsum.photos/seed/design_08/400/400',
    'https://picsum.photos/seed/design_09/400/400',
    'https://picsum.photos/seed/design_10/400/400',
    'https://picsum.photos/seed/design_11/400/400',
    'https://picsum.photos/seed/design_12/400/400',
    'https://picsum.photos/seed/design_13/400/400',
    'https://picsum.photos/seed/design_14/400/400',
    'https://picsum.photos/seed/design_15/400/400',
    'https://picsum.photos/seed/design_16/400/400',
    'https://picsum.photos/seed/design_17/400/400',
    'https://picsum.photos/seed/design_18/400/400',
    'https://picsum.photos/seed/design_19/400/400',
    'https://picsum.photos/seed/design_20/400/400',
    'https://picsum.photos/seed/design_21/400/400',
    'https://picsum.photos/seed/design_22/400/400',
    'https://picsum.photos/seed/design_23/400/400',
    'https://picsum.photos/seed/design_24/400/400',
    'https://picsum.photos/seed/design_25/400/400',
    'https://picsum.photos/seed/design_26/400/400',
    'https://picsum.photos/seed/design_27/400/400',
    'https://picsum.photos/seed/design_28/400/400',
    'https://picsum.photos/seed/design_29/400/400',
    'https://picsum.photos/seed/design_30/400/400',
  ],
  beauty: [
    'https://picsum.photos/seed/beauty_01/400/400',
    'https://picsum.photos/seed/beauty_02/400/400',
    'https://picsum.photos/seed/beauty_03/400/400',
    'https://picsum.photos/seed/beauty_04/400/400',
    'https://picsum.photos/seed/beauty_05/400/400',
    'https://picsum.photos/seed/beauty_06/400/400',
    'https://picsum.photos/seed/beauty_07/400/400',
    'https://picsum.photos/seed/beauty_08/400/400',
    'https://picsum.photos/seed/beauty_09/400/400',
    'https://picsum.photos/seed/beauty_10/400/400',
    'https://picsum.photos/seed/beauty_11/400/400',
    'https://picsum.photos/seed/beauty_12/400/400',
    'https://picsum.photos/seed/beauty_13/400/400',
    'https://picsum.photos/seed/beauty_14/400/400',
    'https://picsum.photos/seed/beauty_15/400/400',
    'https://picsum.photos/seed/beauty_16/400/400',
    'https://picsum.photos/seed/beauty_17/400/400',
    'https://picsum.photos/seed/beauty_18/400/400',
    'https://picsum.photos/seed/beauty_19/400/400',
    'https://picsum.photos/seed/beauty_20/400/400',
    'https://picsum.photos/seed/beauty_21/400/400',
    'https://picsum.photos/seed/beauty_22/400/400',
    'https://picsum.photos/seed/beauty_23/400/400',
    'https://picsum.photos/seed/beauty_24/400/400',
    'https://picsum.photos/seed/beauty_25/400/400',
    'https://picsum.photos/seed/beauty_26/400/400',
    'https://picsum.photos/seed/beauty_27/400/400',
    'https://picsum.photos/seed/beauty_28/400/400',
    'https://picsum.photos/seed/beauty_29/400/400',
    'https://picsum.photos/seed/beauty_30/400/400',
  ],
}

const CATEGORY_QUESTIONS = {
  fashion: [
    'Which outfit for tonight?',
    'Casual or dressy for the party?',
    'Which colour works better?',
    'Boots or heels?',
    'Summer dress vibes — which one?',
    'Jacket or blazer?',
    'Skirt or pants?',
    'Prints or solid?',
    'Light or dark tones?',
    'Statement or minimal?',
    'Vintage or modern?',
    'Bold or neutral?',
    'Layered or sleek?',
    'Which shade of blue?',
    'Tucked or untucked?',
  ],
  food: [
    'Pasta or risotto tonight?',
    'Which restaurant should we try?',
    'Spicy or mild?',
    'Sweet or savoury for dessert?',
    'Coffee or tea?',
    'Breakfast or brunch?',
    'Sushi or ramen?',
    'Pizza or burger?',
    'Salad or soup?',
    'Vegan or meat?',
    'Italian or Asian?',
    'Chocolate or vanilla?',
    'Grilled or fried?',
    'Light or hearty?',
    'Street food or fine dining?',
  ],
  home: [
    'Which colour for the wall?',
    'Modern or cosy for the living room?',
    'Plant in the corner or corner empty?',
    'Wood or metal for the coffee table?',
    'Sofa placement — which layout?',
    'Rug or no rug?',
    'Curtains or blinds?',
    'Shelves or wall art?',
    'Minimalist or maximal?',
    'Warm or cool lighting?',
    'Hardwood or carpet?',
    'Paint or wallpaper?',
    'Open plan or separate rooms?',
    'Which furniture style?',
    'Statement piece or subtle?',
  ],
  design: [
    'Which logo design?',
    'Minimalist or detailed for the layout?',
    'Dark mode or light mode?',
    'Typography — serif or sans-serif?',
    'Which colour scheme?',
    'Modern or classic aesthetic?',
    'Geometric or organic shapes?',
    'Bold or subtle branding?',
    'Custom or template-based?',
    'Gradient or flat colours?',
    'Which font pairing?',
    'Symmetrical or asymmetrical?',
    'Playful or professional?',
    'Icon style — line or filled?',
    'Which layout grid?',
  ],
  beauty: [
    'Makeup look — natural or bold?',
    'Which nail colour?',
    'Curly or straight hair style?',
    'Red or nude lipstick?',
    'Summer glow or matte finish?',
    'Smokey eye or cat eye?',
    'Highlighter — dewy or satin?',
    'Blush shade — warm or cool?',
    'Hair up or down?',
    'Bold lashes or natural?',
    'Foundation finish — matte or dewy?',
    'Eyebrow shape — arch or soft?',
    'Bronzer or contour?',
    'Lip gloss or tint?',
    'Which hair colour?',
  ],
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomUsername() {
  return getRandomElement(REALISTIC_USERNAMES)
}

function getRandomVoteCount() {
  return getRandomInt(15, 180)
}

async function createSeedPost(userId, category, mode) {
  const isRealtime = mode === 'realtime'
  const expiresAt = new Date()

  if (isRealtime) {
    expiresAt.setMinutes(expiresAt.getMinutes() + getRandomInt(8, 14))
  } else {
    expiresAt.setHours(expiresAt.getHours() + getRandomInt(10, 12))
  }

  const images = CATEGORY_IMAGES[category]
  const questions = CATEGORY_QUESTIONS[category]

  const question = getRandomElement(questions)
  const selectedImages = images.sort(() => Math.random() - 0.5).slice(0, 2)

  const postData = {
    user_id: userId,
    mode,
    category,
    question,
    status: 'active',
    expires_at: expiresAt.toISOString(),
  }

  const { data: post, error: postErr } = await supabase
    .from('posts')
    .insert(postData)
    .select()
    .single()

  if (postErr || !post) {
    console.error('Failed to create seed post:', postErr)
    return null
  }

  const optionData = [
    { post_id: post.id, label: 'Option A', photo_url: selectedImages[0], vote_count: getRandomVoteCount() },
    { post_id: post.id, label: 'Option B', photo_url: selectedImages[1], vote_count: getRandomVoteCount() },
  ]

  const { error: optErr } = await supabase.from('options').insert(optionData)

  if (optErr) {
    console.error('Failed to create options:', optErr)
    return null
  }

  if (isRealtime) {
    const winningIdx = optionData[0].vote_count > optionData[1].vote_count ? 0 : 1
    await supabase.from('ai_verdicts').insert({
      post_id: post.id,
      recommendation_option_id: optionData[winningIdx].id,
      confidence: 0.72,
      insights: [
        { text: 'Trending in this category' },
        { text: 'Community preference aligns' },
        { text: 'Based on current trends' },
      ],
      sources: [
        { name: 'Trend analysis' },
        { name: 'Community insights' },
      ],
    })
  }

  return post
}

async function ensureSeedStructure() {
  const { data: firstUser } = await supabase.from('users').select('id').limit(1).single()
  if (!firstUser) {
    console.log('[Seed] No users found — skipping seed structure')
    return
  }

  const userId = firstUser.id
  const categories = ['fashion', 'food', 'home', 'design', 'beauty']

  for (const category of categories) {
    // Check 12-hour posts
    const { count: count12h } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('category', category)
      .eq('mode', 'twelve_hour')
      .eq('status', 'active')

    if ((count12h || 0) < 3) {
      const needed = 3 - (count12h || 0)
      console.log(`[Seed] ${category}: need ${needed} 12-hour posts`)
      for (let i = 0; i < needed; i++) {
        await createSeedPost(userId, category, 'twelve_hour')
      }
    }

    // Check realtime posts
    const { count: countRT } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('category', category)
      .eq('mode', 'realtime')
      .eq('status', 'active')

    if ((countRT || 0) < 3) {
      const needed = 3 - (countRT || 0)
      console.log(`[Seed] ${category}: need ${needed} realtime posts`)
      for (let i = 0; i < needed; i++) {
        await createSeedPost(userId, category, 'realtime')
      }
    }
  }

  const { count: totalActive } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  console.log(`[Seed] Total active seed posts: ${totalActive || 0}/30`)
}

module.exports = { ensureSeedStructure }
