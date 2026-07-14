import { useEffect, useState } from 'react'
import { ThumbsUp } from 'lucide-react'

const RADIUS = 32
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function getSecondsLeft(expiresAt) {
  return Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
}

// Colour stops in urgency order (calmest → most urgent).
const PURPLE = [0x53, 0x4a, 0xb7]
const AMBER  = [0xf5, 0x9e, 0x0b]
const CORAL  = [0x99, 0x3c, 0x1d]

// Crossfade band (seconds) either side of each threshold — replaces the old
// hard cut at exactly 5min/2min with a gradual blend, so the ring never snaps
// to a new colour mid-render.
const BAND = 20

function mix(c1, c2, t) {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t)
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t)
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function getColor(secondsLeft) {
  const upper = 300 // 5 min
  const lower = 120 // 2 min

  if (secondsLeft >= upper + BAND) return mix(PURPLE, PURPLE, 0) // pure purple
  if (secondsLeft > upper - BAND) {
    const t = (upper + BAND - secondsLeft) / (2 * BAND)
    return mix(PURPLE, AMBER, Math.min(1, Math.max(0, t)))
  }
  if (secondsLeft > lower + BAND) return mix(AMBER, AMBER, 0) // pure amber
  if (secondsLeft > lower - BAND) {
    const t = (lower + BAND - secondsLeft) / (2 * BAND)
    return mix(AMBER, CORAL, Math.min(1, Math.max(0, t)))
  }
  return mix(CORAL, CORAL, 0)
}

export default function TimerRing({ expiresAt, totalMinutes = 15, size = 'md', showThumbsUp = false }) {
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsLeft(expiresAt))

  useEffect(() => {
    setSecondsLeft(getSecondsLeft(expiresAt))
    const id = setInterval(() => setSecondsLeft(getSecondsLeft(expiresAt)), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const totalSeconds = totalMinutes * 60
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  const color = getColor(secondsLeft)

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const label = `${mins}:${String(secs).padStart(2, '0')}`

  const dim = size === 'sm' ? 62 : 72
  const iconSize = size === 'sm' ? 16 : 20

  if (showThumbsUp) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 80 80"
          style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
        >
          <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="#854F0B" strokeWidth="8" />
        </svg>
        <ThumbsUp
          size={iconSize}
          fill="#854F0B"
          stroke="#854F0B"
          style={{ animation: 'thumbsUpIn 0.3s ease forwards', position: 'relative' }}
        />
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
          strokeWidth="5"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 1s ease' }}
        />
      </svg>
      <span className="relative font-bold" style={{ fontSize: size === 'sm' ? 11 : 12, color, transition: 'color 1s ease' }}>
        {label}
      </span>
    </div>
  )
}
