import { useState, useEffect, useRef } from 'react'
import TimerRing from './TimerRing'

const SIZES = {
  sm: { width: 160, height: 240, timerSize: 'sm' },
  lg: { width: 220, height: 300, timerSize: 'md' },
}

export default function LiveCard({ post, onOpen, onExpire, size = 'sm' }) {
  const options    = post.options || []
  const totalVotes = options.reduce((s, o) => s + (o.vote_count || 0), 0)
  const [activeIdx, setActiveIdx] = useState(0)
  const [visible, setVisible]     = useState(true)
  const hasFiredRef = useRef(false)

  useEffect(() => {
    if (options.length < 2) return
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setActiveIdx(i => (i + 1) % options.length)
        setVisible(true)
      }, 800)
    }, 3500)
    return () => clearInterval(id)
  }, [options.length])

  // Independent countdown — fires onExpire the moment expires_at passes
  useEffect(() => {
    const id = setInterval(() => {
      if (!hasFiredRef.current && new Date(post.expires_at) <= new Date()) {
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
  const { width, height, timerSize } = SIZES[size] || SIZES.sm

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

      <div className="absolute top-2 right-2">
        <TimerRing expiresAt={post.expires_at} totalMinutes={15} size={timerSize} />
      </div>

      <div
        className="absolute top-2 left-2 bg-white/90 rounded-full px-2 py-0.5"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease' }}
      >
        <span className="text-[10px] font-bold text-[#1A1A1A]">{optLabel}</span>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-3">
        <p className="text-white text-xs font-semibold leading-snug line-clamp-2">{post.question}</p>
        <p className="text-white font-bold text-[10px] mt-1">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
      </div>
    </button>
  )
}
