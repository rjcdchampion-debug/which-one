require('dotenv').config()

const express  = require('express')
const cors     = require('cors')
const { supabase } = require('./supabaseClient')

const postsRouter = require('./routes/posts')
const votesRouter = require('./routes/votes')
const usersRouter = require('./routes/users')
const seedRouter  = require('./routes/seed')
const { ensureSeedStructure } = require('./seed-posts')

const app  = express()
const PORT = process.env.PORT || 4000

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174']
    : true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
//
// Interval lengths are env-configurable (defaults below are the pre-launch
// values) specifically so Railway's Serverless/sleep-on-idle feature can
// actually engage. Railway only sleeps a service after 10+ minutes with zero
// outbound traffic — these two jobs are the service's only regular outbound
// traffic (both hit Supabase), so at the old cadence (60s / 5min) the service
// could never accumulate a 10-minute quiet gap and would run (and bill) 24/7
// regardless of whether anyone was using the site. Client-side expiry
// detection (FeedScreen's 1s interval, see CLAUDE.md) already handles the
// user-visible countdown/closing UX, so this backend job is a safety-net
// cleanup pass, not something users are watching in real time — lengthening
// it is low-risk. Tighten both back up (e.g. EXPIRY_CHECK_INTERVAL_MS=60000,
// SEED_JOB_INTERVAL_MS=300000) via Railway env vars once real traffic
// justifies it — no code change needed.
const EXPIRY_CHECK_INTERVAL_MS = Number(process.env.EXPIRY_CHECK_INTERVAL_MS) || 15 * 60 * 1000  // 15 min (was 60s)
const SEED_JOB_INTERVAL_MS     = Number(process.env.SEED_JOB_INTERVAL_MS)     || 30 * 60 * 1000  // 30 min (was 5 min)

async function expirePostsJob() {
  console.log('[expiry job] running —', new Date().toISOString())
  const { data, error } = await supabase
    .from('posts')
    .update({ status: 'closed' })
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString())
    .select('id')
  if (error) console.error('[expiry job] error:', error.message)
  else console.log(`[expiry job] closed ${data?.length || 0} posts`)
}

setInterval(expirePostsJob, EXPIRY_CHECK_INTERVAL_MS)
expirePostsJob() // run once on startup

// ── Seed posts background job ──────────────────────────────────────────────────

async function seedPostsJob() {
  try {
    await ensureSeedStructure()
  } catch (err) {
    console.error('[seed job]', err.message)
  }
}

setInterval(seedPostsJob, SEED_JOB_INTERVAL_MS)
seedPostsJob() // run once on startup

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`This or That API running on http://localhost:${PORT}`)
})
