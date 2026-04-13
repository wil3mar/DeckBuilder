'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Effect, Pillar } from '@/lib/types'

type EffectForm = Omit<Effect, 'id' | 'created_at'>

function emptyForm(): EffectForm {
  return { slug: '', title: '', description: '', duration: -1, per_cycle_deltas: {} }
}

export default function EffectsPage() {
  const [effects, setEffects] = useState<Effect[]>([])
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<EffectForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/effects').then(r => r.json()),
      fetch('/api/pillars').then(r => r.json()),
    ]).then(([effs, pils]) => {
      setEffects(effs ?? [])
      setPillars(pils ?? [])
    })
  }, [])

  useEffect(() => { load() }, [load])

  function select(e: Effect) {
    setSelectedId(e.id)
    setForm({ slug: e.slug, title: e.title, description: e.description, duration: e.duration, per_cycle_deltas: { ...e.per_cycle_deltas } })
    setSaveError(null)
  }

  function newEffect() {
    setSelectedId(null)
    setForm(emptyForm())
    setSaveError(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const method = selectedId ? 'PUT' : 'POST'
    const url    = selectedId ? `/api/effects/${selectedId}` : '/api/effects'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (!res.ok) { setSaveError((await res.json()).error ?? 'Save failed'); return }
    const saved: Effect = await res.json()
    setSelectedId(saved.id)
    load()
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!confirm('Delete this effect?')) return
    setDeleting(true)
    const res = await fetch(`/api/effects/${selectedId}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) { setSaveError((await res.json()).error ?? 'Delete failed'); return }
    newEffect()
    load()
  }

  function setDelta(slug: string, raw: string) {
    const v = parseInt(raw, 10)
    setForm(f => ({ ...f, per_cycle_deltas: { ...f.per_cycle_deltas, [slug]: isNaN(v) ? 0 : v } }))
  }

  function removeDelta(slug: string) {
    setForm(f => {
      const next = { ...f.per_cycle_deltas }
      delete next[slug]
      return { ...f, per_cycle_deltas: next }
    })
  }

  const activePillarSlugs = Object.keys(form.per_cycle_deltas)
  const availablePillars = pillars.filter(p => !activePillarSlugs.includes(p.slug))
  const selected = effects.find(e => e.id === selectedId)

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="w-[220px] min-w-[220px] border-r border-gray-800 flex flex-col">
        <div className="px-3 py-2 border-b border-gray-800">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Effects</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {effects.length === 0 ? (
            <p className="text-center text-xs text-gray-600 py-6">No effects yet</p>
          ) : (
            effects.map(e => (
              <button key={e.id} onClick={() => select(e)}
                className={`w-full text-left px-3 py-2 border-b border-gray-800/50 transition-colors ${selectedId === e.id ? 'bg-indigo-900/30' : 'hover:bg-gray-800/40'}`}>
                <div className="text-xs text-white font-medium truncate">{e.title || '(untitled)'}</div>
                <div className="text-xs text-gray-600 font-mono truncate">{e.slug}</div>
              </button>
            ))
          )}
        </div>
        <div className="p-2 border-t border-gray-800">
          <button onClick={newEffect} className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-1 rounded hover:bg-gray-800 transition-colors">
            + New effect
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">
              {selectedId ? (selected?.title || 'Edit Effect') : 'New Effect'}
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
                placeholder="war_economy" className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="War Economy" className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="Shown to the player while this effect is active."
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600" />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Duration (cycles)</label>
            <input type="number" value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value, 10) || -1 }))}
              className="w-28 bg-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            <p className="text-xs text-gray-600 mt-1">-1 = indefinite (until flag cleared)</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-2">Per-Cycle Deltas</label>
            <div className="space-y-1.5">
              {activePillarSlugs.map(slug => {
                const pillar = pillars.find(p => p.slug === slug)
                return (
                  <div key={slug} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-300 w-32 truncate"
                      style={{ color: pillar?.color ?? '#888' }}>
                      {pillar?.display_name ?? slug}
                    </span>
                    <input type="number"
                      value={form.per_cycle_deltas[slug] ?? 0}
                      onChange={e => setDelta(slug, e.target.value)}
                      className="w-20 bg-gray-800 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <button onClick={() => removeDelta(slug)} className="text-gray-600 hover:text-gray-400 text-xs">×</button>
                  </div>
                )
              })}
              {availablePillars.length > 0 && (
                <select value="" onChange={e => { if (e.target.value) setForm(f => ({ ...f, per_cycle_deltas: { ...f.per_cycle_deltas, [e.target.value]: 0 } })) }}
                  className="text-xs bg-gray-800 text-gray-500 rounded px-2 py-1 cursor-pointer mt-1">
                  <option value="">+ add pillar</option>
                  {availablePillars.map(p => <option key={p.slug} value={p.slug}>{p.display_name}</option>)}
                </select>
              )}
              {pillars.length === 0 && <p className="text-xs text-gray-600">Add pillars first to set per-cycle deltas.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
