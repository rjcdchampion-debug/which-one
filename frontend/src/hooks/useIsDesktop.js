import { useState, useEffect } from 'react'

const QUERY = '(min-width: 768px)'

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const update = () => setIsDesktop(mql.matches)
    // 'resize' as a fallback — some environments resize the viewport without
    // firing the MediaQueryList 'change' event.
    mql.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      mql.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return isDesktop
}
