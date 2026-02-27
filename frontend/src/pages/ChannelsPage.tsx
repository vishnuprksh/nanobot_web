import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Radio, Save, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const CHANNEL_LIST = [
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { key: 'telegram', label: 'Telegram', icon: '✈️' },
  { key: 'discord', label: 'Discord', icon: '🎮' },
  { key: 'slack', label: 'Slack', icon: '💼' },
  { key: 'email', label: 'Email', icon: '📧' },
  { key: 'matrix', label: 'Matrix', icon: '🔐' },
  { key: 'feishu', label: 'Feishu/Lark', icon: '🐦' },
  { key: 'dingtalk', label: 'DingTalk', icon: '📌' },
  { key: 'mochat', label: 'Mochat', icon: '🐱' },
  { key: 'qq', label: 'QQ', icon: '🐧' },
]

export default function ChannelsPage() {
  const [channels, setChannels] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [editJson, setEditJson] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchChannels = async () => {
    setLoading(true)
    try {
      const data = await api.getChannels()
      setChannels(data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChannels()
  }, [])

  const selectChannel = (key: string) => {
    setSelected(key)
    const cfg = channels[key] || {}
    setEditJson(JSON.stringify(cfg, null, 2))
  }

  const saveChannel = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const data = JSON.parse(editJson)
      await api.updateChannel(selected, data)
      setChannels({ ...channels, [selected]: data })
      toast.success(`${selected} channel saved`)
    } catch (err: any) {
      toast.error(err.message || 'Invalid JSON')
    } finally {
      setSaving(false)
    }
  }

  const toggleChannel = async (key: string) => {
    const cfg = { ...(channels[key] || {}), enabled: !(channels[key]?.enabled) }
    try {
      await api.updateChannel(key, cfg)
      setChannels({ ...channels, [key]: cfg })
      toast.success(`${key} ${cfg.enabled ? 'enabled' : 'disabled'}`)
      if (selected === key) setEditJson(JSON.stringify(cfg, null, 2))
    } catch (err: any) {
      toast.error(err.message)
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
        <h2 className="text-2xl font-bold text-dark-50">Channels</h2>
        <p className="text-dark-400 text-sm mt-1">Manage chat channel integrations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel list */}
        <div className="space-y-2">
          {CHANNEL_LIST.map(({ key, label, icon }) => {
            const cfg = channels[key] || {}
            const isEnabled = cfg.enabled === true
            const isSelected = selected === key

            return (
              <div
                key={key}
                onClick={() => selectChannel(key)}
                className={`card-hover p-4 cursor-pointer flex items-center justify-between ${
                  isSelected ? 'border-nano-500/50 bg-nano-600/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className="font-medium text-dark-100">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isEnabled ? (
                    <span className="badge-success">Enabled</span>
                  ) : (
                    <span className="badge-muted">Disabled</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleChannel(key)
                    }}
                    className={`p-1 rounded transition-colors ${
                      isEnabled
                        ? 'text-emerald-400 hover:bg-emerald-500/10'
                        : 'text-dark-400 hover:bg-dark-700'
                    }`}
                  >
                    {isEnabled ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Channel editor */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
                <Radio className="w-5 h-5 text-nano-400" />
                {CHANNEL_LIST.find((c) => c.key === selected)?.label} Configuration
              </h3>

              <textarea
                value={editJson}
                onChange={(e) => setEditJson(e.target.value)}
                rows={20}
                className="input w-full font-mono text-sm resize-y"
              />

              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setSelected(null)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={saveChannel}
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
              <Radio className="w-10 h-10 mb-3 opacity-30" />
              <p>Select a channel to configure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
