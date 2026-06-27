import { ThumbsUp } from 'lucide-react'

const RADIUS = 32
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Scale factor per second in the last 10s. Index = secondsLeft (0–10).
const URGENCY_SCALE = [3.5, 1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.13, 1.07, 1.0]

// Pure display component — parent owns and updates secondsLeft every second.
// showThumbsUp: true during winner reveal phase (expiryPhase !== 'none' in PostCard)
export default function TimerRing({ secondsLeft = 0, totalMinutes = 15, size = 'md', showThumbsUp = false }) {
  const dim          = size === 'sm' ? 62 : 72
  const baseFontSize = size === 'sm' ? 11 : 12

  if (showThumbsUp) {
    const iconSize = size === 'sm' ? 18 : 22
    return (
      <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} viewBox="0 0 80 80"
          style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="#854F0B" strokeWidth="7"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={0} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }} />
        </svg>
        <ThumbsUp size={iconSize}
          style={{ color: '#854F0B', fill: '#854F0B', position: 'relative',
            animation: 'thumbsUpIn 0.3s ease-out forwards' }} />
      </div>
    )
  }

  const totalSeconds  = totalMinutes * 60
  const progress      = totalSeconds > 0 ? secondsLeft / totalSeconds : 0
  const dashOffset    = CIRCUMFERENCE * (1 - progress)
  const isUrgent      = secondsLeft <= 10
  const color         = secondsLeft < 120 ? '#993C1D' : secondsLeft < 300 ? '#f59e0b' : '#534AB7'
  const mins          = Math.floor(secondsLeft / 60)
  const secs          = secondsLeft % 60
  const label         = secondsLeft <= 10 ? `${secondsLeft}` : `${mins}:${String(secs).padStart(2, '0')}`
  const urgencyFactor = isUrgent ? (URGENCY_SCALE[secondsLeft] ?? 1.0) : 1.0
  const fontSize      = Math.round(baseFontSize * urgencyFactor)
  const fontWeight    = isUrgent ? Math.min(900, 700 + (10 - secondsLeft) * 22) : 700

  return (
    <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} viewBox="0 0 80 80"
        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="#E5E5E5" strokeWidth="5" />
        <circle cx="40" cy="40" r={RADIUS} fill="none"
          stroke={color}
          strokeWidth={isUrgent ? 6.5 : 5}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease, stroke-width 0.4s ease',
            animation: isUrgent ? 'pulseRing 0.75s ease-in-out infinite' : undefined,
          }} />
      </svg>
      <span className="relative"
        style={{ fontSize, fontWeight, color, lineHeight: 1, transition: 'color 0.3s ease' }}>
        {label}
      </span>
    </div>
  )
}
