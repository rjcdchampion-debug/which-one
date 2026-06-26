import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import BottomNav from './components/BottomNav'
import FeedScreen          from './screens/FeedScreen'
import PostDetailScreen    from './screens/PostDetailScreen'
import CreatePostScreen    from './screens/CreatePostScreen'
import ProfileScreen       from './screens/ProfileScreen'
import LoginScreen         from './screens/LoginScreen'
import RegisterScreen      from './screens/RegisterScreen'
import SetupUsernameScreen from './screens/SetupUsernameScreen'
import PricingScreen       from './screens/PricingScreen'

function ProtectedRoute({ children }) {
  const { user, profileMissing, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (profileMissing) return <Navigate to="/setup-username" replace />
  return children
}

export default function App() {
  const { user, profile, profileMissing, loading } = useAuth()


  if (loading) {
    return (
      <div className="h-full bg-[#F5F5F5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#534AB7] border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
          <p className="text-sm text-[#6B6B6B]">Loading…</p>
        </div>
      </div>
    )
  }

  // Logged in but genuinely no profile row — ask them to pick a username
  if (user && profileMissing) {
    return (
      <div className="h-full bg-[#F5F5F5]">
        <Routes>
          <Route path="/setup-username" element={<SetupUsernameScreen />} />
          <Route path="*" element={<Navigate to="/setup-username" replace />} />
        </Routes>
      </div>
    )
  }

  return (
    <div className="h-full bg-[#F5F5F5]">
      <Routes>
        <Route path="/login"    element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/setup-username" element={<Navigate to="/" replace />} />

        {/* Public routes with bottom nav */}
        <Route path="/" element={<>
          <FeedScreen />
          <BottomNav />
        </>} />
        <Route path="/post/:id" element={<>
          <PostDetailScreen />
          <BottomNav />
        </>} />

        {/* Auth-required routes */}
        <Route path="/create" element={
          <ProtectedRoute>
            <CreatePostScreen />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={<>
          <ProfileScreen />
          <BottomNav />
        </>} />
        <Route path="/pricing" element={<PricingScreen />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
