const express = require('express')
const { supabase } = require('../supabaseClient')
const { authMiddleware } = require('../middleware/auth')
const Anthropic = require('@anthropic-ai/sdk')

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
    supabase.from('users').select('id, username, avatar_url, plan').in('id', posts.map(p => p.user_id)),
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

    if (tab === 'live') {
      // Only active realtime posts, ordered most-urgent first
      query = query.eq('mode', 'realtime')
    } else if (tab === 'trending') {
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

    const orderCol = tab === 'live' ? 'expires_at' : 'created_at'
    const orderAsc = tab === 'live'
    const { data: posts, error } = await query.order(orderCol, { ascending: orderAsc }).limit(50)
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

// ── POST /api/posts/:id/share ─────────────────────────────────────────────────

router.post('/:id/share', async (req, res) => {
  try {
    const { data: post, error: fetchErr } = await supabase
      .from('posts').select('share_count').eq('id', req.params.id).single()
    if (fetchErr || !post) return res.status(404).json({ error: 'Post not found' })

    const newCount = (post.share_count || 0) + 1
    const { error } = await supabase
      .from('posts').update({ share_count: newCount }).eq('id', req.params.id)
    if (error) throw error

    res.json({ share_count: newCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/posts/:id/ai-verdict ───────────────────────────────────────────
// Calls real Anthropic vision API and stores result in ai_verdicts table.

router.post('/:id/ai-verdict', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id

    const { data: post } = await supabase.from('posts').select('*').eq('id', postId).single()
    if (!post) return res.status(404).json({ error: 'Post not found' })

    const { data: options } = await supabase.from('options').select('*').eq('post_id', postId)
    if (!options?.length) return res.status(400).json({ error: 'No options found' })

    // Delete any previous AI verdict + vote so we can replace with the real one
    await supabase.from('ai_verdicts').delete().eq('post_id', postId)
    await supabase.from('votes').delete().eq('post_id', postId).eq('voter_type', 'ai')

    let recommendedOption = options[0]
    let reason = 'Best choice based on visual analysis'

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (apiKey) {
      try {
        const client = new Anthropic({ apiKey })
        const imageOptions = options.filter(o => o.photo_url)

        const content = []
        imageOptions.forEach(opt => {
          content.push({ type: 'text', text: `Option ${opt.label}:` })
          content.push({ type: 'image', source: { type: 'url', url: opt.photo_url } })
        })
        content.push({
          type: 'text',
          text: `Look at these photos and pick the stronger option for someone asking: "${post.question}". Category: ${post.category}. Give a confident recommendation and one sentence reason based on what you can see in the images and current trends. Reply with just: "Option [letter]: [one sentence reason]"`,
        })

        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 150,
          messages: [{ role: 'user', content }],
        })

        const text = response.content[0]?.text?.trim() || ''
        const match = text.match(/Option\s+([A-D])/i)
        if (match) {
          const idx = match[1].toUpperCase().charCodeAt(0) - 65
          recommendedOption = options[idx] || options[0]
        }
        reason = text.replace(/^Option\s+[A-D]:\s*/i, '').trim() || reason
      } catch (aiErr) {
        console.warn('[AI verdict] Anthropic call failed, using fallback:', aiErr.message)
      }
    } else {
      console.warn('[AI verdict] ANTHROPIC_API_KEY not set — using fallback')
    }

    await castAIVote(postId, recommendedOption.id, reason)

    const { data: verdict } = await supabase
      .from('ai_verdicts').select('*').eq('post_id', postId).single()

    res.json({ verdict })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
