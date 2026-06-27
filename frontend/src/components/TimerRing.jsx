import { useEffect, useState } from 'react'

const RADIUS = 32
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Scale factor per second in the last 10s. Index = secondsLeft (0–10).
// At 0 the number fills the entire dial.
const URGENCY_SCALE = [
  3.5,  // 0s — fills dial
  1.8,  // 1s
  1.7,  // 2s
  1.6,  // 3s
  1.5,  // 4s
  1.4,  // 5s
  1.3,  // 6s
  1.2,  // 7s
  1.13, // 8s
  1.07, // 9s
  1.0,  // 10s — normal
]

function getSecondsLeft(expiresAt) {
  return Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
}

// ready   = false while the card is sliding into position; gates urgency animations
// loading = true while the post is fetching fresh expires_at — shows neutral grey ring, no number
export default function TimerRing({ expiresAt, totalMinutes = 15, size = 'md', ready = true, loading = false }) {
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsLeft(expiresAt))

  useEffect(() => {
    setSecondsLeft(getSecondsLeft(expiresAt))
    const id = setInterval(() => setSecondsLeft(getSecondsLeft(expiresAt)), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const totalSeconds = totalMinutes * 60
  const progress     = totalSeconds > 0 ? secondsLeft / totalSeconds : 0
  const dashOffset   = CIRCUMFERENCE * (1 - progress)

  // Urgency only kicks in once the card is fully in position (ready) and time is critical
  const isUrgent = ready && secondsLeft <= 10

  const color =
    secondsLeft < 120 ? '#993C1D' :
    secondsLeft < 300 ? '#f59e0b' :
    '#534AB7'

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  // In last 10s show bare number; otherwise show M:SS
  const label = secondsLeft <= 10
    ? `${secondsLeft}`
    : `${mins}:${String(secs).padStart(2, '0')}`

  const dim          = size === 'sm' ? 62 : 72
  const baseFontSize = size === 'sm' ? 11 : 12

  const urgencyFactor = isUrgent ? (URGENCY_SCALE[secondsLeft] ?? 1.0) : 1.0
  const fontSize      = Math.round(baseFontSize * urgencyFactor)
  const fontWeight    = isUrgent ? Math.min(900, 700 + (10 - secondsLeft) * 22) : 700

  // While loading: neutral grey ring, no number
  if (loading) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 80 80"
          style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
        >
          <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="#E5E5E5" strokeWidth="5" />
        </svg>
      </div>
    )
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 80 80"
        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
      >
        <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="#E5E5E5" strokeWidth="5" />
        <circle
          cx="40" cy="40" r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={isUrgent ? 6.5 : 5}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease, stroke-width 0.4s ease',
            animation: isUrgent ? 'pulseRing 0.75s ease-in-out infinite' : undefined,
          }}
        />
      </svg>
      <span
        className="relative"
        style={{
          fontSize,
          fontWeight,
          color,
          lineHeight: 1,
          transition: 'color 0.3s ease',
          // No transition on size/weight — abrupt jump each second amplifies urgency
        }}
      >
        {label}
      </span>
    </div>
  )
}
