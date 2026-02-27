import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ChatPage from './pages/ChatPage'
import AgentsPage from './pages/AgentsPage'
import CronPage from './pages/CronPage'
import ChannelsPage from './pages/ChannelsPage'
import ProvidersPage from './pages/ProvidersPage'
import SkillsPage from './pages/SkillsPage'
import ToolsPage from './pages/ToolsPage'
import MemoryPage from './pages/MemoryPage'
import LogsPage from './pages/LogsPage'
import ConfigPage from './pages/ConfigPage'
import { useEffect } from 'react'
import { api } from './api/client'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { setServerInfo } = useStore()

  useEffect(() => {
    api
      .getMe()
      .then(setServerInfo)
      .catch(() => {})
  }, [setServerInfo])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/agents" element={<AgentsPage />} />
                <Route path="/cron" element={<CronPage />} />
                <Route path="/channels" element={<ChannelsPage />} />
                <Route path="/providers" element={<ProvidersPage />} />
                <Route path="/skills" element={<SkillsPage />} />
                <Route path="/tools" element={<ToolsPage />} />
                <Route path="/memory" element={<MemoryPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/config" element={<ConfigPage />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
