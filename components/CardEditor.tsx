'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Card, Character, Pillar, ICondition, ICommand, DeltaValue } from '@/lib/types'
import ConditionTag from './ConditionTag'
import ConditionBuilder from './ConditionBuilder'
import DeltaChip from './DeltaChip'
import ConsequenceItem from './ConsequenceItem'
import ConsequenceBuilder from './ConsequenceBuilder'

interface CardEditorProps {
  cardId: string | null
  onSaved: (cardId: string) => void
  onFormChange?: (form: CardForm) => void
  promptOverride?: string
  yesDeltaOverride?: Record<string, number>
  noDeltaOverride?: Record<string, number>
  conditionOverride?: ICondition[]
}

type CardForm = Omit<Card, 'id' | 'created_at' | 'updated_at'>

function emptyForm(): CardForm {
  return {
    character_id: null,
    slug: '',
    thematic: '',
    stage_label: null,
    weight: 5,
    cooldown: null,
    conditions: [],
    prompt: '',
    yes_label: '',
    yes_feedback: null,
    yes_deltas: {},
    yes_consequences: [],
    yes_chain_target: null,
    yes_chain_delay: 0,
    no_label: '',
    no_feedback: null,
    no_deltas: {},
    no_consequences: [],
    no_chain_target: null,
    no_chain_delay: 0,
    notes: null,
  }
}

export default function CardEditor({
  cardId,
  onSaved,
  onFormChange,
  promptOverride,
  yesDeltaOverride,
  noDeltaOverride,
  conditionOverride,
}: CardEditorProps) {
  const [form, setForm] = useState<CardForm>(emptyForm())
  const [characters, setCharacters] = useState<Character[]>([])
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [stageLabels, setStageLabels] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showCondBuilder, setShowCondBuilder] = useState(false)
  const [showYesCons, setShowYesCons] = useState(false)
  const [showNoCons, setShowNoCons] = useState(false)

  // Load reference data once
  useEffect(() => {
    Promise.all([
      fetch('/api/characters').then(r => r.json()),
      fetch('/api/pillars').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([chars, pils, settings]) => {
      setCharacters(chars ?? [])
      setPillars(pils ?? [])
      setStageLabels(settings?.stage_labels ?? [])
    })
  }, [])

  // Load card when cardId changes
  useEffect(() => {
    if (!cardId) {
      setForm(emptyForm())
      return
    }
    fetch(`/api/cards/${cardId}`)
      .then(r => r.json())
      .then(({ id, created_at, updated_at, ...rest }) => setForm(rest))
  }, [cardId])

  // Report live form state to parent (for ClaudePanel to read)
  useEffect(() => { onFormChange?.(form) }, [form, onFormChange])

  // Apply Claude result overrides
  useEffect(() => {
    if (promptOverride !== undefined) setForm(f => ({ ...f, prompt: promptOverride }))
  }, [promptOverride])

  useEffect(() => {
    if (yesDeltaOverride) setForm(f => ({ ...f, yes_deltas: { ...f.yes_deltas, ...yesDeltaOverride } }))
  }, [yesDeltaOverride])

  useEffect(() => {
    if (noDeltaOverride) setForm(f => ({ ...f, no_deltas: { ...f.no_deltas, ...noDeltaOverride } }))
  }, [noDeltaOverride])

  useEffect(() => {
    if (conditionOverride?.length) setForm(f => ({ ...f, conditions: [...f.conditions, ...conditionOverride] }))
  }, [conditionOverride])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)

    const method = cardId ? 'PUT' : 'POST'
    const url    = cardId ? `/api/cards/${cardId}` : '/api/cards'

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

    const saved = await res.json()
    // Invalidate Claude context cache — new card data changes pillar stats + flag registry
    fetch('/api/claude/context', { method: 'POST' }).catch(() => {})
    onSaved(saved.id)
  }, [cardId, form, onSaved])

  function setYesDelta(slug: string, value: DeltaValue) {
    setForm(f => ({ ...f, yes_deltas: { ...f.yes_deltas, [slug]: value } }))
  }
  function removeYesDelta(slug: string) {
    setForm(f => {
      const next = { ...f.yes_deltas }
      delete next[slug]
      return { ...f, yes_deltas: next }
    })
  }
  function setNoDelta(slug: string, value: DeltaValue) {
    setForm(f => ({ ...f, no_deltas: { ...f.no_deltas, [slug]: value } }))
  }
  function removeNoDelta(slug: string) {
    setForm(f => {
      const next = { ...f.no_deltas }
      delete next[slug]
      return { ...f, no_deltas: next }
    })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Header row ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 sticky top-0 bg-gray-950 z-10">
        <input
          value={form.slug}
          onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
          placeholder="card_slug"
          className="flex-1 bg-transparent font-mono text-sm text-white focus:outline-none placeholder-gray-600"
        />
        {stageLabels.length > 0 && (
          <select
            value={form.stage_label ?? ''}
            onChange={e => setForm(f => ({ ...f, stage_label: e.target.value || null }))}
            className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1"
          >
            <option value="">No stage</option>
            {stageLabels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !form.slug.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded font-medium"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {saveError && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-900/30 text-red-400 text-xs">
          {saveError}
        </div>
      )}

      {/* ── Character + metadata ───────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-gray-800">
        <div className="flex-1 min-w-[150px]">
          <label className="text-xs text-gray-500 block mb-1">Character</label>
          <select
            value={form.character_id ?? ''}
            onChange={e => setForm(f => ({ ...f, character_id: e.target.value || null }))}
            className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1"
          >
            <option value="">— none —</option>
            {characters.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Weight</label>
          <input
            type="number"
            value={form.weight}
            onChange={e => setForm(f => ({ ...f, weight: parseInt(e.target.value, 10) || 0 }))}
            className="w-20 bg-gray-800 text-white text-sm rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Cooldown</label>
          <input
            value={form.cooldown ?? ''}
            onChange={e => setForm(f => ({ ...f, cooldown: e.target.value || null }))}
            placeholder="3 / permanent / run"
            className="w-32 bg-gray-800 text-white text-sm rounded px-2 py-1 placeholder-gray-600"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Thematic</label>
          <input
            value={form.thematic}
            onChange={e => setForm(f => ({ ...f, thematic: e.target.value }))}
            placeholder="realestate_fixer"
            className="w-36 bg-gray-800 text-white text-sm rounded px-2 py-1 placeholder-gray-600"
          />
        </div>
      </div>

      {/* ── Conditions ──────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-gray-800">
        <label className="text-xs text-gray-500 block mb-2">Conditions</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {form.conditions.map((cond, i) => (
            <ConditionTag
              key={i}
              condition={cond}
              pillars={pillars}
              characters={characters}
              onRemove={() => setForm(f => ({
                ...f,
                conditions: f.conditions.filter((_, idx) => idx !== i),
              }))}
            />
          ))}
          {!showCondBuilder && (
            <button
              onClick={() => setShowCondBuilder(true)}
              className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 rounded px-2 py-0.5"
            >
              + add
            </button>
          )}
        </div>
        {showCondBuilder && (
          <ConditionBuilder
            pillars={pillars}
            characters={characters}
            onAdd={cond => {
              setForm(f => ({ ...f, conditions: [...f.conditions, cond] }))
              setShowCondBuilder(false)
            }}
            onCancel={() => setShowCondBuilder(false)}
          />
        )}
        <button className="text-xs text-indigo-500 hover:text-indigo-400 mt-1">
          ✦ Suggest conditions
        </button>
      </div>

      {/* ── Prompt ──────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-gray-800">
        <label className="text-xs text-gray-500 block mb-1">Prompt</label>
        <textarea
          value={form.prompt}
          onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
          rows={4}
          placeholder="The Fixer slides a folder across the table…"
          className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
        />
        <div className="flex gap-3 mt-1.5">
          <button className="text-xs text-indigo-500 hover:text-indigo-400">✦ Write prompt</button>
          <button className="text-xs text-indigo-500 hover:text-indigo-400">✦ Sharpen tone</button>
          <button className="text-xs text-indigo-500 hover:text-indigo-400">✦ Make funnier</button>
          <button className="text-xs text-indigo-500 hover:text-indigo-400">✦ Shorter</button>
        </div>
      </div>

      {/* ── Yes / No choices ────────────────────────────────── */}
      <div className="grid grid-cols-2 divide-x divide-gray-800 border-b border-gray-800">

        {/* YES */}
        <div className="px-4 py-3 space-y-2 bg-green-950/10">
          <label className="text-xs font-semibold text-green-600">YES →</label>

          <input
            value={form.yes_label}
            onChange={e => setForm(f => ({ ...f, yes_label: e.target.value }))}
            placeholder="Action label…"
            className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1 placeholder-gray-600"
          />

          {/* Deltas */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(form.yes_deltas).map(([slug, value]) => {
              const pillar = pillars.find(p => p.slug === slug)
              return (
                <DeltaChip
                  key={slug}
                  pillarSlug={slug}
                  pillarName={pillar?.display_name ?? slug}
                  color={pillar?.color ?? '#888888'}
                  value={value}
                  onChange={v => setYesDelta(slug, v)}
                  onRemove={() => removeYesDelta(slug)}
                />
              )
            })}
            <PillarAddButton
              pillars={pillars}
              existing={Object.keys(form.yes_deltas)}
              onAdd={slug => setYesDelta(slug, 0)}
            />
          </div>
          <button className="text-xs text-indigo-500 hover:text-indigo-400">✦ Suggest deltas</button>

          {/* Consequences */}
          <div className="space-y-1">
            {form.yes_consequences.map((cmd, i) => (
              <ConsequenceItem
                key={i}
                command={cmd}
                characters={characters}
                onRemove={() => setForm(f => ({
                  ...f,
                  yes_consequences: f.yes_consequences.filter((_, idx) => idx !== i),
                }))}
              />
            ))}
          </div>
          {showYesCons ? (
            <ConsequenceBuilder
              characters={characters}
              onAdd={cmd => {
                setForm(f => ({ ...f, yes_consequences: [...f.yes_consequences, cmd] }))
                setShowYesCons(false)
              }}
              onCancel={() => setShowYesCons(false)}
            />
          ) : (
            <button
              onClick={() => setShowYesCons(true)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              + add consequence
            </button>
          )}

          {/* Chain target */}
          <div className="space-y-1">
            <input
              value={form.yes_chain_target ?? ''}
              onChange={e => setForm(f => ({ ...f, yes_chain_target: e.target.value || null }))}
              placeholder="Chain target slug…"
              className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1 placeholder-gray-600"
            />
            {form.yes_chain_target && (
              <input
                type="number"
                value={form.yes_chain_delay}
                onChange={e => setForm(f => ({
                  ...f,
                  yes_chain_delay: parseInt(e.target.value, 10) || 0,
                }))}
                placeholder="Delay (cycles)"
                className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1 placeholder-gray-600"
              />
            )}
          </div>

          <input
            value={form.yes_feedback ?? ''}
            onChange={e => setForm(f => ({ ...f, yes_feedback: e.target.value || null }))}
            placeholder="Feedback text…"
            className="w-full bg-gray-800 text-gray-400 text-xs rounded px-2 py-1 placeholder-gray-600"
          />
        </div>

        {/* NO */}
        <div className="px-4 py-3 space-y-2 bg-red-950/10">
          <label className="text-xs font-semibold text-red-600">← NO</label>

          <input
            value={form.no_label}
            onChange={e => setForm(f => ({ ...f, no_label: e.target.value }))}
            placeholder="Action label…"
            className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1 placeholder-gray-600"
          />

          {/* Deltas */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(form.no_deltas).map(([slug, value]) => {
              const pillar = pillars.find(p => p.slug === slug)
              return (
                <DeltaChip
                  key={slug}
                  pillarSlug={slug}
                  pillarName={pillar?.display_name ?? slug}
                  color={pillar?.color ?? '#888888'}
                  value={value}
                  onChange={v => setNoDelta(slug, v)}
                  onRemove={() => removeNoDelta(slug)}
                />
              )
            })}
            <PillarAddButton
              pillars={pillars}
              existing={Object.keys(form.no_deltas)}
              onAdd={slug => setNoDelta(slug, 0)}
            />
          </div>
          <button className="text-xs text-indigo-500 hover:text-indigo-400">✦ Suggest deltas</button>

          {/* Consequences */}
          <div className="space-y-1">
            {form.no_consequences.map((cmd, i) => (
              <ConsequenceItem
                key={i}
                command={cmd}
                characters={characters}
                onRemove={() => setForm(f => ({
                  ...f,
                  no_consequences: f.no_consequences.filter((_, idx) => idx !== i),
                }))}
              />
            ))}
          </div>
          {showNoCons ? (
            <ConsequenceBuilder
              characters={characters}
              onAdd={cmd => {
                setForm(f => ({ ...f, no_consequences: [...f.no_consequences, cmd] }))
                setShowNoCons(false)
              }}
              onCancel={() => setShowNoCons(false)}
            />
          ) : (
            <button
              onClick={() => setShowNoCons(true)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              + add consequence
            </button>
          )}

          {/* Chain target */}
          <div className="space-y-1">
            <input
              value={form.no_chain_target ?? ''}
              onChange={e => setForm(f => ({ ...f, no_chain_target: e.target.value || null }))}
              placeholder="Chain target slug…"
              className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1 placeholder-gray-600"
            />
            {form.no_chain_target && (
              <input
                type="number"
                value={form.no_chain_delay}
                onChange={e => setForm(f => ({
                  ...f,
                  no_chain_delay: parseInt(e.target.value, 10) || 0,
                }))}
                placeholder="Delay (cycles)"
                className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1 placeholder-gray-600"
              />
            )}
          </div>

          <input
            value={form.no_feedback ?? ''}
            onChange={e => setForm(f => ({ ...f, no_feedback: e.target.value || null }))}
            placeholder="Feedback text…"
            className="w-full bg-gray-800 text-gray-400 text-xs rounded px-2 py-1 placeholder-gray-600"
          />
        </div>
      </div>

      {/* ── Notes ───────────────────────────────────────────── */}
      <div className="px-4 py-3">
        <label className="text-xs text-gray-500 block mb-1">Notes (internal, not exported)</label>
        <textarea
          value={form.notes ?? ''}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))}
          rows={2}
          className="w-full bg-gray-800 text-gray-400 text-xs rounded px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-gray-700"
        />
      </div>
    </div>
  )
}

// ── Helper: add a pillar to the delta map ────────────────────
function PillarAddButton({
  pillars,
  existing,
  onAdd,
}: {
  pillars: Pillar[]
  existing: string[]
  onAdd: (slug: string) => void
}) {
  const available = pillars.filter(p => !existing.includes(p.slug))
  if (available.length === 0) return null

  return (
    <select
      value=""
      onChange={e => { if (e.target.value) onAdd(e.target.value) }}
      className="text-xs bg-gray-800 text-gray-500 rounded px-1 py-0.5 cursor-pointer"
    >
      <option value="">+ pillar</option>
      {available.map(p => <option key={p.slug} value={p.slug}>{p.display_name}</option>)}
    </select>
  )
}
