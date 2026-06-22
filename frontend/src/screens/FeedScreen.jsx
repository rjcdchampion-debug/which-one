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
  { id: 'live',     label: 'Live 🔴'  },
  { id: 'trending', label: 'Trending' },
  { id: 'mine',     label: 'My Posts' },
]

const SUPABASE_CONFIGURED = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function FeedScreen() {
  const navigate        = useNavigate()
  const { user, profile, session } = useAuth()
  const [tab, setTab]   = useState('foryou')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const channelRef = useRef(null)

  // Only re-fetch when session changes if we're on the mine tab
  const mineToken = tab === 'mine' ? session?.access_token : null
  useEffect(() => {
    loadFeed()
  }, [tab, mineToken])

  async function loadFeed() {
    setLoading(true)
    setError(null)
    try {
      const queryTab = tab === 'live' ? 'foryou' : tab
      const token = tab === 'mine' ? session?.access_token : undefined
      const data = await api.getFeed(queryTab, token)
      let posts = data.posts || []
      if (tab === 'live') {
        posts = posts.filter(p => p.mode === 'realtime' && p.status === 'active')
      }
      setPosts(posts)
    } catch (err) {
      setPosts(MOCK_POSTS)
    } finally {
      setLoading(false)
    }
  }

  // Supabase realtime subscription for live vote count updates
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return

    const channel = supabase
      .channel('feed-options')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'options' },
        (payload) => {
          setPosts(prev =>
            prev.map(post => ({
              ...post,
              options: post.options?.map(opt =>
                opt.id === payload.new.id ? { ...opt, vote_count: payload.new.vote_count } : opt
              ),
            }))
          )
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => supabase.removeChannel(channel)
  }, [])

  const realtimePosts = posts
    .filter(p => p.mode === 'realtime' && p.status === 'active')
    .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))
    .slice(0, 3)

  const mainPosts = posts
    .filter(p => tab === 'live' || !(p.mode === 'realtime' && realtimePosts.includes(p)))
    .sort((a, b) => {
      const aVotes = (a.options || []).reduce((s, o) => s + (o.vote_count || 0), 0)
      const bVotes = (b.options || []).reduce((s, o) => s + (o.vote_count || 0), 0)
      return bVotes - aVotes
    })

  return (
    <div className="flex flex-col h-full bg-[#F5F5F5]">
      {/* App bar */}
      <header className="shrink-0 z-20 bg-white border-b border-[#E5E5E5]" style={{ borderBottomWidth: '0.5px' }}>
        <div className="flex justify-center">
          <div className="w-full max-w-app px-4 pt-safe flex items-center justify-between h-14">
            <button className="p-1.5 text-[#6B6B6B] hover:text-[#534AB7] transition-colors">
              <Bell size={20} strokeWidth={1.8} />
            </button>
            <h1 className="text-2xl font-extrabold text-[#534AB7] tracking-tight">Which One?</h1>
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

        {/* Stats bar */}
        <StatsBar />

        {/* Tabs */}
        <div className="flex justify-center">
          <div className="w-full max-w-app">
            <div className="flex overflow-x-auto scrollbar-hide px-4 gap-0">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-[#534AB7] text-[#534AB7]'
                      : 'border-transparent text-[#6B6B6B]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="w-full max-w-app mx-auto pb-28">
          {loading ? (
            <FeedSkeleton />
          ) : (
            <>
              {/* Live strip — hidden on the Live tab (already shown in feed there) */}
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

              {/* Main feed */}
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
  const cover      = options[0]?.photo_url
  const totalVotes = options.reduce((s, o) => s + (o.vote_count || 0), 0)

  return (
    <button
      onClick={onOpen}
      className="relative shrink-0 rounded-card overflow-hidden text-left"
      style={{ width: 160, height: 240 }}
    >
      {/* Full-bleed photo */}
      {cover
        ? <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
        : <div className="absolute inset-0 bg-[#E5E5E5]" />
      }

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      {/* Timer ring — top right */}
      <div className="absolute top-2 right-2">
        <TimerRing expiresAt={post.expires_at} totalMinutes={15} size="sm" />
      </div>

      {/* "or" badge — top left */}
      <div className="absolute top-2 left-2 bg-white/90 rounded-full px-2 py-0.5">
        <span className="text-[10px] font-bold text-[#1A1A1A]">or</span>
      </div>

      {/* Question + vote count — bottom */}
      <div className="absolute bottom-0 inset-x-0 p-3">
        <p className="text-white text-xs font-semibold leading-snug line-clamp-3">{post.question}</p>
        <p className="text-white/60 text-[10px] mt-1">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
      </div>
    </button>
  )
}

function StatsBar() {
  const [stats, setStats] = useState({ members: 0, online: 0, loaded: false })

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [])

  async function load() {
    try {
      const [{ count: members }, { count: online }] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()),
      ])
      setStats({ members: members ?? 0, online: online ?? 0, loaded: true })
    } catch {
      setStats(s => ({ ...s, loaded: true }))
    }
  }

  if (!stats.loaded) return null

  return (
    <div className="flex justify-center bg-white border-b border-[#E5E5E5]" style={{ borderBottomWidth: '0.5px' }}>
      <div className="w-full max-w-app px-4 py-1.5 flex items-center justify-center">
        <p className="text-[11px] text-[#6B6B6B]">
          <span className="font-semibold text-[#1A1A1A]">{stats.members.toLocaleString()}</span> members
          {' · '}
          <span className="font-semibold text-[#0F6E56]">{stats.online}</span> online
        </p>
      </div>
    </div>
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
