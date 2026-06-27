import { useEffect, useState } from 'react'

const RADIUS = 32
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function getSecondsLeft(expiresAt) {
  return Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
}

export default function TimerRing({ expiresAt, totalMinutes = 15, size = 'md' }) {
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsLeft(expiresAt))

  useEffect(() => {
    setSecondsLeft(getSecondsLeft(expiresAt))
    const id = setInterval(() => setSecondsLeft(getSecondsLeft(expiresAt)), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const totalSeconds = totalMinutes * 60
  const progress     = totalSeconds > 0 ? secondsLeft / totalSeconds : 0
  const dashOffset   = CIRCUMFERENCE * (1 - progress)

  // Urgency window: last 10 seconds (exclusive of 0 so pulse stops when expired)
  const isUrgent = secondsLeft > 0 && secondsLeft <= 10

  const color =
    secondsLeft < 120 ? '#993C1D' :
    secondsLeft < 300 ? '#f59e0b' :
    '#534AB7'

  const mins  = Math.floor(secondsLeft / 60)
  const secs  = secondsLeft % 60

  // In last 10s show bare number; otherwise show M:SS
  const label = secondsLeft <= 10
    ? `${secondsLeft}`
    : `${mins}:${String(secs).padStart(2, '0')}`

  const dim          = size === 'sm' ? 62 : 72
  const baseFontSize = size === 'sm' ? 11 : 12

  // Text grows from 1× at s=10 to ~1.5× at s=1; stays at base when not urgent
  const urgencyFactor = isUrgent ? 1 + ((10 - secondsLeft) / 9) * 0.5 : 1
  const fontSize      = Math.round(baseFontSize * urgencyFactor)
  // Bold increases from 700 → 900 over the last 10 s (20 units per second)
  const fontWeight    = isUrgent ? Math.min(900, 700 + (10 - secondsLeft) * 22) : 700

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
