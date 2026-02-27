import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Users, Save, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AgentsPage() {
  const [config, setConfig] = useState<any>(null)
  const [agentsMd, setAgentsMd] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable defaults
  const [model, setModel] = useState('')
  const [provider, setProvider] = useState('')
  const [maxTokens, setMaxTokens] = useState(8192)
  const [temperature, setTemperature] = useState(0.1)
  const [maxIterations, setMaxIterations] = useState(40)
  const [memoryWindow, setMemoryWindow] = useState(100)
  const [workspace, setWorkspace] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await api.getAgents()
      setConfig(data.config)
      setAgentsMd(data.agents_md || '')

      const defaults = data.config?.defaults || {}
      setModel(defaults.model || 'anthropic/claude-opus-4-5')
      setProvider(defaults.provider || 'auto')
      setMaxTokens(defaults.maxTokens || defaults.max_tokens || 8192)
      setTemperature(defaults.temperature ?? 0.1)
      setMaxIterations(defaults.maxToolIterations || defaults.max_tool_iterations || 40)
      setMemoryWindow(defaults.memoryWindow || defaults.memory_window || 100)
      setWorkspace(defaults.workspace || '~/.nanobot/workspace')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const saveConfig = async () => {
    setSaving(true)
    try {
      await api.updateAgentsConfig({
        defaults: {
          model,
          provider,
          maxTokens,
          temperature,
          maxToolIterations: maxIterations,
          memoryWindow,
          workspace,
        },
      })
      toast.success('Agent configuration saved')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const saveAgentsMd = async () => {
    setSaving(true)
    try {
      await api.updateAgentsMd(agentsMd)
      toast.success('AGENTS.md saved')
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-50">Agents</h2>
          <p className="text-dark-400 text-sm mt-1">
            Configure agent defaults and sub-agent definitions
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Agent Defaults */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-nano-400" />
          Agent Defaults
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="input w-full"
            >
              <option value="auto">auto</option>
              <option value="anthropic">anthropic</option>
              <option value="openai">openai</option>
              <option value="openrouter">openrouter</option>
              <option value="deepseek">deepseek</option>
              <option value="groq">groq</option>
              <option value="gemini">gemini</option>
              <option value="custom">custom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Max Tokens</label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Temperature</label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Max Tool Iterations</label>
            <input
              type="number"
              value={maxIterations}
              onChange={(e) => setMaxIterations(Number(e.target.value))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Memory Window</label>
            <input
              type="number"
              value={memoryWindow}
              onChange={(e) => setMemoryWindow(Number(e.target.value))}
              className="input w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-dark-300 mb-1">Workspace Path</label>
            <input
              type="text"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              className="input w-full font-mono text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={saveConfig} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Defaults
          </button>
        </div>
      </div>

      {/* AGENTS.md Editor */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-dark-100 mb-4">
          AGENTS.md
          <span className="text-dark-400 text-sm font-normal ml-2">
            Define sub-agents and their behaviors
          </span>
        </h3>

        <textarea
          value={agentsMd}
          onChange={(e) => setAgentsMd(e.target.value)}
          rows={20}
          className="input w-full font-mono text-sm resize-y"
          placeholder="# Sub-Agents&#10;&#10;Define your sub-agents here..."
        />

        <div className="mt-4 flex justify-end">
          <button onClick={saveAgentsMd} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save AGENTS.md
          </button>
        </div>
      </div>
    </div>
  )
}
