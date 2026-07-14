import { useNavigate } from 'react-router-dom'
import { Sparkles, PieChart } from 'lucide-react'
import { CAT_FILTERS } from '../../lib/feedConfig'

// Matches PostCard's CATEGORY_COLOURS so the dot here means the same thing as the badge on a card.
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

// Matches CreatePostScreen's CATEGORIES icons so a category has the same glyph
// everywhere in the app (post creation, this sidebar) — another spot that's
// duplicated and kept in sync manually, same situation as CATEGORY_COLOURS above.
const CATEGORY_ICONS = {
  fashion: '👗',
  food:    '🍽️',
  home:    '🏠',
  design:  '🎨',
  beauty:  '💄',
  travel:  '🧳',
  sport:   '⚽',
  pets:    '🐾',
}

// This panel is pinned to a fixed height so it visually pairs with the right
// column: its bottom edge lines up with the bottom of the "Featured" hero image,
// and the (larger than default) gap below it lines up "Live stats" with the top
// of the "Live now" photos. Both numbers come from DesktopLiveStrip.jsx's actual
// markup — if the hero height or the label/spacing there ever changes, these need
// to change too:
//   Featured label (text-xs line-height 16 + mb-3 12)        = 28
//   HeroBanner height (literal, DesktopLiveStrip.jsx)         = 220
//   → Featured section bottom, from top of column             = 248  = CATEGORIES_PANEL_HEIGHT
//   mt-6 gap (24) + Live now label (28) + card padding (8)    = 60   = GAP_TO_LIVE_STATS
//   → Live now photos top, from top of column                 = 308
const CATEGORIES_PANEL_HEIGHT = 248
const GAP_TO_LIVE_STATS = 60 // the parent's flex `gap-5` already contributes 20 of this

export default function CategorySidebar({ catFilter, setCatFilter, isPlus, activeCount, liveCount, categoryVotes = [] }) {
  const navigate = useNavigate()
  const maxVotes = Math.max(1, ...categoryVotes.map(c => c.votes))
  const rankedCategories = [...categoryVotes].sort((a, b) => b.votes - a.votes)

  return (
    <aside className="w-60 shrink-0 flex flex-col gap-5 pr-2">
      {/* Category filter — icon grid, height-matched to the Featured hero (see constants above) */}
      <div
        className="bg-white border border-[#E5E5E5] rounded-card p-4 flex flex-col"
        style={{ borderWidth: '0.5px', height: CATEGORIES_PANEL_HEIGHT, marginBottom: GAP_TO_LIVE_STATS - 20 }}
      >
        <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-2">Categories</p>
        <div className="grid grid-cols-2 gap-1.5 flex-1">
          <button
            onClick={() => setCatFilter('all')}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-btn text-xs font-medium transition-colors"
            style={{
              gridColumn: '1 / -1',
              background: catFilter === 'all' ? '#534AB7' : '#F5F5F3',
              color:      catFilter === 'all' ? '#FFFFFF' : '#1A1A1A',
            }}
          >
            <Sparkles size={13} className={catFilter === 'all' ? 'text-white shrink-0' : 'text-[#534AB7] shrink-0'} />
            All
          </button>
          {CAT_FILTERS.filter(c => c.id !== 'all').map(c => (
            <button
              key={c.id}
              onClick={() => setCatFilter(c.id)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-btn text-xs font-medium transition-colors"
              style={{
                background: catFilter === c.id ? '#534AB7' : '#F5F5F3',
                color:      catFilter === c.id ? '#FFFFFF' : '#1A1A1A',
              }}
            >
              <span className="shrink-0">{CATEGORY_ICONS[c.id]}</span>
              <span className="truncate">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live stats widget */}
      <div className="bg-white border border-[#E5E5E5] rounded-card p-4" style={{ borderWidth: '0.5px' }}>
        <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-3">Live stats</p>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-[#6B6B6B]">Active decisions</span>
          <span className="font-bold text-[#1A1A1A]">{activeCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#6B6B6B]">Deciding right now</span>
          <span className="font-bold text-[#993C1D]">{liveCount}</span>
        </div>
      </div>

      {/* Category activity — real vote counts on currently active posts, not fabricated */}
      {rankedCategories.some(c => c.votes > 0) && (
        <div className="bg-white border border-[#E5E5E5] rounded-card p-4" style={{ borderWidth: '0.5px' }}>
          <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-3">Votes by category</p>
          <div className="flex flex-col gap-2.5">
            {rankedCategories.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className="w-16 shrink-0 text-[#6B6B6B]">{c.label}</span>
                <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(c.votes / maxVotes) * 100}%`, background: CATEGORY_COLOURS[c.id] }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-semibold text-[#1A1A1A]">{c.votes}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demographics — Plus/Pro only */}
      {isPlus && (
        <div className="bg-white border border-[#E5E5E5] rounded-card p-4" style={{ borderWidth: '0.5px' }}>
          <div className="flex items-center gap-2 mb-2">
            <PieChart size={14} className="text-[#534AB7]" />
            <p className="text-xs font-semibold text-[#1A1A1A]">Demographic breakdown</p>
          </div>
          <p className="text-xs text-[#6B6B6B] leading-snug">Coming soon</p>
        </div>
      )}

      {/* Upgrade nudge — free users only */}
      {!isPlus && (
        <button
          onClick={() => navigate('/pricing')}
          className="text-left bg-[#534AB7]/8 rounded-card p-4"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={13} className="text-[#534AB7]" />
            <p className="text-xs font-semibold text-[#534AB7]">Upgrade to Plus</p>
          </div>
          <p className="text-xs text-[#6B6B6B] leading-snug">
            AI verdicts, demographic breakdowns &amp; unlimited boosts.
          </p>
        </button>
      )}
    </aside>
  )
}
