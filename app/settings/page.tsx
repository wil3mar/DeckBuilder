'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [characterBible, setCharacterBible] = useState('')
  const [deckGuide, setDeckGuide] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)

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

  async function handleReset() {
    setResetting(true)
    const res = await fetch('/api/game/reset', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    })
    if (res.ok) {
      router.push('/')
    } else {
      const err = await res.json()
      alert(`Reset failed: ${err.error}`)
      setResetting(false)
      setShowResetModal(false)
    }
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
          Structural guidance: stage progression, thematic groups, chain patterns, balance targets. Claude uses this to suggest deltas and conditions that fit your deck&apos;s design.
        </p>
        <textarea
          value={deckGuide}
          onChange={e => setDeckGuide(e.target.value)}
          rows={10}
          placeholder="Stage progression, chain patterns, balance rules, thematic clusters…"
          className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600 font-mono"
        />
      </div>
      {/* Danger zone */}
      <div className="border border-red-900/50 rounded-lg p-4 bg-red-950/10">
        <h2 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h2>
        <p className="text-xs text-gray-500 mb-3">
          Start over from scratch. This permanently deletes all pillars, characters, cards, effects, milestones, and flags.
        </p>
        <button
          onClick={() => setShowResetModal(true)}
          className="border border-red-700 text-red-400 hover:bg-red-900/30 text-xs px-3 py-1.5 rounded transition-colors"
        >
          Start Over
        </button>
      </div>

      {/* Confirmation modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-white font-semibold">Delete everything?</h3>
            <p className="text-sm text-gray-400">
              This will permanently delete all pillars, characters, cards, effects, milestones, and flags. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="text-sm text-gray-400 hover:text-white px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-medium"
              >
                {resetting ? 'Deleting…' : 'Delete everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
