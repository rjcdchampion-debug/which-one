import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Bell } from 'lucide-react'
import PostCard from '../components/PostCard'
import TimerRing from '../components/TimerRing'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { MOCK_POSTS } from '../lib/mockData'
import { useAuth } from '../contexts/AuthContext'

const TABS = [
  { id: 'foryou',   label: 'For You'  },
  { id: 'live',     label: 'Live', live: true },
  { id: 'trending', label: 'Trending' },
  { id: 'mine',     label: 'My Posts' },
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
  const [tab, setTab]         = useState('foryou')
  const [catFilter, setCatFilter] = useState('all')
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const mineToken = tab === 'mine' ? session?.access_token : null
  useEffect(() => { loadFeed() }, [tab, mineToken])

  async function loadFeed() {
    setLoading(true)
    try {
      const queryTab = tab === 'live' ? 'foryou' : tab
      const token = tab === 'mine' ? session?.access_token : undefined
      const data = await api.getFeed(queryTab, token)
      let fetched = data.posts || []
      if (tab === 'live') fetched = fetched.filter(p => p.mode === 'realtime' && p.status === 'active')
      setPosts(fetched)
    } catch {
      setPosts(MOCK_POSTS)
    } finally {
      setLoading(false)
    }
  }

  // Reset category filter when changing tabs
  useEffect(() => { setCatFilter('all') }, [tab])

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return
    const channel = supabase
      .channel('feed-realtime')
      // Vote count updates
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
      // New post inserted — fetch full post (with options) and prepend to state
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
      // Post status changes (e.g. expired → closed)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => prev.map(p =>
          p.id === payload.new.id ? { ...p, status: payload.new.status, expires_at: payload.new.expires_at } : p
        ))
      })
      // AI verdict inserted — refresh that post so the AI strip updates immediately
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

  const filterByCat = (arr) =>
    catFilter === 'all' ? arr : arr.filter(p => p.category === catFilter)

  // Filter by category FIRST, then get top 3 realtime posts for live strip
  const realtimePostsUnfiltered = posts
    .filter(p => p.mode === 'realtime' && p.status === 'active')
    .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))

  const realtimePosts = filterByCat(realtimePostsUnfiltered).slice(0, 3)

  // Main feed: exclude the live strip posts when not on live tab
  const mainPosts = filterByCat(
    posts.filter(p => {
      if (tab === 'live') return p.mode === 'realtime' && p.status === 'active'
      return !realtimePosts.includes(p)
    })
      .sort((a, b) => {
        if (tab === 'trending') {
          const aV = (a.options || []).reduce((s, o) => s + (o.vote_count || 0), 0)
          const bV = (b.options || []).reduce((s, o) => s + (o.vote_count || 0), 0)
          return bV - aV
        }
        if (tab === 'live') {
          return new Date(a.expires_at) - new Date(b.expires_at)
        }
        return new Date(b.created_at) - new Date(a.created_at)
      })
  )

  return (
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
                  className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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

        {/* Category filter — hidden on Mine tab */}
        {tab !== 'mine' && (
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
          ) : (
            <>
              {tab !== 'live' && realtimePosts.length > 0 && (
                <section className="pt-4 pb-2">
                  <div className="flex items-center gap-1.5 mb-3 px-4">
                    <Zap size={13} className="text-[#993C1D]" fill="#993C1D" />
                    <span className="text-xs font-bold text-[#993C1D] uppercase tracking-wide">Live now</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 px-4">
                    {realtimePosts.map(post => (
                      <LiveCard key={post.id} post={post} onOpen={() => navigate(`/post/${post.id}`)} />
                    ))}
                  </div>
                </section>
              )}

              <section className="px-4 pt-2 space-y-3">
                {mainPosts.map(post => (
                  <PostCard key={post.id} post={post} currentUserId={user?.id} />
                ))}
                {mainPosts.length === 0 && realtimePosts.length === 0 && (
                  <EmptyState tab={tab} onPost={() => navigate('/create')} />
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function LiveCard({ post, onOpen }) {
  const options    = post.options || []
  const totalVotes = options.reduce((s, o) => s + (o.vote_count || 0), 0)
  const [activeIdx, setActiveIdx] = useState(0)
  const [visible, setVisible]     = useState(true)

  useEffect(() => {
    if (options.length < 2) return
    const id = setInterval(() => {
      // Fade out over 0.8s, then swap photo + label, then fade back in
      setVisible(false)
      setTimeout(() => {
        setActiveIdx(i => (i + 1) % options.length)
        setVisible(true)
      }, 800)
    }, 3500)
    return () => clearInterval(id)
  }, [options.length])

  const cover    = options[activeIdx]?.photo_url
  const optLabel = String.fromCharCode(65 + activeIdx)

  return (
    <button
      onClick={onOpen}
      className="relative shrink-0 rounded-card overflow-hidden text-left"
      style={{ width: 160, height: 240 }}
    >
      {/* Photo — fades smoothly */}
      {cover
        ? <img
            src={cover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease' }}
          />
        : <div className="absolute inset-0 bg-[#E5E5E5]" />
      }

      {/* Subtle gradient only at the bottom — just enough to read text */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: '55%', background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)' }}
      />

      {/* Timer ring — top right */}
      <div className="absolute top-2 right-2">
        <TimerRing expiresAt={post.expires_at} totalMinutes={15} size="sm" />
      </div>

      {/* A/B/C/D pill — top left, fades with photo */}
      <div
        className="absolute top-2 left-2 bg-white/90 rounded-full px-2 py-0.5"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease' }}
      >
        <span className="text-[10px] font-bold text-[#1A1A1A]">{optLabel}</span>
      </div>

      {/* Question + vote count */}
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
