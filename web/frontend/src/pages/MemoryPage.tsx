import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Database, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface MemoryFile {
  name: string
  path: string
  content: string
}

export default function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MemoryFile | null>(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchMemory = async () => {
    setLoading(true)
    try {
      const data = await api.getMemory()
      setFiles(data.files || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMemory()
  }, [])

  const selectFile = (file: MemoryFile) => {
    setSelected(file)
    setEditContent(file.content)
  }

  const saveFile = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await api.updateMemory(selected.path, editContent)
      toast.success(`Memory file "${selected.name}" saved`)
      fetchMemory()
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
        <h2 className="text-2xl font-bold text-dark-50">Memory</h2>
        <p className="text-dark-400 text-sm mt-1">View and edit nanobot's persistent memory files</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          {files.length === 0 && (
            <div className="card p-8 text-center text-dark-500">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No memory files found</p>
            </div>
          )}
          {files.map((file) => (
            <div
              key={file.path}
              onClick={() => selectFile(file)}
              className={`card-hover p-4 cursor-pointer ${
                selected?.path === file.path ? 'border-nano-500/50 bg-nano-600/5' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-nano-400" />
                <div>
                  <span className="font-medium text-dark-100">{file.name}</span>
                  <p className="text-xs text-dark-500 font-mono truncate">{file.path}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-dark-100 mb-1">{selected.name}</h3>
              <p className="text-xs text-dark-500 font-mono mb-4">{selected.path}</p>

              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={24}
                className="input w-full font-mono text-sm resize-y"
              />

              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setSelected(null)} className="btn-secondary">
                  Close
                </button>
                <button
                  onClick={saveFile}
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
              <Database className="w-10 h-10 mb-3 opacity-30" />
              <p>Select a file to view or edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
