import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Forward, Zap } from 'lucide-react'
import TimerRing from './TimerRing'
import PaymentModal from './PaymentModal'
import { useAuth } from '../contexts/AuthContext'
import { useVoter } from '../hooks/useVoter'
import { api } from '../lib/api'

const CATEGORY_COLOURS = {
  fashion: '#534AB7',
  food:    '#0F6E56',
  home:    '#185FA5',
  design:  '#1A1A1A',
  beauty:  '#993C1D',
  other:   '#6B6B6B',
}

function Avatar({ url, username, plan, size = 28 }) {
  const initial   = (username || '?')[0].toUpperCase()
  const showBadge = plan === 'plus' || plan === 'pro'
  const img = url
    ? <img src={url} alt={username} style={{ width: size, height: size }} className="rounded-full object-cover" />
    : (
      <div
        className="rounded-full bg-[#534AB7]/10 flex items-center justify-center text-[#534AB7] font-semibold"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {initial}
      </div>
    )
  if (!showBadge) return img
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {img}
      <span
        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#534AB7] border-white flex items-center justify-center"
        style={{ border: '1.5px solid white', fontSize: 8, color: 'white', fontWeight: 700, lineHeight: 1 }}
      >
        +
      </span>
    </div>
  )
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)   return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function hoursLeft(expiresAt) {
  const hrs = Math.max(0, (new Date(expiresAt) - Date.now()) / 3600000)
  if (hrs < 1) return `${Math.ceil(hrs * 60)}m left`
  return `${Math.floor(hrs)}h left`
}

export default function PostCard({
  post: initialPost,
  currentUserId,
  compact = false,
  onVote,
  // For You animation
  isForYou = false,
  onVoteStart,
  onVoteAnimationComplete,
  // My Votes: server-side voted option overrides localStorage
  initialVotedOptionId = null,
  // My Posts: always show results + enhancements
  isMyPostsView = false,
  // Live expiry animation phase
  expiryPhase = 'none', // 'none' | 'winner' | 'fading'
}) {
  const navigate    = useNavigate()
  const { session } = useAuth()
  const { voterId, hasVoted, getVotedOption, recordVote } = useVoter()
  const timeoutsRef = useRef([])

  const [post, setPost]                   = useState(initialPost)
  const [voted, setVoted]                 = useState(() => initialVotedOptionId ? true : hasVoted(initialPost.id))
  const [votedOptionId, setVotedOptionId] = useState(() => initialVotedOptionId || getVotedOption(initialPost.id))
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [shareCount, setShareCount]       = useState(initialPost.share_count || 0)
  const [shareCopied, setShareCopied]     = useState(false)
  const [showVoteMessage, setShowVoteMessage] = useState(false)
  const [msgOpacity, setMsgOpacity]       = useState(0)
  const [voteError, setVoteError]         = useState(false)
  // Prevents double-tap before React re-renders with voted=true
  const votingRef = useRef(false)

  useEffect(() => () => timeoutsRef.current.forEach(clearTimeout), [])

  useEffect(() => {
    setPost(initialPost)
    setShareCount(initialPost.share_count || 0)
  }, [initialPost])

  const options  = post.options || []
  const isClosed = post.status === 'closed'

  // AI verdict is still used to subtract the AI vote from percentages, just not displayed
  const aiVerdict  = (post.ai_verdicts || [])[0]
  const aiOptionId = aiVerdict?.recommendation_option_id
  const creatorPlan = post.users?.plan
  const showAiStrip = !!aiVerdict && (
    creatorPlan === 'plus' || creatorPlan === 'pro' || !!post.ai_verdict_paid
  )

  const humanCount = (o) => o.id === aiOptionId ? Math.max(0, (o.vote_count || 0) - 1) : (o.vote_count || 0)
  const totalVotes = options.reduce((s, o) => s + humanCount(o), 0)
  const winningId  = options.reduce((mx, o) => (!mx || humanCount(o) > humanCount(mx) ? o : mx), null)?.id

  const clientExpired = expiryPhase !== 'none'
  const showResults  = voted || isClosed || isMyPostsView || clientExpired
  const isOwner      = currentUserId && post.user_id === currentUserId
  const isRealtime   = post.mode === 'realtime'
  const msLeft       = new Date(post.expires_at) - Date.now()
  const canExtend    = isOwner && isRealtime && msLeft > 0 && msLeft < 5 * 60 * 1000
  const accentColor  = isRealtime ? '#993C1D' : '#185FA5'

  function addTimeout(fn, ms) {
    const id = setTimeout(fn, ms)
    timeoutsRef.current.push(id)
  }

  // Animation phases (all times relative to tap):
  // t=0    → immediate optimistic highlight
  // t=0→1s → bars animate in (CSS duration-1000)
  // t=1→4s → 3-second results hold
  // t=4→5s → "Vote logged" fades in (1s)
  // t=5s   → onVoteAnimationComplete: FeedScreen starts 2s card fade + delayed 0.4s height collapse
  function startForYouAnimation(postId) {
    onVoteStart?.(postId)
    addTimeout(() => {
      setShowVoteMessage(true)
      // Next frame: trigger the opacity CSS transition for fade-in
      addTimeout(() => setMsgOpacity(1), 30)
      // After 1s fade-in, signal FeedScreen to begin collapse (2s opacity + 0.4s height with 2s delay)
      addTimeout(() => onVoteAnimationComplete?.(postId), 1000)
    }, 4000)
  }

  function handleVote(optionId) {
    if (votingRef.current || voted || isClosed || isMyPostsView) return
    votingRef.current = true

    // 1. Immediate optimistic update — no API wait
    recordVote(post.id, optionId)
    setVoted(true)
    setVotedOptionId(optionId)
    setPost(prev => ({
      ...prev,
      options: prev.options.map(o =>
        o.id === optionId ? { ...o, vote_count: (o.vote_count || 0) + 1 } : o
      ),
    }))
    onVote?.()

    if (isForYou) startForYouAnimation(post.id)

    // 2. Fire API in background; update with server counts on success; show error on failure
    api.castVote(
      { post_id: post.id, option_id: optionId, voter_id: voterId },
      session?.access_token
    )
      .then(({ post: updated }) => {
        if (updated?.options) setPost(prev => ({ ...prev, options: updated.options }))
      })
      .catch(err => {
        console.warn('Vote failed:', err.message)
        setVoteError(true)
      })
  }

  function handleRetryVote() {
    if (!votedOptionId) return
    setVoteError(false)
    api.castVote(
      { post_id: post.id, option_id: votedOptionId, voter_id: voterId },
      session?.access_token
    )
      .then(({ post: updated }) => {
        if (updated?.options) setPost(prev => ({ ...prev, options: updated.options }))
      })
      .catch(() => setVoteError(true))
  }

  async function handleShare() {
    const url       = `${window.location.origin}/post/${post.id}`
    const shareText = `${post.question} — vote now on This or That! 👇\n\n${url}`

    api.incrementShare(post.id)
      .then(({ share_count }) => setShareCount(share_count))
      .catch(() => setShareCount(c => c + 1))

    if (navigator.share) {
      try { await navigator.share({ title: post.question, text: shareText }) } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareText)
      } catch {
        const el = document.createElement('textarea')
        el.value = shareText
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setShareCopied(true)
      addTimeout(() => setShareCopied(false), 2000)
    }
  }

  return (
    <>
      <div
        className="bg-white border border-[#E5E5E5] rounded-card overflow-hidden relative"
        style={{
          borderWidth: '0.5px',
          opacity: expiryPhase === 'fading' ? 0 : 1,
          transition: expiryPhase === 'fading' ? 'opacity 2s ease' : undefined,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar url={post.users?.avatar_url} username={post.users?.username} plan={post.users?.plan} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#1A1A1A] leading-none truncate">
                {post.users?.username || 'anonymous'}
              </p>
              <p className="text-xs text-[#6B6B6B] mt-0.5">{timeAgo(post.created_at)}</p>
            </div>
            <span
              className="ml-1 px-2 py-0.5 rounded-full text-white text-[10px] font-semibold uppercase tracking-wide shrink-0"
              style={{ background: CATEGORY_COLOURS[post.category] || '#6B6B6B' }}
            >
              {post.category}
            </span>
          </div>

          {/* Timer / status */}
          <div className="shrink-0 ml-2 flex items-center gap-1.5">
            {isClosed && isMyPostsView ? (
              <span className="px-2 py-0.5 bg-[#534AB7]/10 text-[#534AB7] rounded-full text-[10px] font-semibold whitespace-nowrap">
                Decision made
              </span>
            ) : isRealtime && (!isClosed || clientExpired) ? (
              <TimerRing expiresAt={post.expires_at} totalMinutes={15} size="sm" showThumbsUp={clientExpired} />
            ) : (
              <span className="text-xs text-[#6B6B6B] font-medium">
                {isClosed ? 'Closed' : hoursLeft(post.expires_at)}
              </span>
            )}
          </div>
        </div>

        {/* Question */}
        <p className="px-4 pb-3 text-[15px] font-semibold text-[#1A1A1A] leading-snug">
          {post.question}
        </p>

        {/* Photos — unified grid; 'or' pill at exact centre */}
        <div className="px-4 pb-4">
          <div className="relative">
            <div className="grid grid-cols-2 gap-2">
              {options.slice(0, 4).map((option) => {
                const pct      = totalVotes > 0 ? Math.round((humanCount(option) / totalVotes) * 100) : 0
                const isWinner = option.id === winningId
                const isMyVote = option.id === votedOptionId
                return (
                  <button
                    key={option.id}
                    onClick={() => handleVote(option.id)}
                    disabled={voted || isClosed || isMyPostsView || clientExpired}
                    className="relative rounded-lg overflow-hidden focus:outline-none active:opacity-80 transition-opacity"
                    style={{
                      boxShadow: showResults && isWinner
                        ? `0 0 0 2.5px ${clientExpired ? '#854F0B' : accentColor}`
                        : undefined,
                      opacity: showResults && !isWinner ? (clientExpired ? 0.45 : 0.72) : 1,
                    }}
                  >
                    {option.photo_url ? (
                      <img
                        src={option.photo_url}
                        alt={option.label}
                        className="w-full aspect-square object-cover"
                        loading="lazy"
                        onError={e => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextSibling?.style && (e.currentTarget.nextSibling.style.display = 'flex')
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full aspect-square bg-[#F0F0F0] items-center justify-center text-[#6B6B6B] text-xs font-medium"
                      style={{ display: option.photo_url ? 'none' : 'flex' }}
                    >
                      {option.label}
                    </div>
                    {showResults && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-6 pb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-xs font-medium">{option.label}</span>
                          <span className="text-white text-sm font-bold">{pct}%</span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-white/30">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${pct}%`, background: isWinner ? accentColor : 'white' }}
                          />
                        </div>
                      </div>
                    )}
                    {isMyVote && (
                      <div className="absolute top-2 right-2 bg-white/90 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-[#534AB7]">
                        Your vote
                      </div>
                    )}
                    {clientExpired && isWinner && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#854F0B] text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                        Winner
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* 'or' pill — centred between all options */}
            {!showResults && (
              <span
                className="absolute bg-white border border-[#E5E5E5] rounded-full px-2.5 py-1 text-xs font-semibold text-[#1A1A1A] shadow-sm pointer-events-none"
                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50 }}
              >
                or
              </span>
            )}
          </div>
        </div>

        {/* AI verdict strip — shown for Plus/Pro creators or paid one-off verdict */}
        {showAiStrip && (
          <div className="mx-4 mb-3 px-3 py-2 bg-[#534AB7]/8 rounded-lg flex items-start gap-2">
            <span className="text-[11px] shrink-0 mt-0.5">✨</span>
            <p className="text-[11px] text-[#534AB7] leading-snug">
              <span className="font-semibold">
                AI voted {options.find(o => o.id === aiVerdict.recommendation_option_id)?.label || 'Option A'}
              </span>
              {aiVerdict.insights?.[0]?.text
                ? ` · ${aiVerdict.insights[0].text}`
                : ''}
            </p>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-3 px-4 pb-4">
          <button
            onClick={() => navigate(`/post/${post.id}`)}
            className="flex items-center gap-1.5 text-[#6B6B6B] text-sm"
          >
            <MessageCircle size={16} />
            <span>{post.comment_count || 0}</span>
          </button>

          <div className="relative">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: '#534AB7' }}
            >
              <Forward size={20} />
              <span>Share{shareCount > 0 ? ` · ${shareCount}` : ''}</span>
            </button>
            {shareCopied && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1A1A1A] text-white text-[11px] font-medium rounded-md whitespace-nowrap pointer-events-none">
                Link copied!
              </div>
            )}
          </div>

          <span className="ml-auto text-xs text-[#6B6B6B]">
            {isMyPostsView
              ? `${totalVotes} reached`
              : `${totalVotes} vote${totalVotes !== 1 ? 's' : ''}`}
          </span>

          {canExtend && (
            <button
              onClick={() => setShowExtendModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#993C1D]/10 text-[#993C1D] text-xs font-semibold rounded-btn"
            >
              <Zap size={12} />
              Extend 15 min · £0.99
            </button>
          )}
        </div>

        {/* Vote message overlay — fades in via state-driven opacity (1s ease) */}
        {showVoteMessage && (
          <div
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
            style={{ opacity: msgOpacity, transition: 'opacity 1s ease' }}
          >
            <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.88)' }} />
            {voteError ? (
              <button
                className="relative px-6 py-4 bg-[#993C1D] rounded-2xl shadow-xl text-center pointer-events-auto"
                onClick={handleRetryVote}
              >
                <p className="text-white text-sm font-semibold">Something went wrong</p>
                <p className="text-white/90 text-xs mt-1">Tap to try again</p>
              </button>
            ) : (
              <div className="relative px-6 py-4 bg-[#534AB7] rounded-2xl shadow-xl text-center">
                <p className="text-white text-sm font-semibold">Vote logged!</p>
                <p className="text-white/90 text-xs mt-1">
                  Thanks from {post.users?.username || 'them'} 🙏
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {showExtendModal && (
        <PaymentModal
          featureLabel="Extend post timer by 15 minutes"
          price="£0.99"
          onClose={() => setShowExtendModal(false)}
          onPurchase={() => {
            setShowExtendModal(false)
            alert('Timer extended by 15 minutes!')
          }}
        />
      )}
    </>
  )
}
