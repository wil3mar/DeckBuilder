'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Milestone, ICondition, Pillar, Character } from '@/lib/types'
import ConditionTag from '@/components/ConditionTag'
import ConditionBuilder from '@/components/ConditionBuilder'

type MilestoneForm = Omit<Milestone, 'id' | 'created_at'>

function emptyForm(): MilestoneForm {
  return { slug: '', title: '', description: '', conditions: [], achievement: null }
}

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<MilestoneForm>(emptyForm())
  const [showCondBuilder, setShowCondBuilder] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/milestones').then(r => r.json()),
      fetch('/api/pillars').then(r => r.json()),
      fetch('/api/characters').then(r => r.json()),
    ]).then(([ms, ps, cs]) => {
      setMilestones(ms ?? [])
      setPillars(ps ?? [])
      setCharacters(cs ?? [])
    })
  }, [])

  useEffect(() => { load() }, [load])

  function select(m: Milestone) {
    setSelectedId(m.id)
    setForm({ slug: m.slug, title: m.title, description: m.description, conditions: m.conditions, achievement: m.achievement })
    setSaveError(null)
  }

  function newMilestone() {
    setSelectedId(null)
    setForm(emptyForm())
    setSaveError(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const method = selectedId ? 'PUT' : 'POST'
    const url    = selectedId ? `/api/milestones/${selectedId}` : '/api/milestones'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (!res.ok) { setSaveError((await res.json()).error ?? 'Save failed'); return }
    const saved: Milestone = await res.json()
    setSelectedId(saved.id)
    load()
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!confirm('Delete this milestone?')) return
    setDeleting(true)
    const res = await fetch(`/api/milestones/${selectedId}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) { setSaveError((await res.json()).error ?? 'Delete failed'); return }
    newMilestone()
    load()
  }

  const selected = milestones.find(m => m.id === selectedId)

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="w-[220px] min-w-[220px] border-r border-gray-800 flex flex-col">
        <div className="px-3 py-2 border-b border-gray-800">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Milestones</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {milestones.length === 0 ? (
            <p className="text-center text-xs text-gray-600 py-6">No milestones yet</p>
          ) : (
            milestones.map(m => (
              <button key={m.id} onClick={() => select(m)}
                className={`w-full text-left px-3 py-2 border-b border-gray-800/50 transition-colors ${selectedId === m.id ? 'bg-indigo-900/30' : 'hover:bg-gray-800/40'}`}>
                <div className="text-xs text-white font-medium truncate">{m.title || '(untitled)'}</div>
                <div className="text-xs text-gray-600 font-mono truncate">{m.slug}</div>
              </button>
            ))
          )}
        </div>
        <div className="p-2 border-t border-gray-800">
          <button onClick={newMilestone} className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-1 rounded hover:bg-gray-800 transition-colors">
            + New milestone
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">
              {selectedId ? (selected?.title || 'Edit Milestone') : 'New Milestone'}
            </h2>
            <div className="flex gap-2">
              {selectedId && (
                <button onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50 px-2 py-1">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
              <button onClick={handleSave} disabled={saving || !form.slug.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded font-medium">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {saveError && (
            <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 text-red-400 text-xs rounded">{saveError}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Slug</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="first_crisis" className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="First Crisis Survived" className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="Shown to the player when this milestone unlocks."
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600" />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Unlock Conditions</label>
            <p className="text-xs text-gray-600 mb-2">All must be true at end of cycle to unlock.</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.conditions.map((cond, i) => (
                <ConditionTag key={i} condition={cond} pillars={pillars} characters={characters}
                  onRemove={() => setForm(f => ({ ...f, conditions: f.conditions.filter((_, idx) => idx !== i) }))} />
              ))}
              {!showCondBuilder && (
                <button onClick={() => setShowCondBuilder(true)}
                  className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 rounded px-2 py-0.5">
                  + add
                </button>
              )}
            </div>
            {showCondBuilder && (
              <ConditionBuilder pillars={pillars} characters={characters}
                onAdd={cond => { setForm(f => ({ ...f, conditions: [...f.conditions, cond] })); setShowCondBuilder(false) }}
                onCancel={() => setShowCondBuilder(false)} />
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Achievement text (optional)</label>
            <input value={form.achievement ?? ''}
              onChange={e => setForm(f => ({ ...f, achievement: e.target.value || null }))}
              placeholder="Unlocks new storylet pack…"
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600" />
          </div>
        </div>
      </div>
    </div>
  )
}
