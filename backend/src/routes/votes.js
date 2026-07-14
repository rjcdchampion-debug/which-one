const express = require('express')
const { supabase } = require('../supabaseClient')

const router = express.Router()

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

// See posts.js sortOptions — options have no reliable DB-ordered column, so we
// restore the intended A/B/C/D display order by sorting on label after fetch.
function sortOptions(arr) {
  return [...arr].sort((a, b) => (a.label || '').localeCompare(b.label || ''))
}

// GET /api/votes/mine — returns posts the current user voted on, newest first
router.get('/mine', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Auth required' })

    let userId
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
      userId = payload.sub
    } catch {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const { data: votes, error: votesErr } = await supabase
      .from('votes')
      .select('post_id, option_id, created_at')
      .eq('voter_id', userId)
      .eq('voter_type', 'human')
      .order('created_at', { ascending: false })

    if (votesErr) throw votesErr
    if (!votes?.length) return res.json({ votes: [], stats: { total: 0, majorityAgreePercent: 0 } })

    // Deduplicate post IDs (preserve order — newest vote first)
    const seen = new Set()
    const postIds = []
    const voteByPost = {}
    for (const v of votes) {
      if (!seen.has(v.post_id)) {
        seen.add(v.post_id)
        postIds.push(v.post_id)
        voteByPost[v.post_id] = v
      }
    }

    const { data: posts } = await supabase.from('posts').select('*').in('id', postIds)
    if (!posts?.length) return res.json({ votes: [], stats: { total: 0, majorityAgreePercent: 0 } })

    const [{ data: options }, { data: users }, { data: verdicts }] = await Promise.all([
      supabase.from('options').select('*').in('post_id', postIds),
      supabase.from('users').select('id, username, avatar_url').in('id', posts.map(p => p.user_id)),
      supabase.from('ai_verdicts').select('*').in('post_id', postIds),
    ])

    const optionsByPost  = groupBy(options || [], 'post_id')
    const usersById      = indexBy(users || [], 'id')
    const verdictsByPost = groupBy(verdicts || [], 'post_id')
    const postsById      = indexBy(posts, 'id')

    const result = postIds
      .map(id => {
        const p = postsById[id]
        if (!p) return null
        return {
          ...p,
          options:         sortOptions(optionsByPost[id] || []),
          users:           usersById[p.user_id] || null,
          ai_verdicts:     verdictsByPost[id] || [],
          voted_option_id: voteByPost[id].option_id,
          vote_created_at: voteByPost[id].created_at,
        }
      })
      .filter(Boolean)

    let agreedCount = 0
    result.forEach(item => {
      const opts  = item.options || []
      const total = opts.reduce((s, o) => s + (o.vote_count || 0), 0)
      if (!total) return
      const winner = opts.reduce((mx, o) => (!mx || o.vote_count > mx.vote_count ? o : mx), null)
      if (winner?.id === item.voted_option_id) agreedCount++
    })

    res.json({
      votes: result,
      stats: {
        total: result.length,
        majorityAgreePercent: result.length ? Math.round((agreedCount / result.length) * 100) : 0,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/votes
router.post('/', async (req, res) => {
  try {
    const { post_id, option_id, voter_id } = req.body

    if (!post_id || !option_id) {
      return res.status(400).json({ error: 'post_id and option_id are required' })
    }

    // Resolve voter id (auth user or guest)
    const token = req.headers.authorization?.split(' ')[1]
    let resolvedVoterId = voter_id

    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
        if (payload.sub) resolvedVoterId = payload.sub
      } catch {}
    }

    if (!resolvedVoterId) {
      return res.status(400).json({ error: 'voter_id is required for guest votes' })
    }

    // Check for duplicate vote
    const { data: existing } = await supabase
      .from('votes')
      .select('id')
      .eq('post_id', post_id)
      .eq('voter_id', resolvedVoterId)
      .maybeSingle()

    if (existing) {
      return res.status(409).json({ error: 'Already voted on this post' })
    }

    // Check post is still active
    const { data: post } = await supabase
      .from('posts').select('status').eq('id', post_id).single()
    if (!post || post.status !== 'active') {
      return res.status(400).json({ error: 'Post is closed' })
    }

    // Insert vote
    const { error: voteErr } = await supabase.from('votes').insert({
      post_id,
      option_id,
      voter_id:   resolvedVoterId,
      voter_type: 'human',
    })
    if (voteErr) {
      if (voteErr.code === '23505') {
        return res.status(409).json({ error: 'Already voted on this post' })
      }
      throw voteErr
    }

    // Increment vote_count
    const { data: currentOpt } = await supabase
      .from('options').select('vote_count').eq('id', option_id).single()
    await supabase
      .from('options')
      .update({ vote_count: (currentOpt?.vote_count || 0) + 1 })
      .eq('id', option_id)

    // Remove AI vote once 50 human votes reached
    const { count: humanCount } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post_id)
      .eq('voter_type', 'human')

    if ((humanCount || 0) >= 50) {
      const { data: aiVote } = await supabase
        .from('votes').select('option_id').eq('post_id', post_id).eq('voter_type', 'ai').maybeSingle()

      if (aiVote) {
        const { data: aiOpt } = await supabase
          .from('options').select('vote_count').eq('id', aiVote.option_id).single()
        if (aiOpt && aiOpt.vote_count > 0) {
          await supabase
            .from('options')
            .update({ vote_count: aiOpt.vote_count - 1 })
            .eq('id', aiVote.option_id)
        }
        await supabase.from('votes').delete().eq('post_id', post_id).eq('voter_type', 'ai')
      }
    }

    // Return refreshed options — sorted by label since Supabase doesn't guarantee
    // fetch order, and this array replaces PostCard's option state positionally.
    const { data: updatedOptions } = await supabase
      .from('options').select('*').eq('post_id', post_id)

    res.json({ success: true, post: { options: sortOptions(updatedOptions || []) } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
