import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterScreen() {
  const navigate   = useNavigate()
  const { signUp } = useAuth()

  const [email, setEmail]       = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (username.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }
    if (!/^[a-z0-9_.]+$/i.test(username)) {
      setError('Username may only contain letters, numbers, underscores, and dots.')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, username.toLowerCase())
      navigate('/')
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
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
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">Create free account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="yourname"
                  required
                  minLength={3}
                  maxLength={30}
                  className="w-full pl-8 pr-4 py-3 rounded-btn border border-[#E5E5E5] text-sm focus:border-[#534AB7] transition-colors"
                />
              </div>
            </div>

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
                placeholder="Min 6 characters"
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
              ) : 'Create free account'}
            </button>
          </form>

          <p className="text-center text-sm text-[#6B6B6B] mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-[#534AB7] font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
