'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Flag } from '@/lib/types'

export default function FlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null) // stores id being saved
  const [deleting, setDeleting] = useState<string | null>(null)
  const [newFlagName, setNewFlagName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Per-flag editable state: description + is_keep
  const [edits, setEdits] = useState<Record<string, { description: string; is_keep: boolean }>>({})

  const load = useCallback(() => {
    fetch('/api/flags').then(r => r.json()).then((data: Flag[]) => {
      setFlags(data ?? [])
      // Seed edits map for any new flags
      setEdits(prev => {
        const next = { ...prev }
        for (const f of data ?? []) {
          if (!next[f.id]) next[f.id] = { description: f.description, is_keep: f.is_keep }
        }
        return next
      })
    })
  }, [])

  useEffect(() => { load() }, [load])

  async function saveFlag(flag: Flag) {
    const edit = edits[flag.id]
    if (!edit) return
    setSaving(flag.id)
    await fetch(`/api/flags/${flag.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: edit.description, is_keep: edit.is_keep }),
    })
    setSaving(null)
    load()
  }

  async function deleteFlag(flag: Flag) {
    if (!confirm(`Delete flag "${flag.name}"? This does not remove it from card consequences.`)) return
    setDeleting(flag.id)
    await fetch(`/api/flags/${flag.id}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  async function createFlag() {
    if (!newFlagName.trim()) return
    setCreating(true)
    setCreateError(null)
    const res = await fetch('/api/flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFlagName.trim(), description: '', is_keep: newFlagName.endsWith('_keep') }),
    })
    setCreating(false)
    if (!res.ok) { setCreateError((await res.json()).error ?? 'Failed'); return }
    setNewFlagName('')
    load()
  }

  const filtered = flags.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white">Flag Registry</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Flags are auto-created when cards with set/clear consequences are saved.
              Flags ending in <code className="font-mono text-gray-400">_keep</code> persist across resets.
            </p>
          </div>
          <span className="text-xs text-gray-600">{flags.length} flags</span>
        </div>

        {/* Search + manual create */}
        <div className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search flags…"
            className="flex-1 bg-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
          />
          <div className="flex gap-1">
            <input
              value={newFlagName}
              onChange={e => setNewFlagName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFlag() }}
              placeholder="new_flag_name"
              className="w-40 bg-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600 font-mono"
            />
            <button onClick={createFlag} disabled={creating || !newFlagName.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-3 py-2 rounded font-medium">
              {creating ? '…' : '+ Add'}
            </button>
          </div>
        </div>
        {createError && <p className="text-xs text-red-400">{createError}</p>}

        {/* Flag list */}
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">
            {flags.length === 0 ? 'No flags yet — save a card with set/clear consequences to populate.' : 'No flags match your search.'}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map(flag => {
              const edit = edits[flag.id] ?? { description: flag.description, is_keep: flag.is_keep }
              const isDirty = edit.description !== flag.description || edit.is_keep !== flag.is_keep
              return (
                <div key={flag.id}
                  className={`border rounded-lg p-3 space-y-2 transition-colors ${selectedId === flag.id ? 'border-indigo-700/50 bg-indigo-900/10' : 'border-gray-800 bg-gray-900/50'}`}
                  onClick={() => setSelectedId(id => id === flag.id ? null : flag.id)}
                >
                  {/* Flag name row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <code className="text-sm font-mono text-white truncate">{flag.name}</code>
                      {flag.is_keep && (
                        <span className="text-[10px] bg-indigo-900/50 text-indigo-400 border border-indigo-700/50 rounded px-1.5 py-0.5 shrink-0">_keep</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isDirty && (
                        <button onClick={e => { e.stopPropagation(); saveFlag(flag) }}
                          disabled={saving === flag.id}
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded px-2 py-0.5">
                          {saving === flag.id ? '…' : 'Save'}
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); deleteFlag(flag) }}
                        disabled={deleting === flag.id}
                        className="text-xs text-gray-600 hover:text-red-400 disabled:opacity-50">
                        {deleting === flag.id ? '…' : '×'}
                      </button>
                    </div>
                  </div>

                  {/* Editable fields (expanded) */}
                  {selectedId === flag.id && (
                    <div className="space-y-2 pt-1" onClick={e => e.stopPropagation()}>
                      <input
                        value={edit.description}
                        onChange={e => setEdits(prev => ({ ...prev, [flag.id]: { ...edit, description: e.target.value } }))}
                        placeholder="What does this flag represent?"
                        className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
                      />
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={edit.is_keep}
                          onChange={e => setEdits(prev => ({ ...prev, [flag.id]: { ...edit, is_keep: e.target.checked } }))} />
                        <span className="text-xs text-gray-400">Persists across resets (_keep)</span>
                      </label>
                    </div>
                  )}

                  {/* Set-by / cleared-by */}
                  <div className="flex gap-4 text-xs">
                    {flag.set_by?.length > 0 && (
                      <div>
                        <span className="text-gray-600">Set by: </span>
                        <span className="font-mono text-green-500/70">{flag.set_by.join(', ')}</span>
                      </div>
                    )}
                    {flag.cleared_by?.length > 0 && (
                      <div>
                        <span className="text-gray-600">Cleared by: </span>
                        <span className="font-mono text-red-500/70">{flag.cleared_by.join(', ')}</span>
                      </div>
                    )}
                    {(!flag.set_by?.length && !flag.cleared_by?.length) && (
                      <span className="text-gray-700 italic">Not referenced by any card</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
