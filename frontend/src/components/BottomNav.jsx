import { useNavigate, useLocation } from 'react-router-dom'
import { Home, User, PlusCircle, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function BottomNav() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const { user }     = useAuth()

  function NavBtn({ path, Icon, label }) {
    const active = pathname === path
    return (
      <button
        onClick={() => navigate(path)}
        className={`flex flex-col items-center gap-0.5 py-3 px-8 text-[11px] font-medium transition-colors ${
          active ? 'text-[#534AB7]' : 'text-[#6B6B6B]'
        }`}
      >
        <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
        {label}
      </button>
    )
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 flex justify-center pointer-events-none">
      <div
        className="w-full max-w-app bg-white border-t border-[#E5E5E5] flex items-center justify-around pointer-events-auto"
        style={{
          borderTopWidth: '0.5px',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        }}
      >
        <NavBtn path="/" Icon={Home} label="Feed" />

        {/* Centre FAB */}
        <button
          onClick={() => navigate('/create')}
          className="flex flex-col items-center gap-0.5 px-8 text-[11px] font-medium text-[#534AB7]"
          style={{ paddingTop: 0 }}
        >
          <div className="w-10 h-10 -mt-5 rounded-full bg-[#534AB7] flex items-center justify-center shadow-lg">
            <PlusCircle size={22} className="text-white" strokeWidth={2} />
          </div>
          <span className="mt-0.5">Post</span>
        </button>

        {user ? (
          <NavBtn path="/profile" Icon={User} label="Profile" />
        ) : (
          <button
            onClick={() => navigate('/register')}
            className="flex flex-col items-center gap-0.5 py-3 px-8 text-[11px] font-medium text-[#534AB7]"
          >
            <UserPlus size={22} strokeWidth={1.8} />
            Sign up
          </button>
        )}
      </div>
    </nav>
  )
}
