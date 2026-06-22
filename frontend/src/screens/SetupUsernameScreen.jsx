import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

export default function SetupUsernameScreen() {
  const { user, session, signOut } = useAuth()
  const [username, setUsername] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const val = username.trim().toLowerCase()
    if (val.length < 3) { setError('At least 3 characters'); return }
    if (!/^[a-z0-9_.]+$/.test(val)) { setError('Letters, numbers, _ and . only'); return }

    setLoading(true)
    setError(null)
    try {
      await api.createUserProfile({ id: user.id, username: val }, session?.access_token)
      window.location.href = '/'
    } catch (err) {
      setError(err.message || 'Could not save username. Try a different one.')
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="w-full max-w-app">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#534AB7]">Which One?</h1>
          <p className="text-sm text-[#6B6B6B] mt-2">One last step</p>
        </div>

        <div className="bg-white rounded-card border border-[#E5E5E5] p-6" style={{ borderWidth: '0.5px' }}>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">Choose your username</h2>
          <p className="text-sm text-[#6B6B6B] mb-6">
            This is the only name other users will see on your posts and votes.
            Your email is kept private.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">@</span>
                <input
                  autoFocus
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="yourname"
                  required
                  minLength={3}
                  maxLength={30}
                  className="w-full pl-8 pr-4 py-3 rounded-btn border border-[#E5E5E5] text-sm focus:border-[#534AB7] transition-colors outline-none"
                />
              </div>
              <p className="text-xs text-[#6B6B6B] mt-1.5 pl-1">Letters, numbers, underscores and dots only</p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-btn px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || username.trim().length < 3}
              className="w-full py-3.5 bg-[#534AB7] text-white rounded-btn font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Set username & continue'}
            </button>
          </form>

          <button
            onClick={signOut}
            className="mt-4 w-full py-2 text-sm text-[#6B6B6B] hover:text-[#534AB7] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
