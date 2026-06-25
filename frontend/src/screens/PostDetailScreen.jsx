import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Sparkles, MessageCircle } from 'lucide-react'
import PostCard from '../components/PostCard'
import PaymentModal from '../components/PaymentModal'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { usePurchases } from '../hooks/usePurchases'

export default function PostDetailScreen() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const { hasPurchased, simulatePurchase } = usePurchases()

  const [post, setPost]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [showPayModal, setShowPayModal] = useState(false)

  const purchased = hasPurchased(`ai_verdict_${id}`)

  useEffect(() => {
    api.getPost(id)
      .then(({ post }) => setPost(post))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  // Refresh post when AI verdict is inserted so the strip updates without a page reload
  useEffect(() => {
    const channel = supabase
      .channel(`post-detail-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_verdicts', filter: `post_id=eq.${id}` }, async () => {
        try {
          const { post: updated } = await api.getPost(id)
          if (updated) setPost(updated)
        } catch {}
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F5F5F5]">
        <div className="w-6 h-6 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F5F5F5] px-8 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="font-semibold text-[#1A1A1A]">Post not found</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-sm text-[#534AB7] font-medium"
        >
          Back to feed
        </button>
      </div>
    )
  }

  const verdict  = post.ai_verdicts?.[0]
  const options  = post.options || []
  const is12h    = post.mode === 'twelve_hour'
  const hasVerdict = verdict && purchased

  return (
    <>
      <div className="h-full overflow-y-auto bg-[#F5F5F5]" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5]" style={{ borderBottomWidth: '0.5px' }}>
          <div className="flex justify-center">
            <div className="w-full max-w-app px-4 h-14 flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-1 -ml-1">
                <ChevronLeft size={22} className="text-[#1A1A1A]" />
              </button>
              <h2 className="font-semibold text-[#1A1A1A] flex-1 truncate">Post</h2>
            </div>
          </div>
        </header>

        <main className="flex justify-center">
          <div className="w-full max-w-app px-4 pt-4 pb-28 space-y-4">
            <PostCard post={post} currentUserId={user?.id} />

            {/* AI Deep-dive — 12h posts only */}
            {is12h && (
              hasVerdict ? (
                <VerdictCard verdict={verdict} options={options} />
              ) : (
                <button
                  onClick={() => setShowPayModal(true)}
                  className="w-full bg-white border border-[#E5E5E5] rounded-card p-4 text-left flex items-center gap-3"
                  style={{ borderWidth: '0.5px' }}
                >
                  <div className="w-10 h-10 rounded-full bg-[#534AB7]/10 flex items-center justify-center shrink-0">
                    <Sparkles size={18} className="text-[#534AB7]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1A1A1A]">AI Deep-Dive Verdict</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">
                      Detailed insights, confidence score &amp; sources
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#534AB7]">Plus</span>
                </button>
              )
            )}

            {/* Comments placeholder */}
            <div className="bg-white rounded-card border border-[#E5E5E5] p-4" style={{ borderWidth: '0.5px' }}>
              <p className="text-sm font-semibold text-[#1A1A1A] mb-3">Comments</p>
              <div className="flex flex-col items-center gap-2 py-6 text-[#6B6B6B]">
                <MessageCircle size={22} strokeWidth={1.5} />
                <p className="text-sm text-center">Be the first to comment — coming soon</p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showPayModal && (
        <PaymentModal
          featureLabel="AI deep-dive verdict"
          price="£1.49"
          onClose={() => setShowPayModal(false)}
          onPurchase={() => {
            simulatePurchase(`ai_verdict_${id}`)
            setShowPayModal(false)
          }}
        />
      )}
    </>
  )
}

function VerdictCard({ verdict, options }) {
  const rec = options.find(o => o.id === verdict.recommendation_option_id)
  const pct = Math.round((verdict.confidence || 0.8) * 100)

  return (
    <div className="bg-white rounded-card border border-[#E5E5E5] overflow-hidden" style={{ borderWidth: '0.5px' }}>
      <div className="bg-[#534AB7] px-4 py-3 flex items-center gap-2">
        <Sparkles size={14} className="text-white" />
        <p className="text-white text-sm font-semibold">AI Deep-Dive Verdict</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          {rec?.photo_url && (
            <img src={rec.photo_url} alt={rec.label} className="w-12 h-12 rounded-lg object-cover" />
          )}
          <div>
            <p className="text-xs text-[#6B6B6B] uppercase tracking-wide">AI recommends</p>
            <p className="font-semibold text-[#1A1A1A]">{rec?.label || 'Option A'}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-[#6B6B6B]">Confidence</p>
            <p className="font-bold text-[#534AB7]">{pct}%</p>
          </div>
        </div>

        {verdict.insights?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Insights</p>
            {verdict.insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[#534AB7] mt-0.5 text-sm">·</span>
                <p className="text-sm text-[#1A1A1A]">{ins.text || ins}</p>
              </div>
            ))}
          </div>
        )}

        {verdict.sources?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-2">Sources</p>
            <div className="flex flex-wrap gap-1.5">
              {verdict.sources.map((src, i) => (
                <span key={i} className="px-2 py-1 bg-[#F5F5F5] rounded-full text-xs text-[#6B6B6B]">
                  {src.name || src}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
