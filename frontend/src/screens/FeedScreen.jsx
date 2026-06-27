import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Bell } from 'lucide-react'
import PostCard from '../components/PostCard'
import PaymentModal from '../components/PaymentModal'
import TimerRing from '../components/TimerRing'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { MOCK_POSTS } from '../lib/mockData'
import { useAuth } from '../contexts/AuthContext'
import { useVoter } from '../hooks/useVoter'
import { usePlan } from '../hooks/usePlan'

const TABS = [
  { id: 'foryou',  label: 'For You'  },
  { id: 'live',    label: 'Live', live: true },
  { id: 'myvotes', label: 'My Votes' },
  { id: 'mine',    label: 'My Posts' },
]

const CAT_FILTERS = [
  { id: 'all',     label: 'All'     },
  { id: 'fashion', label: 'Fashion' },
  { id: 'food',    label: 'Food'    },
  { id: 'home',    label: 'Home'    },
  { id: 'design',  label: 'Design'  },
  { id: 'beauty',  label: 'Beauty'  },
]

const SUPABASE_CONFIGURED = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function FeedScreen() {
  const navigate  = useNavigate()
  const { user, profile, session } = useAuth()
  const { hasVoted } = useVoter()
  const { isPlus, recordBoost, showBoostPrompt, dismissBoostPrompt } = usePlan()

  // My Posts AI payment
  const [aiPayPostId, setAiPayPostId] = useState(null)

  async function handleAiPurchase(postId) {
    setAiPayPostId(null)
    recordBoost()
    try {
      await api.requestAiVerdict(postId, session?.access_token)
      // Refresh my posts
      const data = await api.getFeed('mine', session?.access_token)
      setPosts(data.posts || [])
    } catch {}
  }

  const [tab, setTab]         = useState('foryou')
  const [catFilter, setCatFilter] = useState('all')
  const [posts, setPosts]     = useState([])
  const [myVotes, setMyVotes] = useState([])
  const [myVotesStats, setMyVotesStats] = useState({ total: 0, majorityAgreePercent: 0 })
  const [loading, setLoading] = useState(true)

  // For You disappearing mechanic
  const [animatingPostIds, setAnimatingPostIds] = useState(new Set())
  const [collapsingPostIds, setCollapsingPostIds] = useState(new Set())
  const collapseTimersRef = useRef({})

  // Live expiry queue (main feed)
  const expiryQueueRef      = useRef([])
  const animatingPostIdRef  = useRef(null)
  const expiryTimersRef     = useRef([])
  const processedPostIdsRef = useRef(new Set()) // updated synchronously — no render lag
  const [animatingPostId, setAnimatingPostId]         = useState(null)
  const [expiryPhase, setExpiryPhase]                 = useState('none')
  const [expiringPostIds, setExpiringPostIds]         = useState(new Set())
  const [expiryCollapsingIds, setExpiryCollapsingIds] = useState(new Set())

  // Live strip expiry (fade + slide left)
  const stripTimersRef = useRef([])
  const [fadingStripIds, setFadingStripIds]       = useState(new Set())
  const [collapsingStripIds, setCollapsingStripIds] = useState(new Set())

  // Ref so the expiry checker interval always sees fresh posts without a re-render cycle
  const postsRef = useRef(posts)
  useEffect(() => { postsRef.current = posts }, [posts])

  const channelRef = useRef(null)

  // Reload when tab or auth token changes
  const authToken = (tab === 'mine' || tab === 'myvotes') ? session?.access_token : null
  useEffect(() => { loadFeed() }, [tab, authToken])

  async function loadFeed() {
    setLoading(true)
    try {
      if (tab === 'myvotes') {
        if (!session?.access_token) {
          setMyVotes([])
          setMyVotesStats({ total: 0, majorityAgreePercent: 0 })
        } else {
          const data = await api.getMyVotes(session.access_token)
          setMyVotes(data.votes || [])
          setMyVotesStats(data.stats || { total: 0, majorityAgreePercent: 0 })
        }
      } else {
        const token = tab === 'mine' ? session?.access_token : undefined
        const data  = await api.getFeed(tab, token)
        setPosts(data.posts || [])
      }
    } catch {
      if (tab !== 'myvotes') setPosts(MOCK_POSTS)
    } finally {
      setLoading(false)
    }
  }

  // Reset filters and animation state when changing tabs
  useEffect(() => {
    setCatFilter('all')
    setAnimatingPostIds(new Set())
    setCollapsingPostIds(new Set())
    Object.values(collapseTimersRef.current).forEach(clearTimeout)
    collapseTimersRef.current = {}
    // Clear expiry queue (main feed)
    expiryTimersRef.current.forEach(clearTimeout)
    expiryTimersRef.current = []
    expiryQueueRef.current = []
    processedPostIdsRef.current = new Set()
    animatingPostIdRef.current = null
    setAnimatingPostId(null)
    setExpiryPhase('none')
    setExpiringPostIds(new Set())
    setExpiryCollapsingIds(new Set())
    // Clear strip expiry
    stripTimersRef.current.forEach(clearTimeout)
    stripTimersRef.current = []
    setFadingStripIds(new Set())
    setCollapsingStripIds(new Set())
  }, [tab])

  // Client-side expiry checker: triggers animation when a live post's timer hits 0
  // without waiting for the backend cron + realtime event
  useEffect(() => {
    if (tab !== 'live') return
    const id = setInterval(() => {
      const now = Date.now()
      postsRef.current.forEach(p => {
        if (
          p.mode === 'realtime' &&
          p.status === 'active' &&
          new Date(p.expires_at) <= now &&
          !processedPostIdsRef.current.has(p.id)
        ) {
          addToExpiryQueue(p.id)
        }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [tab])

  // Supabase realtime subscription
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'options' }, (payload) => {
        setPosts(prev =>
          prev.map(post => ({
            ...post,
            options: post.options?.map(opt =>
              opt.id === payload.new.id ? { ...opt, vote_count: payload.new.vote_count } : opt
            ),
          }))
        )
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        if (payload.new.mode === 'realtime' && payload.new.status === 'active') {
          try {
            const data = await api.getPost(payload.new.id)
            if (data.post) {
              setPosts(prev => prev.some(p => p.id === data.post.id) ? prev : [data.post, ...prev])
            }
          } catch {}
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => prev.map(p =>
          p.id === payload.new.id ? { ...p, status: payload.new.status, expires_at: payload.new.expires_at } : p
        ))
        if (payload.new.status === 'closed' && payload.new.mode === 'realtime') {
          addToExpiryQueue(payload.new.id)
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_verdicts' }, async (payload) => {
        const postId = payload.new.post_id
        try {
          const data = await api.getPost(postId)
          if (data.post) {
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, ai_verdicts: data.post.ai_verdicts } : p))
          }
        } catch {}
      })
      .subscribe()
    channelRef.current = channel
    return () => supabase.removeChannel(channel)
  }, [])

  // For You: called when a vote animation starts (show message overlay)
  function handleVoteStart(postId) {
    setAnimatingPostIds(prev => new Set([...prev, postId]))
  }

  // For You: called when message overlay finishes (start card collapse)
  function handleVoteAnimationComplete(postId) {
    setAnimatingPostIds(prev => { const s = new Set(prev); s.delete(postId); return s })
    setCollapsingPostIds(prev => new Set([...prev, postId]))
    // After fade (2s) + height collapse (0.4s) = 2.4s; give 300ms buffer
    const tid = setTimeout(() => {
      setCollapsingPostIds(prev => { const s = new Set(prev); s.delete(postId); return s })
      delete collapseTimersRef.current[postId]
    }, 2700)
    collapseTimersRef.current[postId] = tid
  }

  function handleStripExpire(postId) {
    setFadingStripIds(prev => new Set([...prev, postId]))
    const t1 = setTimeout(() => {
      setFadingStripIds(prev => { const s = new Set(prev); s.delete(postId); return s })
      setCollapsingStripIds(prev => new Set([...prev, postId]))
    }, 800)
    const t2 = setTimeout(() => {
      setCollapsingStripIds(prev => { const s = new Set(prev); s.delete(postId); return s })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'closed' } : p))
    }, 1200)
    stripTimersRef.current.push(t1, t2)
  }

  function startNextExpiry() {
    const postId = expiryQueueRef.current.shift()
    if (!postId) {
      animatingPostIdRef.current = null
      setAnimatingPostId(null)
      return
    }
    animatingPostIdRef.current = postId
    setAnimatingPostId(postId)
    setExpiringPostIds(prev => new Set([...prev, postId]))
    setExpiryPhase('winner')
    // After 3s winner hold: start 2s fade
    const t1 = setTimeout(() => setExpiryPhase('fading'), 3000)
    // After 5s (3s + 2s fade): collapse height
    const t2 = setTimeout(() => {
      setExpiryPhase('none')
      setExpiryCollapsingIds(prev => new Set([...prev, postId]))
    }, 5000)
    // After 5.4s: remove from DOM, start next
    const t3 = setTimeout(() => {
      setExpiringPostIds(prev => { const s = new Set(prev); s.delete(postId); return s })
      setExpiryCollapsingIds(prev => { const s = new Set(prev); s.delete(postId); return s })
      animatingPostIdRef.current = null
      startNextExpiry()
    }, 5400)
    expiryTimersRef.current.push(t1, t2, t3)
  }

  function addToExpiryQueue(postId) {
    // Guard synchronously — no React render cycle needed, safe on slow mobile
    if (processedPostIdsRef.current.has(postId)) return
    processedPostIdsRef.current.add(postId)
    expiryQueueRef.current.push(postId)
    // Mark closed in local state so the main filter drops it after animation ends
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'closed' } : p))
    if (!animatingPostIdRef.current) startNextExpiry()
  }

  const filterByCat = (arr) =>
    catFilter === 'all' ? arr : arr.filter(p => expiringPostIds.has(p.id) || p.category === catFilter)

  // Live strip: top 3 urgency-sorted realtime posts.
  // On For You tab, exclude posts the logged-in user already voted on.
  const realtimePosts = filterByCat(
    posts
      .filter(p => {
        if (!(p.mode === 'realtime' && p.status === 'active')) return false
        if (tab === 'foryou' && user && hasVoted(p.id)) return false
        return true
      })
      .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))
  ).slice(0, 3)

  // Main post list
  const mainPosts = tab === 'myvotes' ? [] : filterByCat(
    posts
      .filter(p => {
        if (tab === 'live') return (p.mode === 'realtime' && p.status === 'active') || expiringPostIds.has(p.id)
        if (tab === 'mine') return true
        // For You: exclude live-strip posts; exclude voted posts unless mid-animation
        if (realtimePosts.includes(p)) return false
        if (user && hasVoted(p.id) && !animatingPostIds.has(p.id) && !collapsingPostIds.has(p.id)) return false
        return true
      })
      .sort((a, b) => {
        if (tab === 'live') return new Date(a.expires_at) - new Date(b.expires_at)
        return new Date(b.created_at) - new Date(a.created_at)
      })
  )

  // For You "all caught up" detection
  const allForYouVoted = tab === 'foryou' && user && posts.length > 0 &&
    posts
      .filter(p => !realtimePosts.includes(p))
      .every(p => hasVoted(p.id) && !animatingPostIds.has(p.id) && !collapsingPostIds.has(p.id))

  return (
    <>
    <div className="flex flex-col h-full bg-[#F5F5F5]">
      <header className="shrink-0 z-20 bg-white border-b border-[#E5E5E5]" style={{ borderBottomWidth: '0.5px' }}>

        {/* App bar */}
        <div className="flex justify-center">
          <div className="w-full max-w-app px-4 pt-safe flex items-center justify-between h-16">
            <button className="p-1.5 text-[#6B6B6B] hover:text-[#534AB7] transition-colors">
              <Bell size={20} strokeWidth={1.8} />
            </button>
            <div className="flex flex-col items-center">
              <h1 className="font-extrabold text-[#534AB7] tracking-tight" style={{ fontSize: 26 }}>This or That?</h1>
              <p className="text-[11px] text-[#6B6B6B] tracking-wide uppercase" style={{ marginTop: 1 }}>Let the Crowd Decide</p>
            </div>
            <button
              onClick={() => navigate(user ? '/profile' : '/login')}
              className="w-8 h-8 rounded-full bg-[#534AB7]/10 flex items-center justify-center text-[#534AB7] font-bold text-sm"
            >
              {user
                ? (profile?.username || '?')[0].toUpperCase()
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              }
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center">
          <div className="w-full max-w-app">
            <div className="flex">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                    tab === t.id ? 'border-[#534AB7] text-[#534AB7]' : 'border-transparent text-[#6B6B6B]'
                  }`}
                >
                  {t.live ? (
                    <span className="inline-flex items-center justify-center gap-1.5">
                      {t.label}
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                      </span>
                    </span>
                  ) : t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category filter — only on For You and Live tabs */}
        {(tab === 'foryou' || tab === 'live') && (
          <div className="flex justify-center">
            <div className="w-full max-w-app flex overflow-x-auto scrollbar-hide px-4 py-2 gap-2">
              {CAT_FILTERS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCatFilter(c.id)}
                  className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={{
                    background: catFilter === c.id ? '#534AB7' : '#F0F0F0',
                    color:      catFilter === c.id ? '#FFFFFF' : '#6B6B6B',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="w-full max-w-app mx-auto pb-28">
          {loading ? (
            <FeedSkeleton />
          ) : tab === 'myvotes' ? (
            /* ── My Votes ───────────────────────────────────────────── */
            <MyVotesContent
              myVotes={myVotes}
              myVotesStats={myVotesStats}
              user={user}
              navigate={navigate}
            />
          ) : tab === 'mine' ? (
            /* ── My Posts ───────────────────────────────────────────── */
            <section className="px-4 pt-4 space-y-4">
              {mainPosts.length === 0 ? (
                <EmptyState tab="mine" onPost={() => navigate('/create')} />
              ) : (
                mainPosts.map(post => {
                  const hasVerdict = post.ai_verdicts?.length > 0
                  return (
                    <div key={post.id} className="space-y-1">
                      <PostCard post={post} currentUserId={user?.id} isMyPostsView />
                      {!hasVerdict && (
                        <div
                          className="bg-white border border-[#E5E5E5] rounded-card px-4 py-3 flex items-center gap-3"
                          style={{ borderWidth: '0.5px' }}
                        >
                          <span className="text-xs text-[#6B6B6B] flex-1">
                            <span style={{ color: '#534AB7' }}>✨</span> Want AI insight on this decision?
                          </span>
                          <div className="flex gap-2 shrink-0">
                            {isPlus ? (
                              <button
                                onClick={() => api.requestAiVerdict(post.id, session?.access_token).then(() => loadFeed())}
                                className="px-3 py-1.5 bg-[#534AB7] text-white text-xs font-semibold rounded-lg"
                              >
                                Get AI verdict
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => setAiPayPostId(post.id)}
                                  className="px-3 py-1.5 bg-[#534AB7] text-white text-xs font-semibold rounded-lg"
                                >
                                  Pay £0.99
                                </button>
                                <button
                                  onClick={() => navigate('/pricing')}
                                  className="px-3 py-1.5 border border-[#534AB7] text-[#534AB7] text-xs font-semibold rounded-lg"
                                >
                                  Plus
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </section>
          ) : (
            /* ── For You / Live ─────────────────────────────────────── */
            <>
              {/* Live strip (hidden on Live tab — you're already on it) */}
              {tab !== 'live' && realtimePosts.length > 0 && (
                <section className="pt-4 pb-2">
                  <div className="flex items-center gap-1.5 mb-3 px-4">
                    <Zap size={13} className="text-[#993C1D]" fill="#993C1D" />
                    <span className="text-xs font-bold text-[#993C1D] uppercase tracking-wide">Live now</span>
                  </div>
                  <div className="flex overflow-x-auto scrollbar-hide pb-1 px-4">
                    {realtimePosts.map(post => {
                      const isFading     = fadingStripIds.has(post.id)
                      const isCollapsing = collapsingStripIds.has(post.id)
                      return (
                        <div
                          key={post.id}
                          style={{
                            flexShrink: 0,
                            overflow: 'hidden',
                            opacity:    isFading ? 0 : 1,
                            maxWidth:   isCollapsing ? 0 : 172,
                            paddingRight: isCollapsing ? 0 : 12,
                            transition: isFading
                              ? 'opacity 0.8s ease'
                              : isCollapsing
                                ? 'max-width 0.4s ease, padding-right 0.4s ease'
                                : undefined,
                          }}
                        >
                          <LiveCard
                            post={post}
                            onOpen={() => navigate(`/post/${post.id}`)}
                            onExpire={handleStripExpire}
                          />
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Main post list */}
              <section className="px-4 pt-2 space-y-3">
                {mainPosts.length === 0 ? (
                  tab === 'foryou' && allForYouVoted ? (
                    <AllCaughtUpState onBrowseLive={() => setTab('live')} />
                  ) : (
                    realtimePosts.length === 0 && <EmptyState tab={tab} onPost={() => navigate('/create')} />
                  )
                ) : (
                  mainPosts.map(post => {
                    const isForYouCollapsing = collapsingPostIds.has(post.id)
                    const isLiveCollapsing   = expiryCollapsingIds.has(post.id)
                    const isExpiring         = expiringPostIds.has(post.id)

                    let wrapperStyle
                    if (isForYouCollapsing) {
                      wrapperStyle = {
                        maxHeight: 0, opacity: 0, overflow: 'hidden', marginBottom: -12,
                        transition: 'opacity 2s ease, max-height 0.4s ease-in 2s, margin-bottom 0.4s ease 2s',
                      }
                    } else if (isLiveCollapsing) {
                      wrapperStyle = {
                        maxHeight: 0, overflow: 'hidden', marginBottom: -12,
                        transition: 'max-height 0.4s ease-in, margin-bottom 0.4s ease',
                      }
                    } else {
                      wrapperStyle = { overflow: 'hidden', maxHeight: 2000 }
                    }

                    return (
                      <div key={post.id} style={wrapperStyle}>
                        <PostCard
                          post={post}
                          currentUserId={user?.id}
                          isForYou={tab === 'foryou' && !!user}
                          onVoteStart={handleVoteStart}
                          onVoteAnimationComplete={handleVoteAnimationComplete}
                          expiryPhase={isExpiring && post.id === animatingPostId ? expiryPhase : 'none'}
                        />
                      </div>
                    )
                  })
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>

    {/* AI verdict payment modal */}
    {aiPayPostId && (
      <PaymentModal
        featureLabel="AI verdict on your post"
        price="£0.99"
        onClose={() => setAiPayPostId(null)}
        onPurchase={() => handleAiPurchase(aiPayPostId)}
      />
    )}

    {/* Boost upgrade prompt (after 3 one-off purchases) */}
    {showBoostPrompt && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={dismissBoostPrompt}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
          <p className="text-2xl mb-3">💡</p>
          <p className="font-bold text-[#1A1A1A] mb-2">You've spent on a few boosts this month</p>
          <p className="text-sm text-[#6B6B6B] mb-5">Get everything with Plus for just £4.99/month.</p>
          <button
            onClick={() => { dismissBoostPrompt(); navigate('/pricing') }}
            className="w-full py-3.5 bg-[#534AB7] text-white rounded-btn font-semibold text-sm mb-2"
          >
            Upgrade to Plus
          </button>
          <button onClick={dismissBoostPrompt} className="text-xs text-[#6B6B6B]">Maybe later</button>
        </div>
      </div>
    )}
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MyVotesContent({ myVotes, myVotesStats, user, navigate }) {
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-8">
        <p className="text-4xl mb-4">🗳️</p>
        <p className="font-semibold text-[#1A1A1A] mb-1">Sign in to see your votes</p>
        <p className="text-sm text-[#6B6B6B] mb-6">Your full voting history lives here.</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-[#534AB7] text-white rounded-btn text-sm font-semibold"
        >
          Sign in
        </button>
      </div>
    )
  }

  if (myVotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-8">
        <p className="text-4xl mb-4">🗳️</p>
        <p className="font-semibold text-[#1A1A1A] mb-1">No votes yet</p>
        <p className="text-sm text-[#6B6B6B] mb-6">Start voting on polls to build your history.</p>
      </div>
    )
  }

  return (
    <>
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm text-[#6B6B6B]">
          <span className="font-semibold text-[#1A1A1A]">{myVotesStats.total}</span> polls decided
          {' · '}You agree with the majority{' '}
          <span className="font-semibold" style={{ color: '#534AB7' }}>{myVotesStats.majorityAgreePercent}%</span>
          {' '}of the time
        </p>
      </div>
      <section className="px-4 pt-2 space-y-3">
        {myVotes.map(vote => (
          <PostCard
            key={`${vote.id}_vote`}
            post={vote}
            currentUserId={user?.id}
            initialVotedOptionId={vote.voted_option_id}
          />
        ))}
      </section>
    </>
  )
}

function LiveCard({ post, onOpen, onExpire }) {
  const options    = post.options || []
  const totalVotes = options.reduce((s, o) => s + (o.vote_count || 0), 0)
  const [activeIdx, setActiveIdx] = useState(0)
  const [visible, setVisible]     = useState(true)
  const hasFiredRef = useRef(false)

  useEffect(() => {
    if (options.length < 2) return
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setActiveIdx(i => (i + 1) % options.length)
        setVisible(true)
      }, 800)
    }, 3500)
    return () => clearInterval(id)
  }, [options.length])

  // Independent countdown — fires onExpire the moment expires_at passes
  useEffect(() => {
    const id = setInterval(() => {
      if (!hasFiredRef.current && new Date(post.expires_at) <= new Date()) {
        hasFiredRef.current = true
        onExpire?.(post.id)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [post.expires_at, post.id])

  // Also react immediately if realtime marks status closed
  useEffect(() => {
    if (post.status === 'closed' && !hasFiredRef.current) {
      hasFiredRef.current = true
      onExpire?.(post.id)
    }
  }, [post.status])

  const cover    = options[activeIdx]?.photo_url
  const optLabel = String.fromCharCode(65 + activeIdx)

  return (
    <button
      onClick={onOpen}
      className="relative shrink-0 rounded-card overflow-hidden text-left"
      style={{ width: 160, height: 240 }}
    >
      {cover
        ? <img
            src={cover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease' }}
          />
        : <div className="absolute inset-0 bg-[#E5E5E5]" />
      }

      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: '55%', background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)' }}
      />

      <div className="absolute top-2 right-2">
        <TimerRing expiresAt={post.expires_at} totalMinutes={15} size="sm" />
      </div>

      <div
        className="absolute top-2 left-2 bg-white/90 rounded-full px-2 py-0.5"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease' }}
      >
        <span className="text-[10px] font-bold text-[#1A1A1A]">{optLabel}</span>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-3">
        <p className="text-white text-xs font-semibold leading-snug line-clamp-2">{post.question}</p>
        <p className="text-white font-bold text-[10px] mt-1">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
      </div>
    </button>
  )
}

function FeedSkeleton() {
  return (
    <div className="px-4 pt-4 space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-card p-4 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-[#E5E5E5]" />
            <div className="h-3 w-24 bg-[#E5E5E5] rounded" />
          </div>
          <div className="h-4 w-3/4 bg-[#E5E5E5] rounded mb-3" />
          <div className="grid grid-cols-2 gap-2">
            <div className="aspect-square bg-[#E5E5E5] rounded-lg" />
            <div className="aspect-square bg-[#E5E5E5] rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ tab, onPost }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
      <p className="text-4xl mb-4">🔀</p>
      <p className="font-semibold text-[#1A1A1A] mb-1">
        {tab === 'mine' ? 'No posts yet' : 'Nothing here yet'}
      </p>
      <p className="text-sm text-[#6B6B6B] mb-6">
        {tab === 'mine'
          ? 'Create your first post and get instant votes.'
          : 'Be the first to post something.'}
      </p>
      <button
        onClick={onPost}
        className="px-6 py-3 bg-[#534AB7] text-white rounded-btn text-sm font-semibold"
      >
        Create a post
      </button>
    </div>
  )
}

function AllCaughtUpState({ onBrowseLive }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
      <p className="text-4xl mb-4">✅</p>
      <p className="font-semibold text-[#1A1A1A] mb-1">You're all caught up!</p>
      <p className="text-sm text-[#6B6B6B] mb-6">Check back soon for new polls.</p>
      <button
        onClick={onBrowseLive}
        className="px-6 py-3 bg-[#534AB7] text-white rounded-btn text-sm font-semibold"
      >
        Browse Live
      </button>
    </div>
  )
}
