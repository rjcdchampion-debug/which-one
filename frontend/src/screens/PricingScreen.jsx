import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePlan } from '../hooks/usePlan'
import { api } from '../lib/api'

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: null,
    priceLabel: 'Free forever',
    popular: false,
    features: [
      'Real-time posts',
      '2–4 photo options',
      'Public voting',
      'Basic vote counts',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 4.99,
    priceLabel: '£4.99 / month',
    popular: true,
    features: [
      'Everything in Free',
      '12-hour posts',
      'AI verdict on every post',
      'Extended timers (30 min, 1 hr)',
      'Demographic breakdown',
      'No ads',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12.99,
    priceLabel: '£12.99 / month',
    popular: false,
    features: [
      'Everything in Plus',
      'Unlimited boosts',
      'Shareable results card',
      'Analytics dashboard',
      'Brand / business profile badge',
    ],
  },
]

export default function PricingScreen() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { plan, isPlus, isPro, upgradeTo } = usePlan()

  // null | 'plus' | 'pro' — which plan is being confirmed
  const [confirming, setConfirming] = useState(null)
  const [upgrading, setUpgrading]   = useState(false)
  const [success, setSuccess]       = useState(false)

  async function handleSimulateUpgrade() {
    if (!confirming || upgrading) return
    setUpgrading(true)
    try {
      if (session?.access_token) {
        await api.upgradePlan(confirming, session.access_token)
      }
      upgradeTo(confirming)
      setSuccess(true)
      setTimeout(() => navigate('/'), 2000)
    } catch {
      upgradeTo(confirming) // still upgrade locally even if API fails
      setSuccess(true)
      setTimeout(() => navigate('/'), 2000)
    } finally {
      setUpgrading(false)
    }
  }

  if (success) {
    return (
      <div className="h-full bg-[#F5F5F5] flex items-center justify-center px-8 text-center">
        <div>
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-xl font-bold text-[#534AB7]">
            Welcome to {confirming === 'pro' ? 'Pro' : 'Plus'}!
          </p>
          <p className="text-sm text-[#6B6B6B] mt-2">Returning to the feed…</p>
        </div>
      </div>
    )
  }

  if (confirming) {
    const tier = TIERS.find(t => t.id === confirming)
    return (
      <div className="h-full overflow-y-auto bg-[#F5F5F5]">
        <header className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5]" style={{ borderBottomWidth: '0.5px' }}>
          <div className="flex justify-center">
            <div className="w-full max-w-app px-4 h-14 flex items-center">
              <button onClick={() => setConfirming(null)} className="p-1 -ml-1 flex items-center gap-1 text-[#534AB7]">
                <ChevronLeft size={22} />
                <span className="text-sm font-semibold">Back</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex justify-center">
          <div className="w-full max-w-app px-4 pt-10 pb-28 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#534AB7]/10 flex items-center justify-center mb-4">
              <span className="text-3xl">{tier.id === 'pro' ? '🚀' : '✨'}</span>
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A1A]">Upgrade to {tier.name}</h2>
            <p className="text-[#534AB7] font-semibold mt-1">{tier.priceLabel}</p>

            <div className="mt-8 w-full bg-white rounded-card border border-[#E5E5E5] p-5 text-left space-y-3" style={{ borderWidth: '0.5px' }}>
              {tier.features.map(f => (
                <div key={f} className="flex items-center gap-3">
                  <Check size={16} className="text-[#534AB7] shrink-0" />
                  <span className="text-sm text-[#1A1A1A]">{f}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleSimulateUpgrade}
              disabled={upgrading}
              className="mt-8 w-full py-4 bg-[#534AB7] text-white rounded-btn font-semibold text-sm flex items-center justify-center gap-2"
            >
              {upgrading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Upgrading…</>
                : `Simulate upgrade → ${tier.name}`
              }
            </button>
            <p className="mt-3 text-xs text-[#6B6B6B]">This is a demo — no real payment is taken.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F5F5F5]">
      <header className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5]" style={{ borderBottomWidth: '0.5px' }}>
        <div className="flex justify-center">
          <div className="w-full max-w-app px-4 h-14 flex items-center">
            <button onClick={() => navigate(-1)} className="p-1 -ml-1 flex items-center gap-1 text-[#534AB7]">
              <ChevronLeft size={22} />
              <span className="text-sm font-semibold">Back</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex justify-center">
        <div className="w-full max-w-app px-4 pt-6 pb-28">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Choose your plan</h1>
            <p className="text-sm text-[#6B6B6B] mt-1">Upgrade anytime. Cancel anytime.</p>
          </div>

          <div className="space-y-3">
            {TIERS.map(tier => {
              const isCurrent = plan === tier.id || (tier.id === 'free' && !isPlus && !isPro)
              const isUpgradable = tier.id !== 'free' && !isCurrent

              return (
                <div
                  key={tier.id}
                  className="bg-white rounded-card border overflow-hidden"
                  style={{
                    borderColor: tier.popular ? '#534AB7' : '#E5E5E5',
                    borderWidth: tier.popular ? 2 : '0.5px',
                  }}
                >
                  {tier.popular && (
                    <div className="bg-[#534AB7] px-4 py-1.5 text-center">
                      <span className="text-white text-xs font-bold tracking-wide uppercase">Most popular</span>
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-lg text-[#1A1A1A]">{tier.name}</h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-[#534AB7]/10 text-[#534AB7] rounded-full text-xs font-semibold">
                          Current plan
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#6B6B6B] mb-4">{tier.priceLabel}</p>

                    <ul className="space-y-2 mb-5">
                      {tier.features.map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <Check size={14} className="text-[#534AB7] mt-0.5 shrink-0" />
                          <span className="text-sm text-[#1A1A1A]">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {isUpgradable ? (
                      <button
                        onClick={() => setConfirming(tier.id)}
                        className="w-full py-3 rounded-btn font-semibold text-sm"
                        style={{ background: tier.popular ? '#534AB7' : '#1A1A1A', color: 'white' }}
                      >
                        Upgrade to {tier.name}
                      </button>
                    ) : (
                      <div className="w-full py-3 rounded-btn text-center text-sm font-medium text-[#6B6B6B] bg-[#F5F5F5]">
                        {isCurrent ? 'Your current plan' : `Included in ${plan}`}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
