const express = require('express')
const { supabase } = require('../supabaseClient')

const router = express.Router()

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

    // Return refreshed options
    const { data: updatedOptions } = await supabase
      .from('options').select('*').eq('post_id', post_id)

    res.json({ success: true, post: { options: updatedOptions } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
