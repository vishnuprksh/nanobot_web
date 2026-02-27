import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useStore } from '../store'
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Radio,
  Zap,
  Brain,
  RefreshCw,
  Wrench,
  Server,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { dashboard, setDashboard } = useStore()
  const [loading, setLoading] = useState(true)
  const [restarting, setRestarting] = useState(false)

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const data = await api.getDashboard()
      setDashboard(data)
    } catch (err: any) {
      toast.error('Failed to load dashboard: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const handleRestart = async () => {
    setRestarting(true)
    try {
      const res = await api.restartService()
      toast.success(res.message || 'Service restarted')
      setTimeout(fetchDashboard, 3000)
    } catch (err: any) {
      toast.error('Restart failed: ' + err.message)
    } finally {
      setRestarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-nano-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const d = dashboard
  if (!d) return <p className="text-dark-400">No data available</p>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-50">Dashboard</h2>
          <p className="text-dark-400 text-sm mt-1">Server overview and nanobot status</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchDashboard} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleRestart}
            disabled={restarting}
            className="btn-primary flex items-center gap-2"
          >
            {restarting ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Restart nanobot
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`card p-4 border-l-4 ${
          d.status.running ? 'border-l-emerald-500' : 'border-l-red-500'
        }`}
      >
        <div className="flex items-center gap-3">
          <Activity
            className={`w-5 h-5 ${d.status.running ? 'text-emerald-400' : 'text-red-400'}`}
          />
          <div>
            <span
              className={`font-semibold ${
                d.status.running ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {d.status.running ? 'Running' : 'Stopped'}
            </span>
            {d.status.pid && (
              <span className="text-dark-400 text-sm ml-3">PID: {d.status.pid}</span>
            )}
            {d.status.uptime && (
              <span className="text-dark-400 text-sm ml-3">{d.status.uptime}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Model */}
        <div className="card-hover p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-nano-600/15 rounded-lg flex items-center justify-center">
              <Cpu className="w-5 h-5 text-nano-400" />
            </div>
            <div className="text-sm text-dark-400">Model</div>
          </div>
          <p className="text-dark-100 font-medium text-sm truncate">{d.config_summary.model}</p>
          <p className="text-dark-500 text-xs mt-1">
            Temp: {d.config_summary.temperature} · Max: {d.config_summary.max_tokens}
          </p>
        </div>

        {/* Channels */}
        <div className="card-hover p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-500/15 rounded-lg flex items-center justify-center">
              <Radio className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-sm text-dark-400">Channels</div>
          </div>
          <p className="text-dark-100 font-medium">
            {d.channels.enabled.length}
            <span className="text-dark-500 text-sm font-normal"> / {d.channels.total} enabled</span>
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {d.channels.enabled.map((ch: string) => (
              <span key={ch} className="badge-success">
                {ch}
              </span>
            ))}
          </div>
        </div>

        {/* Providers */}
        <div className="card-hover p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-500/15 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-sm text-dark-400">Providers</div>
          </div>
          <p className="text-dark-100 font-medium">
            {d.providers.active.length}
            <span className="text-dark-500 text-sm font-normal"> / {d.providers.total} active</span>
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {d.providers.active.map((p: string) => (
              <span key={p} className="badge-info">
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* MCP Tools */}
        <div className="card-hover p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-500/15 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-sm text-dark-400">MCP Servers</div>
          </div>
          <p className="text-dark-100 font-medium">{d.tools.mcp_servers.length}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {d.tools.mcp_servers.map((s: string) => (
              <span key={s} className="badge-muted">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3 text-dark-300">
            <Server className="w-4 h-4" />
            <span className="text-sm font-medium">System</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-400">OS</span>
              <span className="text-dark-200">{d.status.system?.os || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Python</span>
              <span className="text-dark-200">{d.status.system?.python || '—'}</span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3 text-dark-300">
            <MemoryStick className="w-4 h-4" />
            <span className="text-sm font-medium">Memory</span>
          </div>
          {d.status.system?.memory ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-400">Total</span>
                <span className="text-dark-200">{d.status.system.memory.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Used</span>
                <span className="text-dark-200">{d.status.system.memory.used}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Free</span>
                <span className="text-dark-200">{d.status.system.memory.free}</span>
              </div>
            </div>
          ) : (
            <p className="text-dark-500 text-sm">Not available</p>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3 text-dark-300">
            <HardDrive className="w-4 h-4" />
            <span className="text-sm font-medium">Disk</span>
          </div>
          {d.status.system?.disk ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-400">Total</span>
                <span className="text-dark-200">{d.status.system.disk.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Used</span>
                <span className="text-dark-200">{d.status.system.disk.used}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Usage</span>
                <span className="text-dark-200">{d.status.system.disk.usage}</span>
              </div>
            </div>
          ) : (
            <p className="text-dark-500 text-sm">Not available</p>
          )}
        </div>
      </div>
    </div>
  )
}
