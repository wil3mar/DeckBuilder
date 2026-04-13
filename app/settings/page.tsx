'use client'

import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [characterBible, setCharacterBible] = useState('')
  const [deckGuide, setDeckGuide] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data) {
          setCharacterBible(data.character_bible ?? '')
          setDeckGuide(data.deck_guide ?? '')
        }
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_bible: characterBible, deck_guide: deckGuide }),
    })
    // Invalidate Claude context cache so next Claude call picks up the new text
    await fetch('/api/claude/context', { method: 'POST' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="p-6 text-gray-500 text-sm">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-medium"
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">
          Character Bible
        </label>
        <p className="text-xs text-gray-600 mb-2">
          Paste your character descriptions, world-building notes, and tone guide here. Claude reads this before every suggestion.
        </p>
        <textarea
          value={characterBible}
          onChange={e => setCharacterBible(e.target.value)}
          rows={12}
          placeholder="Characters, world tone, themes, setting details…"
          className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600 font-mono"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">
          Deck Guide
        </label>
        <p className="text-xs text-gray-600 mb-2">
          Structural guidance: stage progression, thematic groups, chain patterns, balance targets. Claude uses this to suggest deltas and conditions that fit your deck's design.
        </p>
        <textarea
          value={deckGuide}
          onChange={e => setDeckGuide(e.target.value)}
          rows={10}
          placeholder="Stage progression, chain patterns, balance rules, thematic clusters…"
          className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600 font-mono"
        />
      </div>
    </div>
  )
}
