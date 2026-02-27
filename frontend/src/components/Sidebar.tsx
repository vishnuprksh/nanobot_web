import { NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Radio,
  Zap,
  Settings,
  Brain,
  Database,
  FileText,
  LogOut,
  Menu,
  Server,
  Wrench,
  Clock,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/agents', icon: Users, label: 'Agents' },
  { to: '/cron', icon: Clock, label: 'Cron' },
  { to: '/channels', icon: Radio, label: 'Channels' },
  { to: '/providers', icon: Zap, label: 'Providers' },
  { to: '/skills', icon: Brain, label: 'Skills' },
  { to: '/tools', icon: Wrench, label: 'Tools' },
  { to: '/memory', icon: Database, label: 'Memory' },
  { to: '/logs', icon: FileText, label: 'Logs' },
  { to: '/config', icon: Settings, label: 'Config' },
]

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, logout, serverInfo } = useStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-dark-800 rounded-lg border border-dark-700"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-dark-900/95 backdrop-blur-xl border-r border-dark-700/50 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Branding */}
        <div className="p-5 border-b border-dark-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-nano-600/20 rounded-lg flex items-center justify-center text-xl">
              🐈
            </div>
            <div>
              <h1 className="text-lg font-semibold text-dark-50">nanobot</h1>
              <p className="text-xs text-dark-400">Management Console</p>
            </div>
          </div>
        </div>

        {/* Server info */}
        {serverInfo && (
          <div className="px-5 py-3 border-b border-dark-700/50">
            <div className="flex items-center gap-2 text-xs text-dark-400">
              <Server className="w-3.5 h-3.5" />
              <span className="truncate">
                {serverInfo.username}@{serverInfo.host}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-nano-600/15 text-nano-400 border border-nano-600/20'
                      : 'text-dark-300 hover:bg-dark-800 hover:text-dark-100'
                  }`
                }
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-dark-700/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-dark-400 hover:bg-red-500/10 hover:text-red-400 transition-colors w-full"
          >
            <LogOut className="w-4.5 h-4.5" />
            Disconnect
          </button>
        </div>
      </aside>
    </>
  )
}
