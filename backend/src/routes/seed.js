const express = require('express')
const { supabase } = require('../supabaseClient')

const router = express.Router()

const DEMO_POSTS = [
  {
    mode: 'realtime',
    category: 'fashion',
    question: 'Which outfit for tonight?',
    expiryMinutes: 45,
    options: [
      { label: 'Option A', photo_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80', vote_count: 34 },
      { label: 'Option B', photo_url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80', vote_count: 12 },
    ],
    verdict: { idx: 0, reason: 'More versatile for evening events' },
  },
  {
    mode: 'realtime',
    category: 'food',
    question: 'Which dessert looks more appealing?',
    expiryMinutes: 30,
    options: [
      { label: 'Option A', photo_url: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80', vote_count: 21 },
      { label: 'Option B', photo_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80', vote_count: 29 },
    ],
    verdict: { idx: 1, reason: 'Richer visual contrast and texture' },
  },
  {
    mode: 'realtime',
    category: 'beauty',
    question: 'Red or nude lip for the event?',
    expiryMinutes: 15,
    options: [
      { label: 'Option A', photo_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80', vote_count: 104 },
      { label: 'Option B', photo_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80', vote_count: 78 },
    ],
    verdict: { idx: 0, reason: 'Makes a stronger impression for evening' },
  },
  {
    mode: 'twelve_hour',
    category: 'home',
    question: 'Which sofa fits better in a modern living room?',
    expiryMinutes: 8 * 60,
    options: [
      { label: 'Option A', photo_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80', vote_count: 67 },
      { label: 'Option B', photo_url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&q=80', vote_count: 43 },
    ],
    verdict: { idx: 0, reason: 'Clean lines suit minimalist spaces' },
  },
  {
    mode: 'twelve_hour',
    category: 'design',
    question: 'Which logo concept should we go with?',
    expiryMinutes: 11 * 60,
    options: [
      { label: 'Option A', photo_url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&q=80', vote_count: 88 },
      { label: 'Option B', photo_url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&q=80', vote_count: 55 },
      { label: 'Option C', photo_url: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=400&q=80', vote_count: 30 },
    ],
    verdict: { idx: 0, reason: 'Higher brand recall score in studies' },
  },
]

// GET /api/seed — insert demo posts (dev only)
router.get('/', async (req, res) => {
  try {
    const { data: firstUser } = await supabase
      .from('users').select('id').limit(1).single()

    if (!firstUser) {
      return res.status(400).json({ error: 'No users in database — sign up first, then hit this endpoint' })
    }

    const userId = firstUser.id
    let inserted = 0

    for (const demo of DEMO_POSTS) {
      const expiresAt = new Date(Date.now() + demo.expiryMinutes * 60 * 1000)

      const { data: post, error: postErr } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          mode: demo.mode,
          category: demo.category,
          question: demo.question,
          status: 'active',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (postErr) { console.error('seed post error:', postErr); continue }

      const { data: opts, error: optsErr } = await supabase
        .from('options')
        .insert(demo.options.map(o => ({
          post_id: post.id,
          label: o.label,
          photo_url: o.photo_url,
          vote_count: o.vote_count,
        })))
        .select()

      if (optsErr) { console.error('seed opts error:', optsErr); continue }

      const winningOpt = opts[demo.verdict.idx]
      if (winningOpt) {
        await supabase.from('ai_verdicts').insert({
          post_id: post.id,
          recommendation_option_id: winningOpt.id,
          confidence: 0.78,
          insights: [{ text: demo.verdict.reason }],
          sources: [{ name: 'Demo data' }],
        })
      }

      inserted++
    }

    res.json({ ok: true, inserted })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
