import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useStore } from '../store'
import { Server, Lock, User, Hash, TestTube, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuthenticated, setServerInfo } = useStore()

  const [host, setHost] = useState('')
  const [port, setPort] = useState(22)
  const [username, setUsername] = useState('root')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testingConnectivity, setTestingConnectivity] = useState(false)
  const [connectivityResults, setConnectivityResults] = useState<any>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!host || !password) {
      toast.error('Host and password are required')
      return
    }
    setLoading(true)
    try {
      await api.login(host, port, username, password)
      setAuthenticated(true)
      setServerInfo({ host, port, username })
      toast.success('Connected to server')
      navigate('/')
    } catch (err: any) {
      toast.error(err.message || 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  const testConnectivity = async () => {
    if (!host) {
      toast.error('Host is required for connectivity test')
      return
    }
    setTestingConnectivity(true)
    setConnectivityResults(null)
    try {
      const results = await api.testConnectivity(host)
      setConnectivityResults(results)
    } catch (err: any) {
      toast.error('Connectivity test failed: ' + err.message)
    } finally {
      setTestingConnectivity(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-nano-600/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 border border-nano-600/20">
            🐈
          </div>
          <h1 className="text-3xl font-bold text-dark-50">nanobot</h1>
          <p className="text-dark-400 mt-2">Connect to your nanobot server</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="card p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              <Server className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Server Host
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="e.g. 192.168.1.100 or my-server.com"
                className="input flex-1"
                required
              />
              <button
                type="button"
                onClick={testConnectivity}
                disabled={testingConnectivity || !host}
                className="btn-secondary flex items-center gap-2 whitespace-nowrap"
              >
                {testingConnectivity ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                Test Ports
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                <Hash className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                SSH Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                <User className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              <Lock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="SSH password"
                className="input w-full pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-400 hover:text-dark-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Connecting...
              </span>
            ) : (
              'Connect via SSH'
            )}
          </button>
        </form>

        {/* Connectivity Test Results */}
        {connectivityResults && (
          <div className="card p-4 mt-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-3 flex items-center gap-2">
              <TestTube className="w-5 h-5 text-nano-400" />
              Port Scan Results for {connectivityResults.host}
            </h3>
            
            <div className="grid grid-cols-3 gap-2 mb-3">
              {Object.entries(connectivityResults.results).map(([port, isOpen]: [string, any]) => (
                <div
                  key={port}
                  className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    isOpen ? 'bg-emerald-500/10 text-emerald-400' : 'bg-dark-700 text-dark-400'
                  }`}
                >
                  {isOpen ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  Port {port}
                </div>
              ))}
            </div>
            
            <p className="text-sm text-dark-300">
              {connectivityResults.suggestion}
            </p>
          </div>
        )}

        <p className="text-center text-xs text-dark-500 mt-6">
          Connects to your server via SSH to manage nanobot
        </p>
      </div>
    </div>
  )
}
