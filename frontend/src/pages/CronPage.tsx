import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Clock, Plus, Trash2, Play, Pause, RefreshCw, Send, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface CronJob {
  id: string
  name: string
  enabled: boolean
  schedule: {
    kind: 'at' | 'every' | 'cron'
    atMs?: number
    everyMs?: number
    expr?: string
    tz?: string
  }
  payload: {
    message: string
    deliver: boolean
    to?: string
    channel?: string
  }
  state: {
    nextRunAtMs?: number
    lastRunAtMs?: number
    lastStatus?: 'ok' | 'error' | 'skipped'
    lastError?: string
  }
}

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  // New job state
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [scheduleType, setScheduleType] = useState<'every' | 'cron' | 'at'>('every')
  const [scheduleValue, setScheduleValue] = useState<string>('3600')
  const [tz, setTz] = useState('')
  const [deliver, setDeliver] = useState(false)
  const [to, setTo] = useState('')
  const [channel, setChannel] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const data = await api.getCronJobs()
      setJobs(data || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    try {
      await api.addCronJob({
        name,
        message,
        schedule_type: scheduleType,
        schedule_value: scheduleType === 'every' ? parseInt(scheduleValue) : scheduleValue,
        tz: tz || undefined,
        deliver,
        to: to || undefined,
        channel: channel || undefined
      })
      toast.success('Job added successfully')
      setShowAdd(false)
      setName('')
      setMessage('')
      fetchJobs()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (job: CronJob) => {
    try {
      await api.toggleCronJob(job.id, !job.enabled)
      toast.success(`Job ${!job.enabled ? 'enabled' : 'disabled'}`)
      fetchJobs()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this scheduled job?')) return
    try {
      await api.removeCronJob(id)
      toast.success('Job removed')
      fetchJobs()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleRun = async (id: string) => {
    const runToast = toast.loading('Executing job...')
    try {
      await api.runCronJob(id)
      toast.success('Job executed successfully', { id: runToast })
      fetchJobs()
    } catch (err: any) {
      toast.error(err.message, { id: runToast })
    }
  }

  const formatSchedule = (job: CronJob) => {
    const { kind, everyMs, expr, tz } = job.schedule
    if (kind === 'every') return `Every ${(everyMs || 0) / 1000}s`
    if (kind === 'cron') return `${expr} ${tz ? `(${tz})` : ''}`
    if (kind === 'at') return `One-time (at ${new Date(job.schedule.atMs || 0).toLocaleString()})`
    return kind
  }

  const formatTime = (ms?: number) => {
    if (!ms) return 'Never'
    return new Date(ms).toLocaleString()
  }

  if (loading && jobs.length === 0) {
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
          <h2 className="text-2xl font-bold text-dark-50">Scheduled Tasks</h2>
          <p className="text-dark-400 text-sm mt-1">
            Manage Cron jobs and recurring agent tasks
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchJobs} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Job
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card p-6 border-nano-500/30">
          <form onSubmit={handleAddJob} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Job Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Daily Summary"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Message</label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Give me a summary of my tasks"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Schedule Type</label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as any)}
                  className="input-field"
                >
                  <option value="every">Every N seconds</option>
                  <option value="cron">Cron Expression</option>
                  <option value="at">Specific Time (ISO)</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  {scheduleType === 'every' ? 'Seconds' : scheduleType === 'cron' ? 'Cron Expresson (e.g. 0 9 * * *)' : 'ISO Date (e.g. 2024-12-31T23:59:59)'}
                </label>
                <input
                  type="text"
                  value={scheduleValue}
                  onChange={(e) => setScheduleValue(e.target.value)}
                  className="input-field"
                  placeholder={scheduleType === 'every' ? '3600' : scheduleType === 'cron' ? '0 9 * * *' : '2024-12-31T23:59:59'}
                  required
                />
              </div>
            </div>

            {scheduleType === 'cron' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Timezone (Optional)</label>
                <input
                  type="text"
                  value={tz}
                  onChange={(e) => setTz(e.target.value)}
                  className="input-field"
                  placeholder="e.g. America/Vancouver"
                />
              </div>
            )}

            <div className="border-t border-dark-800 pt-4 mt-2">
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deliver}
                    onChange={(e) => setDeliver(e.target.checked)}
                    className="w-4 h-4 rounded border-dark-700 bg-dark-800 text-nano-500 focus:ring-nano-500"
                  />
                  <span className="text-sm text-dark-200">Deliver response to channel</span>
                </label>
              </div>

              {deliver && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Target (Chat ID/Email)</label>
                    <input
                      type="text"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="input-field"
                      placeholder="e.g. @user or email@example.com"
                      required={deliver}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Channel</label>
                    <input
                      type="text"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className="input-field"
                      placeholder="e.g. telegram, email, whatsapp"
                      required={deliver}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="btn-primary flex items-center gap-2"
              >
                {adding && <RefreshCw className="w-4 h-4 animate-spin" />}
                Add Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 card border-dashed border-dark-700 text-dark-400">
            <Clock className="w-12 h-12 mb-4 opacity-20" />
            <p>No scheduled jobs found</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className={`card p-5 transition-all ${!job.enabled ? 'opacity-60' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${job.enabled ? 'bg-nano-500/10 text-nano-400' : 'bg-dark-800 text-dark-400'}`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-dark-50 flex items-center gap-2">
                      {job.name}
                      {!job.enabled && <span className="text-[10px] uppercase tracking-wider bg-dark-800 text-dark-400 px-1.5 py-0.5 rounded">Disabled</span>}
                    </h3>
                    <p className="text-sm text-dark-300 mt-0.5">{job.payload.message}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-dark-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatSchedule(job)}</span>
                      </div>
                      {job.payload.deliver && (
                        <div className="flex items-center gap-1.5 text-xs text-nano-400">
                          <Send className="w-3.5 h-3.5" />
                          <span>Deliver to {job.payload.channel}:{job.payload.to}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRun(job.id)}
                    className="p-2 hover:bg-dark-800 text-dark-300 hover:text-nano-400 rounded-lg transition-colors"
                    title="Run Now"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggle(job)}
                    className={`p-2 rounded-lg transition-colors ${
                      job.enabled ? 'hover:bg-dark-800 text-nano-400' : 'hover:bg-dark-800 text-dark-400'
                    }`}
                    title={job.enabled ? 'Disable' : 'Enable'}
                  >
                    {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleRemove(job.id)}
                    className="p-2 hover:bg-red-500/10 text-dark-300 hover:text-red-400 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-dark-800/50">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-dark-500 tracking-wider">Next Run</span>
                  <p className="text-xs text-dark-200">{formatTime(job.state.nextRunAtMs)}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-dark-500 tracking-wider">Last Run</span>
                  <p className="text-xs text-dark-200">{formatTime(job.state.lastRunAtMs)}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-dark-500 tracking-wider">Status</span>
                  <div className="flex items-center gap-1">
                    {job.state.lastStatus === 'ok' ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500/60" />
                    ) : job.state.lastStatus === 'error' ? (
                      <XCircle className="w-3 h-3 text-red-500/60" />
                    ) : null}
                    <p className={`text-xs ${
                      job.state.lastStatus === 'ok' ? 'text-green-400/80' : 
                      job.state.lastStatus === 'error' ? 'text-red-400/80' : 'text-dark-400'
                    }`}>
                      {job.state.lastStatus || 'None'}
                    </p>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-dark-500 tracking-wider">Last Error</span>
                  <p className="text-xs text-dark-400 truncate max-w-xs" title={job.state.lastError}>
                    {job.state.lastError || 'None'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
