import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Brain, Save, Plus, RefreshCw, FolderOpen, Package } from 'lucide-react'
import toast from 'react-hot-toast'

interface Skill {
  name: string
  source: string
  path: string
  content: string
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Skill | null>(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  // New skill
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('# Skill Name\n\n## Description\n\n## Usage\n')

  const fetchSkills = async () => {
    setLoading(true)
    try {
      const data = await api.getSkills()
      setSkills(data.skills || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSkills()
  }, [])

  const selectSkill = (skill: Skill) => {
    setSelected(skill)
    setEditContent(skill.content)
    setShowCreate(false)
  }

  const saveSkill = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await api.updateSkill(selected.name, editContent)
      toast.success(`Skill "${selected.name}" saved`)
      fetchSkills()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const createSkill = async () => {
    if (!newName.trim()) {
      toast.error('Skill name is required')
      return
    }
    setSaving(true)
    try {
      await api.createSkill(newName.trim(), newContent)
      toast.success(`Skill "${newName}" created`)
      setShowCreate(false)
      setNewName('')
      setNewContent('# Skill Name\n\n## Description\n\n## Usage\n')
      fetchSkills()
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
          <h2 className="text-2xl font-bold text-dark-50">Skills</h2>
          <p className="text-dark-400 text-sm mt-1">
            Manage agent skills (SKILL.md files that teach capabilities)
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchSkills} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              setShowCreate(true)
              setSelected(null)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Skill
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Skills list */}
        <div className="space-y-2">
          {skills.length === 0 && (
            <div className="card p-8 text-center text-dark-500">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No skills found</p>
            </div>
          )}
          {skills.map((skill) => (
            <div
              key={skill.name}
              onClick={() => selectSkill(skill)}
              className={`card-hover p-4 cursor-pointer ${
                selected?.name === skill.name ? 'border-nano-500/50 bg-nano-600/5' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="w-4 h-4 text-nano-400" />
                  <span className="font-medium text-dark-100">{skill.name}</span>
                </div>
                <span className={skill.source === 'builtin' ? 'badge-info' : 'badge-success'}>
                  {skill.source === 'builtin' ? (
                    <><Package className="w-3 h-3 mr-1" />builtin</>
                  ) : (
                    <><FolderOpen className="w-3 h-3 mr-1" />workspace</>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {showCreate ? (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-dark-100 mb-4">Create New Skill</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Skill Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input w-full"
                    placeholder="e.g. my-skill"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">SKILL.md Content</label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={16}
                    className="input w-full font-mono text-sm resize-y"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setShowCreate(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={createSkill}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Skill
                </button>
              </div>
            </div>
          ) : selected ? (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-dark-100 mb-1 flex items-center gap-2">
                <Brain className="w-5 h-5 text-nano-400" />
                {selected.name}
              </h3>
              <p className="text-xs text-dark-500 mb-4 font-mono">{selected.path}</p>

              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={20}
                className="input w-full font-mono text-sm resize-y"
              />

              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setSelected(null)} className="btn-secondary">
                  Close
                </button>
                <button
                  onClick={saveSkill}
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
              <Brain className="w-10 h-10 mb-3 opacity-30" />
              <p>Select a skill to view or edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
