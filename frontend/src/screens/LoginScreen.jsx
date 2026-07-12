import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginScreen() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { signIn } = useAuth()

  const fromCreate = location.state?.from === '/create'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Sign-in failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="w-full max-w-app">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#534AB7]">This or That?</h1>
          <p className="text-sm text-[#6B6B6B] mt-2">let the crowd decide</p>
        </div>

        <div className="bg-white rounded-card border border-[#E5E5E5] p-6" style={{ borderWidth: '0.5px' }}>
          {fromCreate ? (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#1A1A1A]">Create a free account to post</h2>
              <p className="text-sm text-[#6B6B6B] mt-2">
                You can vote without signing in — but to share your own This or That, you'll need an account.
              </p>
            </div>
          ) : (
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">Sign in</h2>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-btn border border-[#E5E5E5] text-sm focus:border-[#534AB7] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-btn border border-[#E5E5E5] text-sm focus:border-[#534AB7] transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-btn px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#534AB7] text-white rounded-btn font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-[#6B6B6B] mt-5">
            No account?{' '}
            <Link to="/register" className="text-[#534AB7] font-semibold">
              Create a free account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-[#6B6B6B] mt-4">
          You can also{' '}
          <button
            onClick={() => navigate('/')}
            className="text-[#534AB7] font-medium"
          >
            browse as a guest
          </button>
        </p>
      </div>
    </div>
  )
}
