import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useAgentLoop } from '@/lib/useAgentLoop'

describe('useAgentLoop', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('starts with empty state', () => {
    const { result } = renderHook(() => useAgentLoop())
    expect(result.current.messages).toEqual([])
    expect(result.current.toolProgress).toEqual([])
    expect(result.current.isRunning).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('adds user message immediately and assistant message on text reply', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ action: 'chat', reply: 'Hello back!' }),
      } as Response)

    const { result } = renderHook(() => useAgentLoop())
    await act(async () => {
      await result.current.send('Hello')
    })

    expect(result.current.messages).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hello back!' },
    ])
    expect(result.current.isRunning).toBe(false)
  })

  it('executes tool call and continues the loop', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch
      // First Claude call → tool_use
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          action: 'tool_use',
          calls: [{ id: 'tu_001', name: 'create_pillars', input: { pillars: [] } }],
          assistantContent: [{ type: 'tool_use', id: 'tu_001', name: 'create_pillars', input: { pillars: [] } }],
        }),
      } as Response)
      // Tool endpoint call
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ created: 4 }),
      } as Response)
      // Second Claude call → text
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ action: 'chat', reply: 'Game built!' }),
      } as Response)

    const { result } = renderHook(() => useAgentLoop())
    await act(async () => {
      await result.current.send('Build a game')
    })

    expect(mockFetch).toHaveBeenCalledTimes(3)
    // First call: Claude
    expect(mockFetch.mock.calls[0][0]).toBe('/api/claude')
    // Second call: tool endpoint
    expect(mockFetch.mock.calls[1][0]).toBe('/api/game/pillars')
    // Third call: Claude again with tool results
    expect(mockFetch.mock.calls[2][0]).toBe('/api/claude')

    expect(result.current.messages).toContainEqual({ role: 'assistant', content: 'Game built!' })
    expect(result.current.toolProgress).toHaveLength(1)
    expect(result.current.toolProgress[0].status).toBe('done')
    expect(result.current.toolProgress[0].detail).toBe('4 records')

    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'game:content-updated' })
    )
  })

  it('marks tool as error when endpoint fails', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          action: 'tool_use',
          calls: [{ id: 'tu_001', name: 'create_pillars', input: {} }],
          assistantContent: [{ type: 'tool_use', id: 'tu_001', name: 'create_pillars', input: {} }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'DB error' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ action: 'chat', reply: 'Had an issue.' }),
      } as Response)

    const { result } = renderHook(() => useAgentLoop())
    await act(async () => {
      await result.current.send('Build')
    })

    expect(result.current.toolProgress[0].status).toBe('error')
    expect(result.current.toolProgress[0].detail).toBe('DB error')
  })

  it('reset clears all state', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ action: 'chat', reply: 'Hi' }),
    } as Response)

    const { result } = renderHook(() => useAgentLoop())
    await act(async () => {
      await result.current.send('Hello')
    })

    act(() => { result.current.reset() })

    expect(result.current.messages).toEqual([])
    expect(result.current.toolProgress).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('reset clears anthropic history so next send starts fresh', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ action: 'chat', reply: 'Hi' }),
    } as Response)

    const { result } = renderHook(() => useAgentLoop())
    await act(async () => {
      await result.current.send('First message')
    })

    act(() => { result.current.reset() })

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ action: 'chat', reply: 'Fresh' }),
    } as Response)

    await act(async () => {
      await result.current.send('Second message')
    })

    // The second fetch to /api/claude should only contain the new message, not prior history
    const secondClaudeCall = vi.mocked(fetch).mock.calls.find(
      call => call[0] === '/api/claude' && vi.mocked(fetch).mock.calls.indexOf(call) >= 1
    )
    const body = JSON.parse(secondClaudeCall![1]!.body as string)
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0].content).toBe('Second message')
  })
})
