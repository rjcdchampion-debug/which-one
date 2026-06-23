const { supabase } = require('./supabaseClient')

const REALISTIC_USERNAMES = [
  'alex.chen', 'maya_patel', 'jordan_lee', 'sophia.kim', 'jackson_m',
  'lena.t', 'marco.r', 'zoe_woods', 'rav.gupta', 'lily.j',
  'noah_black', 'emma.s', 'ethan.w', 'ava_prince', 'liam.k',
]

const SEED_TEMPLATES = [
  {
    category: 'fashion',
    questions: [
      'Which outfit for tonight?',
      'Casual or dressy for the party?',
      'Which colour works better?',
      'Boots or heels?',
      'Summer dress vibes — which one?',
    ],
    images: [
      'https://source.unsplash.com/400x400/?fashion,outfit',
      'https://source.unsplash.com/400x400/?dress',
    ],
  },
  {
    category: 'food',
    questions: [
      'Pasta or risotto tonight?',
      'Which restaurant should we try?',
      'Spicy or mild?',
      'Sweet or savoury for dessert?',
      'Coffee or tea?',
    ],
    images: [
      'https://source.unsplash.com/400x400/?food,restaurant',
      'https://source.unsplash.com/400x400/?cuisine',
    ],
  },
  {
    category: 'home',
    questions: [
      'Which colour for the wall?',
      'Modern or cosy for the living room?',
      'Plant in the corner or corner empty?',
      'Wood or metal for the coffee table?',
      'Sofa placement — which layout?',
    ],
    images: [
      'https://source.unsplash.com/400x400/?interior,home',
      'https://source.unsplash.com/400x400/?furniture',
    ],
  },
  {
    category: 'design',
    questions: [
      'Which logo design?',
      'Minimalist or detailed for the layout?',
      'Dark mode or light mode?',
      'Typography — serif or sans-serif?',
      'Which colour scheme?',
    ],
    images: [
      'https://source.unsplash.com/400x400/?design,graphics',
      'https://source.unsplash.com/400x400/?digital,art',
    ],
  },
  {
    category: 'beauty',
    questions: [
      'Makeup look — natural or bold?',
      'Which nail colour?',
      'Curly or straight hair style?',
      'Red or nude lipstick?',
      'Summer glow or matte finish?',
    ],
    images: [
      'https://source.unsplash.com/400x400/?beauty,makeup',
      'https://source.unsplash.com/400x400/?skincare',
    ],
  },
]

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomUsername() {
  return getRandomElement(REALISTIC_USERNAMES)
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomVoteCount() {
  return getRandomInt(10, 200)
}

function getExpiryDate(isRealtime) {
  const now = new Date()
  if (isRealtime) {
    const mins = getRandomInt(5, 14)
    now.setMinutes(now.getMinutes() + mins)
  } else {
    const hours = getRandomInt(2, 11)
    now.setHours(now.getHours() + hours)
  }
  return now.toISOString()
}

async function generateSeedPosts(count = 3) {
  const posts = []

  for (let i = 0; i < count; i++) {
    const template = getRandomElement(SEED_TEMPLATES)
    const isRealtime = Math.random() > 0.3
    const question = getRandomElement(template.questions)

    // Get first user to assign as creator (or pick a seed user)
    const { data: firstUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single()

    if (!firstUser) {
      console.warn('No users found — skipping seed post creation')
      continue
    }

    const postData = {
      user_id: firstUser.id,
      mode: isRealtime ? 'realtime' : 'twelve_hour',
      category: template.category,
      question,
      status: 'active',
      expires_at: getExpiryDate(isRealtime),
    }

    const { data: post, error: postErr } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single()

    if (postErr || !post) {
      console.error('Failed to insert seed post:', postErr)
      continue
    }

    // Create 2 options with realistic vote counts
    const [url1, url2] = template.images
    const optionData = [
      { post_id: post.id, label: 'Option A', photo_url: url1, vote_count: getRandomVoteCount() },
      { post_id: post.id, label: 'Option B', photo_url: url2, vote_count: getRandomVoteCount() },
    ]

    const { error: optErr } = await supabase
      .from('options')
      .insert(optionData)

    if (optErr) {
      console.error('Failed to insert options:', optErr)
      continue
    }

    // Add AI verdict if realtime
    if (isRealtime) {
      const winningIdx = optionData[0].vote_count > optionData[1].vote_count ? 0 : 1
      const reasonTexts = [
        'Trending in this category',
        'Higher engagement expected',
        'Community preference aligns',
        'Based on current trends',
      ]

      await supabase.from('ai_verdicts').insert({
        post_id: post.id,
        recommendation_option_id: optionData[winningIdx].id,
        confidence: 0.7 + Math.random() * 0.2,
        insights: [
          { text: getRandomElement(reasonTexts) },
          { text: 'Matches user engagement patterns' },
          { text: 'Supported by community data' },
        ],
        sources: [
          { name: 'Trend analysis' },
          { name: 'Community insights' },
        ],
      })
    }

    posts.push(post)
  }

  return posts
}

async function getActivePostCount() {
  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  if (error) {
    console.error('Error counting posts:', error)
    return 0
  }

  return count || 0
}

async function ensureMinimumPosts(minCount = 10) {
  const activeCount = await getActivePostCount()
  console.log(`[Seed] Active posts: ${activeCount}`)

  if (activeCount < minCount) {
    const needed = minCount - activeCount
    console.log(`[Seed] Below threshold — inserting ${needed} posts`)
    await generateSeedPosts(needed)
  }
}

module.exports = {
  generateSeedPosts,
  getActivePostCount,
  ensureMinimumPosts,
}
