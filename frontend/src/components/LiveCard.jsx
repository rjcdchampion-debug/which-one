import { useState, useEffect, useRef } from 'react'

const SIZES = {
  sm: { width: 160, height: 240 },
  lg: { width: 220, height: 300 },
}

function getSecondsLeft(expiresAt) {
  return Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
}

function formatCountdown(secondsLeft) {
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

// `cycleTick` is owned by the parent (FeedScreen) and shared across every
// LiveCard in the strip — one interval driving all cards instead of each card
// running its own setInterval. Independent per-card timers used to start at
// whatever moment each card happened to mount, so cards drifted out of phase
// and flipped at different times ("busy" look). A shared tick means every
// card recomputes its target index at the same instant.
export default function LiveCard({ post, onOpen, onExpire, size = 'sm', cycleTick = 0 }) {
  // Defensive sort: the backend now returns options pre-sorted by label, but
  // this guards against any path that doesn't (e.g. mockData.js fallback) —
  // without it, options can render in the wrong A/B order or flip position
  // after a vote_count update, since Postgres doesn't guarantee fetch order.
  const options = [...(post.options || [])].sort((a, b) => (a.label || '').localeCompare(b.label || ''))
  const totalVotes = options.reduce((s, o) => s + (o.vote_count || 0), 0)
  const targetIdx = options.length > 0 ? cycleTick % options.length : 0
  const [activeIdx, setActiveIdx] = useState(targetIdx)
  const [visible, setVisible]     = useState(true)
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsLeft(post.expires_at))
  const hasFiredRef = useRef(false)

  // Crossfade to the new photo whenever the shared tick moves this card to a
  // new target index. Cards with fewer options (e.g. 2 vs 4) simply repeat
  // targets more often, but the fade always happens on the same shared beat.
  useEffect(() => {
    if (options.length < 2 || targetIdx === activeIdx) return
    setVisible(false)
    const id = setTimeout(() => {
      setActiveIdx(targetIdx)
      setVisible(true)
    }, 800)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIdx])

  // Independent countdown — updates the displayed time and fires onExpire the
  // moment expires_at passes. Was previously TimerRing (a ring + digital readout)
  // — replaced with plain colored text matching desktop's DecisionPairCard, which
  // never had a ring at all. The ring was one more busy element competing with
  // the photo, the option-letter chip, and the gradient text for a small corner.
  useEffect(() => {
    const id = setInterval(() => {
      const left = getSecondsLeft(post.expires_at)
      setSecondsLeft(left)
      if (!hasFiredRef.current && left <= 0) {
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
  const { width, height } = SIZES[size] || SIZES.sm
  const urgent = secondsLeft < 120
  const timeColor = urgent ? '#FF8B69' : '#FFFFFF' // lighter coral than the brand hex — needs to read on a dark photo scrim, not a white card

  return (
    <button
      onClick={onOpen}
      className="relative shrink-0 rounded-card overflow-hidden text-left"
      style={{ width, height }}
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

      {/* Deliberately not faded with the photo (unlike the img above) — it used to
          share the same opacity toggle, so the badge blinked out and back in every
          3.5s cycle even though only the letter needs to change. It now just swaps
          silently in sync with activeIdx, at the same instant the photo underneath
          finishes swapping, so it reads as constant instead of flashing. */}
      <div className="absolute top-2 left-2 bg-white/90 rounded-full px-2 py-0.5">
        <span className="text-[10px] font-bold text-[#1A1A1A]">{optLabel}</span>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-3">
        <p className="text-white text-xs font-semibold leading-snug line-clamp-2">{post.question}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-white font-bold text-[10px]">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
          <span className="font-bold text-[10px]" style={{ color: timeColor, transition: 'color 1s ease' }}>{formatCountdown(secondsLeft)}</span>
        </div>
      </div>
    </button>
  )
}
