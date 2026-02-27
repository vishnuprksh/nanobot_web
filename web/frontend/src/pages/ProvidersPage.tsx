import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Zap, Save, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const PROVIDER_LIST = [
  'anthropic',
  'openai',
  'openrouter',
  'deepseek',
  'groq',
  'gemini',
  'zhipu',
  'dashscope',
  'vllm',
  'moonshot',
  'minimax',
  'aihubmix',
  'siliconflow',
  'volcengine',
  'openai_codex',
  'github_copilot',
  'custom',
]

export default function ProvidersPage() {
  const [providers, setProviders] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [apiBase, setApiBase] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchProviders = async () => {
    setLoading(true)
    try {
      const data = await api.getProviders()
      setProviders(data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders()
  }, [])

  const selectProvider = (key: string) => {
    setSelected(key)
    const p = providers[key] || {}
    setApiKey(p.apiKey || p.api_key || '')
    setApiBase(p.apiBase || p.api_base || '')
    setShowKey(false)
  }

  const saveProvider = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const data: Record<string, any> = { apiKey: apiKey }
      if (apiBase.trim()) data.apiBase = apiBase.trim()
      await api.updateProvider(selected, data)
      setProviders({ ...providers, [selected]: data })
      toast.success(`${selected} provider saved`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-nano-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-50">Providers</h2>
        <p className="text-dark-400 text-sm mt-1">Manage LLM provider API keys and endpoints</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Provider list */}
        <div className="space-y-2">
          {PROVIDER_LIST.map((key) => {
            const p = providers[key] || {}
            const hasKey = !!(p.apiKey || p.api_key)
            const isSelected = selected === key

            return (
              <div
                key={key}
                onClick={() => selectProvider(key)}
                className={`card-hover p-4 cursor-pointer flex items-center justify-between ${
                  isSelected ? 'border-nano-500/50 bg-nano-600/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Zap className={`w-4 h-4 ${hasKey ? 'text-amber-400' : 'text-dark-500'}`} />
                  <span className="font-medium text-dark-100">{key}</span>
                </div>
                {hasKey ? (
                  <span className="badge-success">Configured</span>
                ) : (
                  <span className="badge-muted">Not set</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Provider editor */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                {selected}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-1">API Key</label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="input w-full pr-10 font-mono text-sm"
                      placeholder="Enter API key..."
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dark-400 hover:text-dark-200"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-dark-300 mb-1">
                    API Base URL <span className="text-dark-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={apiBase}
                    onChange={(e) => setApiBase(e.target.value)}
                    className="input w-full font-mono text-sm"
                    placeholder="https://api.example.com/v1"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setSelected(null)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={saveProvider}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-12 flex flex-col items-center justify-center text-dark-500">
              <Zap className="w-10 h-10 mb-3 opacity-30" />
              <p>Select a provider to configure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
