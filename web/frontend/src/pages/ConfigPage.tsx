import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Settings, Save, RefreshCw, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ConfigPage() {
  const [config, setConfig] = useState<any>(null)
  const [editJson, setEditJson] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const data = await api.getConfig()
      setConfig(data)
      setEditJson(JSON.stringify(data, null, 2))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const saveConfig = async () => {
    setSaving(true)
    try {
      const data = JSON.parse(editJson)
      await api.updateConfig(data)
      setConfig(data)
      toast.success('Configuration saved. You may need to restart nanobot for changes to take effect.')
    } catch (err: any) {
      toast.error(err.message || 'Invalid JSON')
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editJson)
    toast.success('Copied to clipboard')
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
          <h2 className="text-2xl font-bold text-dark-50">Configuration</h2>
          <p className="text-dark-400 text-sm mt-1">
            Full nanobot config.json — edit with care
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={copyToClipboard} className="btn-secondary flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button onClick={fetchConfig} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4 text-dark-300">
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium font-mono">~/.nanobot/config.json</span>
        </div>

        <textarea
          value={editJson}
          onChange={(e) => setEditJson(e.target.value)}
          rows={30}
          className="input w-full font-mono text-sm resize-y"
          spellCheck={false}
        />

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-dark-500">
            Changes here are written directly to the server config file
          </p>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}
