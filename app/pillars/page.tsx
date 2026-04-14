'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Pillar } from '@/lib/types'

type PillarForm = Omit<Pillar, 'id'>

function emptyForm(): PillarForm {
  return {
    slug: '',
    display_name: '',
    start_value: 50,
    floor: 0,
    ceiling: 100,
    is_killer: true,
    icon: '',
    color: '#888888',
    sort_order: 0,
  }
}

export default function PillarsPage() {
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<PillarForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadPillars = useCallback(() => {
    fetch('/api/pillars').then(r => r.json()).then(setPillars)
  }, [])

  useEffect(() => { loadPillars() }, [loadPillars])

  function selectPillar(p: Pillar) {
    setSelectedId(p.id)
    setForm({
      slug: p.slug,
      display_name: p.display_name,
      start_value: p.start_value,
      floor: p.floor,
      ceiling: p.ceiling,
      is_killer: p.is_killer,
      icon: p.icon,
      color: p.color,
      sort_order: p.sort_order,
    })
    setSaveError(null)
  }

  function newPillar() {
    setSelectedId(null)
    setForm({ ...emptyForm(), sort_order: pillars.length })
    setSaveError(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const method = selectedId ? 'PUT' : 'POST'
    const url    = selectedId ? `/api/pillars/${selectedId}` : '/api/pillars'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { setSaveError((await res.json()).error ?? 'Save failed'); return }
    const saved: Pillar = await res.json()
    setSelectedId(saved.id)
    loadPillars()
    fetch('/api/claude/context', { method: 'POST' }).catch(() => {})
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!confirm('Delete this pillar? Delta chips referencing it will become orphaned.')) return
    setDeleting(true)
    const res = await fetch(`/api/pillars/${selectedId}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) { setSaveError((await res.json()).error ?? 'Delete failed'); return }
    newPillar()
    loadPillars()
  }

  const num = (label: string, key: keyof PillarForm, min?: number, max?: number) => (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={form[key] as number}
        onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value, 10) || 0 }))}
        className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  )

  const selected = pillars.find(p => p.id === selectedId)

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="w-[220px] min-w-[220px] border-r border-gray-800 flex flex-col">
        <div className="px-3 py-2 border-b border-gray-800">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pillars</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {pillars.length === 0 ? (
            <p className="text-center text-xs text-gray-600 py-6">No pillars yet</p>
          ) : (
            pillars.map(p => (
              <button
                key={p.id}
                onClick={() => selectPillar(p)}
                className={`w-full text-left px-3 py-2 border-b border-gray-800/50 transition-colors flex items-center gap-2 ${
                  selectedId === p.id ? 'bg-indigo-900/30' : 'hover:bg-gray-800/40'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <div>
                  <div className="text-xs text-white font-medium truncate">{p.display_name}</div>
                  <div className="text-xs text-gray-600 font-mono truncate">{p.slug}</div>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="p-2 border-t border-gray-800">
          <button onClick={newPillar} className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-1 rounded hover:bg-gray-800 transition-colors">
            + New pillar
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">
              {selectedId ? (selected?.display_name || 'Edit Pillar') : 'New Pillar'}
            </h2>
            <div className="flex gap-2">
              {selectedId && (
                <button onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50 px-2 py-1">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !form.slug?.trim() || !form.display_name?.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded font-medium"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {saveError && (
            <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 text-red-400 text-xs rounded">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Slug</label>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="treasury"
                className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Display Name</label>
              <input
                value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="Treasury"
                className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {num('Start Value', 'start_value', 0, 100)}
            {num('Floor', 'floor', 0, 99)}
            {num('Ceiling', 'ceiling', 1, 100)}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {num('Sort Order', 'sort_order', 0)}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="h-9 w-12 bg-gray-800 rounded border border-gray-700 cursor-pointer"
                />
                <input
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  placeholder="#888888"
                  className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Icon slug</label>
              <input
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="coin"
                className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_killer}
                onChange={e => setForm(f => ({ ...f, is_killer: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-white">Killer pillar</span>
            </label>
            <p className="text-xs text-gray-600 mt-0.5 ml-5">
              Breaching floor or ceiling ends the run.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
