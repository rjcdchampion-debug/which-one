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
}

export default function CategorySidebar({ catFilter, setCatFilter, isPlus, activeCount, liveCount, categoryVotes = [] }) {
  const navigate = useNavigate()
  const maxVotes = Math.max(1, ...categoryVotes.map(c => c.votes))
  const rankedCategories = [...categoryVotes].sort((a, b) => b.votes - a.votes)

  return (
    <aside className="w-60 shrink-0 flex flex-col gap-5 pr-2">
      {/* Category filter */}
      <div>
        <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-2 px-1">Categories</p>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => setCatFilter('all')}
            className="text-left px-3 py-2 rounded-btn text-sm font-medium transition-colors flex items-center gap-2.5"
            style={{
              background: catFilter === 'all' ? '#534AB7' : 'transparent',
              color:      catFilter === 'all' ? '#FFFFFF' : '#1A1A1A',
            }}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: catFilter === 'all' ? '#FFFFFF' : '#534AB7' }} />
            All
          </button>
          {CAT_FILTERS.filter(c => c.id !== 'all').map(c => (
            <button
              key={c.id}
              onClick={() => setCatFilter(c.id)}
              className="text-left px-3 py-2 rounded-btn text-sm font-medium transition-colors flex items-center gap-2.5"
              style={{
                background: catFilter === c.id ? '#534AB7' : 'transparent',
                color:      catFilter === c.id ? '#FFFFFF' : '#1A1A1A',
              }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: catFilter === c.id ? '#FFFFFF' : CATEGORY_COLOURS[c.id] }} />
              {c.label}
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