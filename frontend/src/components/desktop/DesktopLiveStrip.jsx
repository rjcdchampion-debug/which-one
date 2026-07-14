import { useState, useEffect, useRef } from 'react'
import { Zap, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import TimerRing from '../TimerRing'

function countdown(expiresAt) {
  const secondsLeft = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  return { secondsLeft, label: `${mins}:${String(secs).padStart(2, '0')}` }
}

function DecisionPairCard({ post, onOpen, onExpire }) {
  const options    = post.options || []
  const [a, b]     = options
  const totalVotes = options.reduce((s, o) => s + (o.vote_count || 0), 0)
  const [time, setTime] = useState(() => countdown(post.expires_at))
  const hasFiredRef = useRef(false)

  useEffect(() => {
    const id = setInterval(() => {
      const c = countdown(post.expires_at)
      setTime(c)
      if (!hasFiredRef.current && c.secondsLeft <= 0) {
        hasFiredRef.current = true
        onExpire?.(post.id)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [post.expires_at, post.id])

  useEffect(() => {
    if (post.status === 'closed' && !hasFiredRef.current) {
      hasFiredRef.current = true
      onExpire?.(post.id)
    }
  }, [post.status])

  const urgent = time.secondsLeft < 120

  return (
    <button
      onClick={onOpen}
      className="shrink-0 w-[236px] bg-white border border-[#E5E5E5] rounded-card text-left p-2"
      style={{ borderWidth: '0.5px' }}
    >
      <div className="relative flex gap-1 h-[188px]">
        {a?.photo_url
          ? <img src={a.photo_url} alt="" className="w-1/2 h-full object-cover rounded-lg" />
          : <div className="w-1/2 h-full bg-[#E5E5E5] rounded-lg" />}
        {b?.photo_url
          ? <img src={b.photo_url} alt="" className="w-1/2 h-full object-cover rounded-lg" />
          : <div className="w-1/2 h-full bg-[#E5E5E5] rounded-lg" />}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center text-[10px] text-[#6B6B6B]"
          style={{ borderWidth: '0.5px' }}
        >
          or
        </div>
      </div>
      <div className="pt-2.5 px-0.5 pb-0.5">
        <p className="text-xs font-semibold text-[#1A1A1A] leading-snug line-clamp-2">{post.question}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[11px] text-[#6B6B6B]">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
          <span className="text-[11px] font-bold" style={{ color: urgent ? '#993C1D' : '#534AB7' }}>{time.label}</span>
        </div>
      </div>
    </button>
  )
}

function HeroBanner({ posts, onOpen }) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (idx >= posts.length) setIdx(0)
  }, [posts.length])

  useEffect(() => {
    if (posts.length < 2) return
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % posts.length)
        setVisible(true)
      }, 500)
    }, 7500)
    return () => clearInterval(id)
  }, [posts.length])

  const post = posts[idx]
  if (!post) return null
  const options = post.options || []
  const totalVotes = options.reduce((s, o) => s + (o.vote_count || 0), 0)

  return (
    // Height is a literal, not content-derived — CategorySidebar.jsx's Categories
    // panel is pinned to a height computed from this exact number (248 = label +
    // this 220) so its bottom edge lines up with this banner's bottom edge. If
    // this height ever changes, CATEGORIES_PANEL_HEIGHT there needs to change too.
    <button
      onClick={() => onOpen(post)}
      className="relative w-full rounded-card overflow-hidden text-left block"
      style={{ height: 220, opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}
    >
      <div className="absolute inset-0 grid grid-cols-2 gap-1.5">
        {[0, 1].map(i => {
          const o = options[i]
          return (
            <div key={o?.id || i} className="relative">
              {o?.photo_url
                ? <img src={o.photo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                : <div className="w-full h-full bg-[#E5E5E5] rounded-xl" />}
              <span className="absolute top-3 left-3 w-6 h-6 rounded-full bg-white/95 flex items-center justify-center text-[11px] font-bold text-[#1A1A1A]">
                {String.fromCharCode(65 + i)}
              </span>
            </div>
          )
        })}
      </div>
      <div
        className="absolute inset-0 rounded-xl"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)', pointerEvents: 'none' }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center text-sm font-semibold text-[#6B6B6B]" style={{ borderWidth: '0.5px' }}>
        or
      </div>
      <div className="absolute top-3 right-3">
        <TimerRing expiresAt={post.expires_at} totalMinutes={15} size="md" />
      </div>
      <div className="absolute bottom-0 inset-x-0 p-5">
        {post.featured_paid ? (
          <span className="inline-flex items-center gap-1.5 mb-2 px-2 py-0.5 bg-[#534AB7] rounded-full">
            <Sparkles size={11} className="text-white" fill="white" />
            <span className="text-white text-[10px] font-bold uppercase tracking-wide">Featured decision</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 mb-2 px-2 py-0.5 bg-[#993C1D] rounded-full">
            <Zap size={11} className="text-white" fill="white" />
            <span className="text-white text-[10px] font-bold uppercase tracking-wide">Deciding right now</span>
          </span>
        )}
        <p className="text-white text-lg font-bold leading-snug max-w-md">{post.question}</p>
        <p className="text-white/80 text-xs mt-1">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
      </div>
    </button>
  )
}

export default function DesktopLiveStrip({ posts, fadingStripIds, collapsingStripIds, onOpen, onExpire }) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft]   = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function updateScrollState() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateScrollState()
  }, [posts.length])

  function scrollByPage(direction) {
    scrollRef.current?.scrollBy({ left: direction * 500, behavior: 'smooth' })
  }

  if (posts.length === 0) return null

  // Paid-featured posts get first claim on the hero slot; if nobody's paid for
  // Featured placement yet, fall back to auto-picking from the live pool so the
  // section is never empty.
  const paidFeatured = posts.filter(p => p.featured_paid)
  const heroPool = paidFeatured.length > 0 ? paidFeatured : posts

  return (
    <section className="mb-6">
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles size={13} className="text-[#534AB7]" fill="#534AB7" />
        <span className="text-xs font-bold text-[#534AB7] uppercase tracking-wide">Featured</span>
      </div>
      <HeroBanner posts={heroPool} onOpen={onOpen} />

      <div className="flex items-center gap-1.5 mt-6 mb-3">
        <Zap size={13} className="text-[#993C1D]" fill="#993C1D" />
        <span className="text-xs font-bold text-[#993C1D] uppercase tracking-wide">Live now</span>
      </div>
      <div className="relative">
        {canScrollLeft && (
          <button
            onClick={() => scrollByPage(-1)}
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-[#E5E5E5] shadow-md flex items-center justify-center hover:bg-[#F5F5F5]"
            style={{ borderWidth: '0.5px' }}
          >
            <ChevronLeft size={16} className="text-[#1A1A1A]" />
          </button>
        )}
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex overflow-x-auto scrollbar-hide gap-3 pb-1"
        >
          {posts.map(post => {
            const isFading     = fadingStripIds.has(post.id)
            const isCollapsing = collapsingStripIds.has(post.id)
            return (
              <div
                key={post.id}
                style={{
                  flexShrink: 0,
                  overflow: 'hidden',
                  opacity:  isFading ? 0 : 1,
                  maxWidth: isCollapsing ? 0 : 236,
                  transition: isFading
                    ? 'opacity 0.8s ease'
                    : isCollapsing
                      ? 'max-width 0.4s ease'
                      : undefined,
                }}
              >
                <DecisionPairCard post={post} onOpen={() => onOpen(post)} onExpire={onExpire} />
              </div>
            )
          })}
        </div>
        {canScrollRight && (
          <button
            onClick={() => scrollByPage(1)}
            aria-label="Scroll right"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-[#E5E5E5] shadow-md flex items-center justify-center hover:bg-[#F5F5F5]"
            style={{ borderWidth: '0.5px' }}
          >
            <ChevronRight size={16} className="text-[#1A1A1A]" />
          </button>
        )}
      </div>
    </section>
  )
}
