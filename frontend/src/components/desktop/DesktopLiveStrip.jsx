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
    <button
      onClick={() => onOpen(post)}
      className="relative w-full rounded-card overflow-hidden text-left block"
      style={{ height: 220, opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}
    >
      <div className="