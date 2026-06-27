import { useEffect, useState } from 'react'
import { ThumbsUp } from 'lucide-react'

const RADIUS = 32
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function getSecondsLeft(expiresAt) {
  return Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
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

  const color =
    secondsLeft < 120 ? '#993C1D' :
    secondsLeft < 300 ? '#f59e0b' :
    '#534AB7'

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
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span className="relative font-bold" style={{ fontSize: size === 'sm' ? 11 : 12, color }}>
        {label}
      </span>
    </div>
  )
}
