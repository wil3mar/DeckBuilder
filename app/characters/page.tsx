'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Character } from '@/lib/types'

type CharacterForm = Omit<Character, 'id'>

function emptyForm(): CharacterForm {
  return {
    slug: '',
    display_name: '',
    stage_labels: null,
    voice: '',
    motivation: '',
    dynamic: '',
    escalation: '',
    portrait_url: null,
  }
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<CharacterForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadCharacters = useCallback(() => {
    fetch('/api/characters')
      .then(r => r.json())
      .then(setCharacters)
  }, [])

  useEffect(() => { loadCharacters() }, [loadCharacters])

  function selectCharacter(char: Character) {
    setSelectedId(char.id)
    setForm({
      slug: char.slug,
      display_name: char.display_name,
      stage_labels: char.stage_labels,
      voice: char.voice,
      motivation: char.motivation,
      dynamic: char.dynamic,
      escalation: char.escalation,
      portrait_url: char.portrait_url,
    })
    setSaveError(null)
  }

  function newCharacter() {
    setSelectedId(null)
    setForm(emptyForm())
    setSaveError(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)

    const method = selectedId ? 'PUT' : 'POST'
    const url    = selectedId ? `/api/characters/${selectedId}` : '/api/characters'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setSaving(false)
    if (!res.ok) {
      const err = await res.json()
      setSaveError(err.error ?? 'Save failed')
      return
    }

    const saved: Character = await res.json()
    setSelectedId(saved.id)
    loadCharacters()
    // Invalidate Claude context cache
    fetch('/api/claude/context', { method: 'POST' }).catch(() => {})
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!confirm('Delete this character? Cards using them will lose their bearer.')) return
    setDeleting(true)
    const res = await fetch(`/api/characters/${selectedId}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) {
      const err = await res.json()
      setSaveError(err.error ?? 'Delete failed')
      return
    }
    newCharacter()
    loadCharacters()
  }

  const field = (label: string, key: keyof CharacterForm, placeholder: string, rows?: number) => (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      {rows ? (
        <textarea
          value={(form[key] as string) ?? ''}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={rows}
          placeholder={placeholder}
          className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
        />
      ) : (
        <input
          value={(form[key] as string) ?? ''}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value || (key === 'portrait_url' ? null : '') }))}
          placeholder={placeholder}
          className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
        />
      )}
    </div>
  )

  const selected = characters.find(c => c.id === selectedId)

  return (
    <div className="flex h-full overflow-hidden">

      {/* List panel */}
      <div className="w-[220px] min-w-[220px] border-r border-gray-800 flex flex-col">
        <div className="px-3 py-2 border-b border-gray-800">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Characters</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {characters.length === 0 ? (
            <p className="text-center text-xs text-gray-600 py-6">No characters yet</p>
          ) : (
            characters.map(char => (
              <button
                key={char.id}
                onClick={() => selectCharacter(char)}
                className={`w-full text-left px-3 py-2 border-b border-gray-800/50 transition-colors ${
                  selectedId === char.id ? 'bg-indigo-900/30' : 'hover:bg-gray-800/40'
                }`}
              >
                <div className="text-xs text-white font-medium truncate">{char.display_name}</div>
                <div className="text-xs text-gray-600 font-mono truncate">{char.slug}</div>
              </button>
            ))
          )}
        </div>

        <div className="p-2 border-t border-gray-800">
          <button
            onClick={newCharacter}
            className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-1 rounded hover:bg-gray-800 transition-colors"
          >
            + New character
          </button>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto p-6 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">
              {selectedId ? (selected?.display_name || 'Edit Character') : 'New Character'}
            </h2>
            <div className="flex gap-2">
              {selectedId && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50 px-2 py-1"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !form.slug.trim() || !form.display_name.trim()}
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

          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            {field('Slug', 'slug', 'the_fixer')}
            {field('Display Name', 'display_name', 'The Fixer')}
          </div>

          {/* Voice */}
          {field('Voice', 'voice', 'Clipped, efficient. Speaks in implications, never says what he means directly.', 3)}

          {/* Motivation */}
          {field('Motivation', 'motivation', 'Wants the player to succeed — it makes him look good. But loyalty has limits.', 3)}

          {/* Dynamic */}
          {field('Dynamic (relationship to player)', 'dynamic', 'Mentor-with-an-agenda. Gives useful advice that always costs something.', 3)}

          {/* Escalation */}
          {field('Escalation (how they change over time)', 'escalation', 'Becomes more demanding as the player grows more powerful. Starts calling in favors.', 3)}

          {/* Portrait URL */}
          {field('Portrait URL (optional)', 'portrait_url', 'https://…')}

          {/* Card count badge */}
          {selectedId && (
            <p className="text-xs text-gray-600">
              Changes to slug or display name are reflected immediately in card bearer dropdowns.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
