import { useEffect, useState, useRef } from 'react'
import { api } from '../api/client'
import { FileText, RefreshCw, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LogsPage() {
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState(200)
  const logsRef = useRef<HTMLPreElement>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const data = await api.getLogs(lines)
      setLogs(data.logs || 'No logs available')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [lines])

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs])

  const downloadLogs = () => {
    const blob = new Blob([logs], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nanobot-logs-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-50">Logs</h2>
          <p className="text-dark-400 text-sm mt-1">View nanobot service logs</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={lines}
            onChange={(e) => setLines(Number(e.target.value))}
            className="input text-sm"
          >
            <option value={50}>50 lines</option>
            <option value={100}>100 lines</option>
            <option value={200}>200 lines</option>
            <option value={500}>500 lines</option>
            <option value={1000}>1000 lines</option>
          </select>
          <button onClick={downloadLogs} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={fetchLogs} className="btn-primary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-nano-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <pre
            ref={logsRef}
            className="p-4 text-xs font-mono text-dark-300 overflow-auto max-h-[70vh] whitespace-pre-wrap"
          >
            {logs}
          </pre>
        )}
      </div>
    </div>
  )
}
