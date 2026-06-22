const express = require('express')
const { supabase } = require('../supabaseClient')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// ── Helpers ──────────────────────────────────────────────────────────────────

async function castAIVote(postId, optionId, reason) {
  const AI_VOTER_ID = `ai_system`

  // Remove any previous AI vote for this post
  await supabase
    .from('votes')
    .delete()
    .eq('post_id', postId)
    .eq('voter_type', 'ai')

  const { error: voteErr } = await supabase.from('votes').insert({
    post_id: postId,
    option_id: optionId,
    voter_id: AI_VOTER_ID,
    voter_type: 'ai',
  })
  if (voteErr) console.error('AI vote insert error:', voteErr)

  // Increment vote_count (safe manual update — no RPC needed for v1)
  const { data: opt } = await supabase
    .from('options').select('vote_count').eq('id', optionId).single()
  await supabase
    .from('options').update({ vote_count: (opt?.vote_count || 0) + 1 }).eq('id', optionId)

  // Insert AI verdict
  await supabase.from('ai_verdicts').insert({
    post_id: postId,
    recommendation_option_id: optionId,
    confidence: 0.78,
    insights: [
      { text: reason || 'Based on current trends' },
      { text: 'Higher engagement predicted in this category' },
      { text: 'Audience preference aligns with this choice' },
    ],
    sources: [
      { name: 'Trend data' },
      { name: 'Community insights' },
    ],
  })
}

async function enrichPosts(posts) {
  if (!posts.length) return []

  const postIds = posts.map(p => p.id)

  const [{ data: options }, { data: users }, { data: verdicts }] = await Promise.all([
    supabase.from('options').select('*').in('post_id', postIds),
    supabase.from('users').select('id, username, avatar_url').in('id', posts.map(p => p.user_id)),
    supabase.from('ai_verdicts').select('*').in('post_id', postIds),
  ])

  const optionsByPost  = groupBy(options || [], 'post_id')
  const usersById      = indexBy(users || [], 'id')
  const verdictsByPost = groupBy(verdicts || [], 'post_id')

  return posts.map(p => ({
    ...p,
    options:     optionsByPost[p.id] || [],
    users:       usersById[p.user_id] || null,
    ai_verdicts: verdictsByPost[p.id] || [],
  }))
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    (acc[k] = acc[k] || []).push(item)
    return acc
  }, {})
}

function indexBy(arr, key) {
  return arr.reduce((acc, item) => { acc[item[key]] = item; return acc }, {})
}

// ── GET /api/posts ────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const { tab = 'foryou' } = req.query
    let query = supabase.from('posts').select('*').eq('status', 'active')

    if (tab === 'trending') {
      // Sort by vote total — done client side after enrichment
    } else if (tab === 'mine') {
      const token = req.headers.authorization?.split(' ')[1]
      if (!token) return res.json({ posts: [] })
      let userId
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
        userId = payload.sub
      } catch {}
      if (!userId) return res.json({ posts: [] })
      query = supabase.from('posts').select('*').eq('user_id', userId)
    }

    const { data: posts, error } = await query.order('created_at', { ascending: false }).limit(50)
    if (error) throw error

    const enriched = await enrichPosts(posts || [])
    res.json({ posts: enriched })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/posts/:id ────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { data: post, error } = await supabase
      .from('posts').select('*').eq('id', req.params.id).single()
    if (error || !post) return res.status(404).json({ error: 'Post not found' })

    const [enriched] = await enrichPosts([post])
    res.json({ post: enriched })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/posts ───────────────────────────────────────────────────────────

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { mode, durationMinutes, category, question, options, id } = req.body

    if (!mode || !category || !options || options.length < 2) {
      return res.status(400).json({ error: 'mode, category, and at least 2 options are required' })
    }

    const expiresAt = new Date()
    if (mode === 'realtime') {
      const mins = Number(durationMinutes) || 15
      expiresAt.setMinutes(expiresAt.getMinutes() + mins)
    } else {
      expiresAt.setHours(expiresAt.getHours() + 12)
    }

    // Create post
    const postInsert = {
      user_id:    req.user.id,
      mode,
      category,
      question:   question || 'Which one?',
      status:     'active',
      expires_at: expiresAt.toISOString(),
    }
    if (id) postInsert.id = id

    const { data: post, error: postErr } = await supabase
      .from('posts').insert(postInsert).select().single()
    if (postErr) throw postErr

    // Create options
    const { data: createdOptions, error: optsErr } = await supabase
      .from('options')
      .insert(options.map(opt => ({
        post_id:   post.id,
        label:     opt.label,
        photo_url: opt.photo_url,
        vote_count: 0,
      })))
      .select()
    if (optsErr) throw optsErr

    // AI vote
    const firstOption = createdOptions[0]
    if (mode === 'realtime') {
      // Cast immediately
      setImmediate(() => castAIVote(post.id, firstOption.id, 'Trending style matches current preferences'))
    } else {
      // 12-hour: cast after 5 min if no human votes
      setTimeout(async () => {
        const { count } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
          .eq('voter_type', 'human')
        if ((count || 0) === 0) {
          await castAIVote(post.id, firstOption.id, 'AI prediction based on similar posts')
        }
      }, 5 * 60 * 1000)
    }

    res.status(201).json({ post: { ...post, options: createdOptions } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
