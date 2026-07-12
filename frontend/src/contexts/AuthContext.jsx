import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [profile, setProfile]     = useState(null)
  const [profileMissing, setProfileMissing] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [session, setSession]     = useState(null)
  // Prevents onAuthStateChange from running fetchProfile mid-signup,
  // which would see no profile yet and flash the SetupUsername screen
  const isSigningUpRef = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        if (!isSigningUpRef.current) fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
      if (error || !data) {
        setProfile(null)
        setProfileMissing(true)
      } else {
        setProfile(data)
        setProfileMissing(false)
      }
    } catch {
      setProfile(null)
      setProfileMissing(false)
    } finally {
      setLoading(false)
    }
  }

  // Keep last_seen fresh while user is active
  useEffect(() => {
    if (!user) return
    async function ping() {
      try {
        await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
      } catch {}
    }
    ping()
    const id = setInterval(ping, 60_000)
    const onVisible = () => { if (document.visibilityState === 'visible') ping() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [user])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    localStorage.removeItem('this_or_that_plan_override')
    return data
  }

  async function signUp(email, password, username) {
    isSigningUpRef.current = true
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: undefined },
      })
      if (error) throw error
      if (!data.session) {
        throw new Error('Check your email to confirm your account, then sign in.')
      }
      const now = new Date().toISOString()
      const { error: profileError } = await supabase
        .from('users')
        .insert({ id: data.user.id, username, plan: 'free', last_seen: now })
      if (profileError) throw new Error(profileError.message)
      setProfile({ id: data.user.id, username, plan: 'free', last_seen: now })
      setProfileMissing(false)
      setLoading(false)
      return data
    } finally {
      isSigningUpRef.current = false
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    localStorage.removeItem('this_or_that_plan_override')
  }

  return (
    <AuthContext.Provider value={{ user, profile, profileMissing, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
