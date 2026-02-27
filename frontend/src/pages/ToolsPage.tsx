import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Wrench, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ToolsPage() {
  const [tools, setTools] = useState<any>(null)
  const [editJson, setEditJson] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchTools = async () => {
    setLoading(true)
    try {
      const data = await api.getTools()
      setTools(data)
      setEditJson(JSON.stringify(data, null, 2))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTools()
  }, [])

  const saveTools = async () => {
    setSaving(true)
    try {
      const data = JSON.parse(editJson)
      await api.updateTools(data)
      setTools(data)
      toast.success('Tools configuration saved')
    } catch (err: any) {
      toast.error(err.message || 'Invalid JSON')
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

  const mcpServers = tools?.mcpServers || tools?.mcp_servers || {}
  const mcpKeys = Object.keys(mcpServers)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-50">Tools</h2>
        <p className="text-dark-400 text-sm mt-1">Configure tools, MCP servers, and exec settings</p>
      </div>

      {/* Quick overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-dark-400 mb-1">Restrict to Workspace</div>
          <div className="font-medium text-dark-100">
            {tools?.restrictToWorkspace || tools?.restrict_to_workspace ? 'Yes' : 'No'}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-dark-400 mb-1">Shell Timeout</div>
          <div className="font-medium text-dark-100">
            {tools?.exec?.timeout || 60}s
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-dark-400 mb-1">MCP Servers</div>
          <div className="font-medium text-dark-100">
            {mcpKeys.length} configured
          </div>
        </div>
      </div>

      {/* MCP Servers quick view */}
      {mcpKeys.length > 0 && (
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-dark-100 mb-3 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-purple-400" />
            MCP Servers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mcpKeys.map((key) => (
              <div key={key} className="bg-dark-800 rounded-lg p-3 border border-dark-700">
                <div className="font-medium text-dark-100 text-sm">{key}</div>
                <div className="text-xs text-dark-500 font-mono mt-1">
                  {mcpServers[key].command
                    ? `${mcpServers[key].command} ${(mcpServers[key].args || []).join(' ')}`
                    : mcpServers[key].url || 'No command/url configured'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full JSON editor */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-dark-100 mb-4">Full Tools Configuration</h3>
        <textarea
          value={editJson}
          onChange={(e) => setEditJson(e.target.value)}
          rows={20}
          className="input w-full font-mono text-sm resize-y"
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={saveTools}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Tools Config
          </button>
        </div>
      </div>
    </div>
  )
}
