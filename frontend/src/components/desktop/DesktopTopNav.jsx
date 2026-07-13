import { useNavigate } from 'react-router-dom'
import { Bell, PlusCircle, Lock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { TABS } from '../../lib/feedConfig'

export default function DesktopTopNav({ tab, setTab }) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5]" style={{ borderBottomWidth: '0.5px' }}>
      <div className="max-w-app-desktop mx-auto px-8 h-[76px] flex items-center">
        <div className="flex flex-col shrink-0">
          <h1 className="font-bold text-[#1A1A1A] leading-none" style={{ fontSize: 23, letterSpacing: '-0.02em' }}>
            This <span style={{ color: '#534AB7' }}>or</span> That<span style={{ color: '#993C1D' }}>?</span>
          </h1>
          <p className="text-[10px] text-[#6B6B6B] tracking-[0.14em] uppercase" style={{ marginTop: 3 }}>Let the crowd decide</p>
        </div>

        <div className="ml-auto flex items-center gap-10">
          <nav className="flex items-center gap-7">
            {TABS.map(t => {
              const locked = t.authRequired && !user
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (locked) { navigate('/register'); return }
                    setTab(t.id)
                  }}
                  className={`relative py-2 text-[13.5px] font-medium tracking-wide transition-colors ${
                    active ? 'text-[#1A1A1A]' : 'text-[#8A8A8A] hover:text-[#1A1A1A]'
                  } ${locked ? 'opacity-40' : ''}`}
                >
                  {t.live ? (
                    <span className="inline-flex items-center gap-1.5">
                      {t.label}
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#993C1D] opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#993C1D]" />
                      </span>
                    </span>
                  ) : locked ? (
                    <span className="inline-flex items-center gap-1">
                      {t.label}
                      <Lock size={10} className="inline" />
                    </span>
                  ) : t.label}
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-[#534AB7] rounded-full" />
                  )}
                </button>
              )
            })}
          </nav>

          <div className="w-px h-6 bg-[#E5E5E5]" />

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/create')}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-white rounded-btn text-sm font-semibold hover:bg-[#534AB7] transition-colors"
            >
              <PlusCircle size={16} />
              Post
            </button>

            <button className="p-1.5 text-[#6B6B6B] hover:text-[#534AB7] transition-colors">
              <Bell size={19} strokeWidth={1.8} />
            </button>

            {user ? (
              <button
                onClick={() => navigate('/profile')}
                className="w-8 h-8 rounded-full bg-[#534AB7]/10 flex items-center justify-center text-[#534AB7] font-bold text-sm shrink-0"
              >
                {(profile?.username || '?')[0].toUpperCase()}
              </button>
            ) : (
              <div classNam