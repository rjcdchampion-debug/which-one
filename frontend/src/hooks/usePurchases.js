import { useState } from 'react'

const STORAGE_KEY = 'this_or_that_purchases'

function getStored() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

export function usePurchases() {
  const [purchases, setPurchases] = useState(getStored)

  function hasPurchased(key) {
    return !!purchases[key]
  }

  function simulatePurchase(key) {
    const next = { ...purchases, [key]: true }
    setPurchases(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return { hasPurchased, simulatePurchase }
}
