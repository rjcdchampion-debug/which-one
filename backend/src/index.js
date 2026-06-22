require('dotenv').config()

const express  = require('express')
const cors     = require('cors')
const { supabase } = require('./supabaseClient')

const postsRouter = require('./routes/posts')
const votesRouter = require('./routes/votes')
const usersRouter = require('./routes/users')
const seedRouter  = require('./routes/seed')

const app  = express()
const PORT = process.env.PORT || 4000

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174']
    : true,          // allow all origins in dev
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use('/api/posts', postsRouter)
app.use('/api/votes', votesRouter)
app.use('/api/users', usersRouter)
app.use('/api/seed',  seedRouter)

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// ── Post expiry background job ─────────────────────────────────────────────────

async function expirePostsJob() {
  const { error } = await supabase
    .from('posts')
    .update({ status: 'closed' })
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString())

  if (error) console.error('[expiry job]', error.message)
}

setInterval(expirePostsJob, 60_000)
expirePostsJob() // run once on startup

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`This or That API running on http://localhost:${PORT}`)
})
