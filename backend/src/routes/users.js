const express = require('express')
const { supabase } = require('../supabaseClient')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users').select('*').eq('id', req.params.id).single()
    if (error || !user) return res.status(404).json({ error: 'User not found' })
    res.json({ user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/users — create profile after Supabase auth signup
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body
    if (!username) return res.status(400).json({ error: 'username is required' })

    // Upsert: covers the case where the profile already exists
    const { data: user, error } = await supabase
      .from('users')
      .upsert({ id: req.user.id, username, plan: 'free' }, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Username already taken' })
      }
      throw error
    }

    res.status(201).json({ user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
