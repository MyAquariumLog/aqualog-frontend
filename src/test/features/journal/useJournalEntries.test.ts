import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useJournalEntries } from '../../../features/journal/useJournalEntries'
import {
  createJournalEntry,
  deleteJournalEntry,
  listJournalEntries,
  updateJournalEntry,
  type JournalEntry,
} from '../../../api/journal'
import { ApiRequestError } from '../../../api/client'

vi.mock('../../../api/journal', () => ({
  listJournalEntries: vi.fn(),
  createJournalEntry: vi.fn(),
  updateJournalEntry: vi.fn(),
  deleteJournalEntry: vi.fn(),
}))

const listJournalEntriesMock = vi.mocked(listJournalEntries)
const createJournalEntryMock = vi.mocked(createJournalEntry)
const updateJournalEntryMock = vi.mocked(updateJournalEntry)
const deleteJournalEntryMock = vi.mocked(deleteJournalEntry)

function entry(id: string, message: string, entryAt: string): JournalEntry {
  return {
    id,
    aquariumId: 'aq-1',
    entryAt,
    message,
    createdAt: entryAt,
    updatedAt: entryAt,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  listJournalEntriesMock.mockResolvedValue([
    entry('j-1', 'First entry', '2026-07-18T10:00:00Z'),
    entry('j-2', 'Second entry', '2026-07-19T10:00:00Z'),
  ])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useJournalEntries', () => {
  it('loads entries for the selected aquarium, newest first', async () => {
    const { result } = renderHook(() => useJournalEntries('aq-1'))

    await waitFor(() => expect(result.current.viewState).toBe('ready'))
    expect(listJournalEntriesMock).toHaveBeenCalledWith('aq-1', expect.anything())
    expect(result.current.sortedEntries.map((e) => e.id)).toEqual(['j-2', 'j-1'])
  })

  it('stays idle with no entries when no aquarium is selected', () => {
    const { result } = renderHook(() => useJournalEntries(null))

    expect(result.current.viewState).toBe('idle')
    expect(result.current.sortedEntries).toEqual([])
    expect(listJournalEntriesMock).not.toHaveBeenCalled()
  })

  it('surfaces a recoverable history error and retries', async () => {
    listJournalEntriesMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { result } = renderHook(() => useJournalEntries('aq-1'))

    await waitFor(() => expect(result.current.viewState).toBe('error'))
    expect(result.current.historyError).toContain('Could not reach the backend')

    await act(async () => {
      await result.current.retryHistory()
    })

    expect(result.current.viewState).toBe('ready')
  })

  it('creates an entry and reloads history, clearing on success', async () => {
    createJournalEntryMock.mockResolvedValue(entry('j-3', 'New entry', '2026-07-20T10:00:00Z'))
    const { result } = renderHook(() => useJournalEntries('aq-1'))
    await waitFor(() => expect(result.current.viewState).toBe('ready'))

    let submitResult
    await act(async () => {
      submitResult = await result.current.submitEntry({ message: 'New entry', entryAtLocal: '' })
    })

    expect(createJournalEntryMock).toHaveBeenCalledWith('aq-1', { message: 'New entry' })
    expect(submitResult).toEqual({ fieldErrors: {} })
    expect(listJournalEntriesMock).toHaveBeenCalledTimes(2)
  })

  it('maps validation errors from a failed create without clearing the form', async () => {
    createJournalEntryMock.mockRejectedValue(
      new ApiRequestError('Message must not be empty', 422, [
        { loc: ['body', 'message'], msg: 'Message must not be empty', type: 'value_error' },
      ]),
    )
    const { result } = renderHook(() => useJournalEntries('aq-1'))
    await waitFor(() => expect(result.current.viewState).toBe('ready'))

    let submitResult
    await act(async () => {
      submitResult = await result.current.submitEntry({ message: '', entryAtLocal: '' })
    })

    expect(submitResult).toEqual({ fieldErrors: { message: 'Message must not be empty' } })
    expect(result.current.submitError).toContain('Message must not be empty')
  })

  it('saves an edit, reloads history, and exits edit mode', async () => {
    updateJournalEntryMock.mockResolvedValue(entry('j-1', 'Edited entry', '2026-07-18T10:00:00Z'))
    const { result } = renderHook(() => useJournalEntries('aq-1'))
    await waitFor(() => expect(result.current.viewState).toBe('ready'))

    act(() => result.current.beginEdit('j-1'))
    expect(result.current.editingEntryId).toBe('j-1')

    await act(async () => {
      await result.current.saveEdit('j-1', { message: 'Edited entry', entryAtLocal: '2026-07-18T10:00' })
    })

    expect(updateJournalEntryMock).toHaveBeenCalledWith('aq-1', 'j-1', {
      message: 'Edited entry',
      entryAt: expect.any(String),
    })
    expect(result.current.editingEntryId).toBeNull()
  })

  it('keeps edit mode open and surfaces field errors on a failed edit', async () => {
    updateJournalEntryMock.mockRejectedValue(
      new ApiRequestError('Message must not be empty', 422, [
        { loc: ['body', 'message'], msg: 'Message must not be empty', type: 'value_error' },
      ]),
    )
    const { result } = renderHook(() => useJournalEntries('aq-1'))
    await waitFor(() => expect(result.current.viewState).toBe('ready'))

    act(() => result.current.beginEdit('j-1'))

    await act(async () => {
      await result.current.saveEdit('j-1', { message: '', entryAtLocal: '' })
    })

    expect(result.current.editingEntryId).toBe('j-1')
    expect(result.current.editFieldErrors).toEqual({ message: 'Message must not be empty' })
  })

  it('cancelEdit clears edit state without calling the API', async () => {
    const { result } = renderHook(() => useJournalEntries('aq-1'))
    await waitFor(() => expect(result.current.viewState).toBe('ready'))

    act(() => result.current.beginEdit('j-1'))
    act(() => result.current.cancelEdit())

    expect(result.current.editingEntryId).toBeNull()
    expect(updateJournalEntryMock).not.toHaveBeenCalled()
  })

  it('deletes an entry and reloads history', async () => {
    deleteJournalEntryMock.mockResolvedValue()
    const { result } = renderHook(() => useJournalEntries('aq-1'))
    await waitFor(() => expect(result.current.viewState).toBe('ready'))

    await act(async () => {
      await result.current.deleteEntryById('j-1')
    })

    expect(deleteJournalEntryMock).toHaveBeenCalledWith('aq-1', 'j-1')
    expect(listJournalEntriesMock).toHaveBeenCalledTimes(2)
  })

  it('surfaces a recoverable delete error and retries', async () => {
    deleteJournalEntryMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    deleteJournalEntryMock.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useJournalEntries('aq-1'))
    await waitFor(() => expect(result.current.viewState).toBe('ready'))

    await act(async () => {
      await result.current.deleteEntryById('j-1')
    })
    expect(result.current.deleteError).toContain('Could not reach the backend')

    await act(async () => {
      await result.current.retryDelete()
    })
    expect(result.current.deleteError).toBe('')
  })
})
