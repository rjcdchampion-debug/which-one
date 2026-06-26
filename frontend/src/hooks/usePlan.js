import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const PLAN_KEY   = 'this_or_that_plan_override'
const BOOSTS_KEY = 'this_or_that_monthly_boosts'

function getSessionPlan() {
  return localStorage.getItem(PLAN_KEY) || null
}

function getMonthKey() {
  return new Date().toISOString().slice(0, 7) // 'YYYY-MM'
}

function readBoosts() {
  try { return JSON.parse(localStorage.getItem(BOOSTS_KEY) || '{}') } catch { return {} }
}

export function usePlan() {
  const { profile } = useAuth()
  const [sessionPlan, setSessionPlan] = useState(getSessionPlan)
  const [boostCount, setBoostCount]   = useState(() => readBoosts()[getMonthKey()] || 0)
  const [showBoostPrompt, setShowBoostPrompt] = useState(false)

  const plan   = sessionPlan || profile?.plan || 'free'
  const isPlus = plan === 'plus' || plan === 'pro'
  const isPro  = plan === 'pro'

  function upgradeTo(newPlan) {
    localStorage.setItem(PLAN_KEY, newPlan)
    setSessionPlan(newPlan)
  }

  // Called after every £0.99 one-off purchase. Returns new monthly count.
  function recordBoost() {
    const stored = readBoosts()
    const month  = getMonthKey()
    const next   = (stored[month] || 0) + 1
    stored[month] = next
    localStorage.setItem(BOOSTS_KEY, JSON.stringify(stored))
    setBoostCount(next)
    if (next >= 3) setShowBoostPrompt(true)
    return next
  }

  function dismissBoostPrompt() { setShowBoostPrompt(false) }

  return { plan, isPlus, isPro, upgradeTo, boostCount, showBoostPrompt, dismissBoostPrompt, recordBoost }
}
