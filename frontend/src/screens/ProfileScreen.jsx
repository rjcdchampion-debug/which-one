import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Pencil, Check, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

const PLAN_STYLES = {
  free: { bg: '#F5F5F5', text: '#6B6B6B', label: 'Free' },
  plus: { bg: '#534AB7/10', text: '#534AB7', label: 'Plus' },
  pro:  { bg: '#0F6E56/10', text: '#0F6E56', label: 'Pro' },
}

function Avatar({ url, username, size = 72 }) {
  const initial = (username || '?')[0].toUpperCase()
  return url
    ? <img src={url} alt={username} style={{ width: size, height: size }} className="rounded-full object-cover" />
    : (
      <div
        className="rounded-full bg-[#534AB7]/10 flex items-center justify-center text-[#534AB7] font-bold"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {initial}
      </div>
    )
}

export default function ProfileScreen() {
  const navigate       = useNavigate()
  const { user, profile, session, signOut } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameError, setUsernameError] = useState(null)
  const [usernameSaving, setUsernameSaving] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    api.getFeed('mine', session?.access_token)
      .then(({ posts }) => setPosts(posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [user])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function startEditUsername() {
    setUsernameInput(profile?.username || '')
    setUsernameError(null)
    setEditingUsername(true)
  }

  async function saveUsername() {
    const val = usernameInput.trim().toLowerCase()
    if (val.length < 3) { setUsernameError('At least 3 characters'); return }
    if (!/^[a-z0-9_.]+$/.test(val)) { setUsernameError('Letters, numbers, _ and . only'); return }
    setUsernameSaving(true)
    setUsernameError(null)
    try {
      await api.createUserProfile({ id: user.id, username: val }, session?.access_token)
      // Refresh page to re-fetch profile
      window.location.reload()
    } catch (err) {
      setUsernameError(err.message || 'Could not save username')
      setUsernameSaving(false)
    }
  }

  const username  = profile?.username || 'you'
  const plan      = profile?.plan || 'free'
  const planStyle = PLAN_STYLES[plan] || PLAN_STYLES.free

  const activePosts = posts.filter(p => p.status === 'active')
  const closedPosts = posts.filter(p => p.status === 'closed')

  return (
    <div className="h-full overflow-y-auto bg-[#F5F5F5]" style={{ WebkitOverflowScrolling: 'touch' }}>
      <header className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5]" style={{ borderBottomWidth: '0.5px' }}>
        <div className="flex justify-center">
          <div className="w-full max-w-app px-4 h-14 flex items-center justify-between">
            <h2 className="font-semibold text-[#1A1A1A]">Profile</h2>
            <button onClick={handleSignOut} className="p-1.5 text-[#6B6B6B]">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex justify-center">
        <div className="w-full max-w-app px-4 pb-28">
          {/* Profile card */}
          <div className="mt-4 bg-white rounded-card border border-[#E5E5E5] p-5 flex items-center gap-4" style={{ borderWidth: '0.5px' }}>
            <Avatar url={profile?.avatar_url} username={username} />
            <div className="flex-1 min-w-0">
              {editingUsername ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#6B6B6B]">@</span>
                    <input
                      autoFocus
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') setEditingUsername(false) }}
                      className="flex-1 text-sm font-medium border border-[#534AB7] rounded px-2 py-1 text-[#1A1A1A] outline-none"
                      maxLength={30}
                      disabled={usernameSaving}
                    />
                    <button onClick={saveUsername} disabled={usernameSaving} className="p-1 text-[#0F6E56]">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingUsername(false)} className="p-1 text-[#6B6B6B]">
                      <X size={16} />
                    </button>
                  </div>
                  {usernameError && <p className="text-xs text-red-500 pl-4">{usernameError}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[#1A1A1A] text-lg truncate">@{username}</p>
                  <button onClick={startEditUsername} className="p-1 text-[#6B6B6B] hover:text-[#534AB7] transition-colors shrink-0">
                    <Pencil size={14} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: '#F5F5F5', color: planStyle.text }}
                >
                  {planStyle.label}
                </span>
                <span className="text-xs text-[#6B6B6B]">{posts.length} posts</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: 'Total posts', value: posts.length },
              { label: 'Active',      value: activePosts.length },
              { label: 'Closed',      value: closedPosts.length },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-card border border-[#E5E5E5] py-3 px-2 text-center" style={{ borderWidth: '0.5px' }}>
                <p className="text-xl font-bold text-[#1A1A1A]">{value}</p>
                <p className="text-[11px] text-[#6B6B6B] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Posts grid */}
          {loading ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="aspect-square bg-white rounded-card animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="mt-10 text-center">
              <p className="text-[#6B6B6B] text-sm">No posts yet.</p>
              <button
                onClick={() => navigate('/create')}
                className="mt-3 px-5 py-2.5 bg-[#534AB7] text-white rounded-btn text-sm font-semibold"
              >
                Create your first post
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {activePosts.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Active</p>
                  <PostGrid posts={activePosts} onOpen={(id) => navigate(`/post/${id}`)} />
                </>
              )}
              {closedPosts.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mt-4">Closed</p>
                  <PostGrid posts={closedPosts} closed onOpen={(id) => navigate(`/post/${id}`)} />
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function PostGrid({ posts, closed = false, onOpen }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {posts.map(post => {
        const options = post.options || []
        const cover   = options[0]?.photo_url
        const totalVotes = options.reduce((s, o) => s + (o.vote_count || 0), 0)
        const winner = closed
          ? options.reduce((mx, o) => (!mx || o.vote_count > mx.vote_count ? o : mx), null)
          : null

        return (
          <button
            key={post.id}
            onClick={() => onOpen(post.id)}
            className="relative rounded-card overflow-hidden bg-white text-left"
          >
            {cover ? (
              <img src={cover} alt="" className="w-full aspect-square object-cover" />
            ) : (
              <div className="w-full aspect-square bg-[#F5F5F5] flex items-center justify-center">
                <span className="text-2xl">📷</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="text-white text-[11px] font-medium leading-snug line-clamp-2">
                {post.question}
              </p>
              <p className="text-white/70 text-[10px] mt-0.5">{totalVotes} votes</p>
            </div>
            {closed && winner && (
              <div className="absolute top-2 left-2 bg-[#0F6E56] px-1.5 py-0.5 rounded-full text-white text-[10px] font-semibold">
                Winner: {winner.label}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
