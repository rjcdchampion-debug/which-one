import { CAT_FILTERS } from '../../lib/feedConfig'

const CATEGORY_COLOURS = {
  fashion: '#534AB7',
  food:    '#0F6E56',
  home:    '#185FA5',
  design:  '#1A1A1A',
  beauty:  '#993C1D',
  travel:  '#B8860B',
  sport:   '#2F7D4F',
  pets:    '#B5495B',
}

function agreedWithWinner(vote) {
  const opts  = vote.options || []
  const total = opts.reduce((s, o) => s + (o.vote_count || 0), 0)
  if (!total) return null
  const winner = opts.reduce((mx, o) => (!mx || o.vote_count > mx.vote_count ? o : mx), null)
  return winner?.id === vote.voted_option_id
}

export default function MyVotesSidebar({ myVotes, myVotesStats }) {
  if (!myVotesStats.total) return null

  const byCategory = {}
  myVotes.forEach(v => {
    if (!v.category) return
    byCategory[v.category] ||= { total: 0, agreed: 0, scored: 0 }
    byCategory[v.category].total += 1
    const agree = agreedWithWinner(v)
    if (agree !== null) {
      byCategory[v.category].scored += 1
      if (agree) byCategory[v.category].agreed += 1
    }
  })

  const categoryRows = Object.entries(byCategory).map(([id, v]) => ({
    id,
    label: CAT_FILTERS.find(c => c.id === id)?.label || id,
    total: v.total,
    agreePercent: v.scored ? Math.round((v.agreed / v.scored) * 100) : null,
  }))

  const byVoteCount = [...categoryRows].sort((a, b) => b.total - a.total)
  const byAgreement = categoryRows
    .filter(c => c.total >= 2 && c.agreePercent !== null)
    .sort((a, b) => b.agreePercent - a.agreePercent)
  const strongest = byAgreement[0]

  return (
    <aside className="w-60 shrink-0 flex flex-col gap-5 pr-2">
      <div className="bg-white border border-[#E5E5E5] rounded-card p-4" style={{ borderWidth: '0.5px' }}>
        <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-3">Your voting stats</p>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-[#6B6B6B]">Polls decided</span>
          <span className="font-bold text-[#1A1A1A]">{myVotesStats.total}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#6B6B6B]">Agree with majority</span>
          <span className="font-bold text-[#534AB7]">{myVotesStats.majorityAgreePercent}%</span>
        </div>
      </div>

      {byVoteCount.length > 0 && (
        <div className="bg-white border border-[#E5E5E5] rounded-card p-4" style={{ borderWidth: '0.5px' }}>
          <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-3">Votes by category</p>
          <div className="flex flex-col gap-2.5">
            {byVoteCount.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className="w-16 shrink-0 text-[#6B6B6B]">{c.label}</span>
                <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(c.total / byVoteCount[0].total) * 100}%`, background: CATEGORY_COLOURS[c.id] || '#534AB7' }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right font-semibold text-[#1A1A1A]">{c.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {byAgreement.length > 0 && (
        <div className="bg-white border border-[#E5E5E5] rounded-card p-4" style={{ borderWidth: '0.5px' }}>
          <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-2">Most in sync with the crowd</p>
          {strongest && (
            <p className="text-xs text-[#6B6B6B] leading-snug mb-3">
              You're closest to the winning vote on <span className="font-semibold" style={{ color: CATEGORY_COLOURS[strongest.id] || '#534AB7' }}>{strongest.label}</span> — {strongest.agreePercent}% agreement.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {byAgreement.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-4 text-[11px] text-[#6B6B6B] font-semibold">{i + 1}</span>
                  <span className="text-[#1A1A1A]">{c.label}</span>
                </span>
                <span className="font-bold" style={{ color: CATEGORY_COLOURS[c.id] || '#534AB7' }}>{c.agreePercent}%</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#6B6B6B] mt-3 leading-snug">
            Based on categories with at least 2 decided polls.
          </p>
        </div>
      )}
    </aside>
  )
}
