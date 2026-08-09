import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createJournalEntry,
  deleteJournalEntry,
  listJournalEntries,
  updateJournalEntry,
} from '../../api/journal'
import { setAccessTokenProvider, setRefreshAccessTokenProvider } from '../../api/client'

vi.mock('../../config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:8000',
    oidcAuthority: 'https://auth.example.com/application/o/aqualog/',
    oidcClientId: 'frontend-test-replace-with-aqualog-spa-client-id',
    oidcRedirectUri: 'http://localhost:5173/auth/callback',
    oidcPostLogoutRedirectUri: 'http://localhost:5173',
    oidcScope: 'openid profile email',
  },
  hasOidcConfig: () => true,
  isConfigured: () => true,
  configErrors: () => [],
  loadRuntimeConfig: async () => {},
}))

beforeEach(() => {
  setAccessTokenProvider(() => 'test-token')
  setRefreshAccessTokenProvider(() => 'test-token')
})

afterEach(() => {
  vi.restoreAllMocks()
  setAccessTokenProvider(() => null)
  setRefreshAccessTokenProvider(() => null)
})

describe('journal api', () => {
  it('lists journal entries for an aquarium and maps payload fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        request_id: 'req-1',
        data: [
          {
            id: 'j-1',
            aquarium_id: 'aq-1',
            entry_at: '2026-07-19T10:00:00Z',
            message: 'Topped off with RO water',
            created_at: '2026-07-19T10:01:00Z',
            updated_at: '2026-07-19T10:01:00Z',
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(listJournalEntries('aq-1')).resolves.toEqual([
      {
        id: 'j-1',
        aquariumId: 'aq-1',
        entryAt: '2026-07-19T10:00:00Z',
        message: 'Topped off with RO water',
        createdAt: '2026-07-19T10:01:00Z',
        updatedAt: '2026-07-19T10:01:00Z',
      },
    ])

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/aquariums/aq-1/journal')
    expect(options.method).toBe('GET')
  })

  it('creates a journal entry, omitting entry_at when not provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        request_id: 'req-2',
        data: {
          id: 'j-2',
          aquarium_id: 'aq-1',
          entry_at: '2026-07-19T09:30:00Z',
          message: 'Dosed alkalinity',
          created_at: '2026-07-19T09:30:00Z',
          updated_at: '2026-07-19T09:30:00Z',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(createJournalEntry('aq-1', { message: 'Dosed alkalinity' })).resolves.toMatchObject({
      id: 'j-2',
      message: 'Dosed alkalinity',
    })

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/aquariums/aq-1/journal')
    expect(options.method).toBe('POST')
    expect(options.body).toBe(JSON.stringify({ message: 'Dosed alkalinity' }))
  })

  it('creates a journal entry including entry_at when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        request_id: 'req-3',
        data: {
          id: 'j-3',
          aquarium_id: 'aq-1',
          entry_at: '2026-07-19T09:30:00Z',
          message: 'Water change',
          created_at: '2026-07-19T09:30:00Z',
          updated_at: '2026-07-19T09:30:00Z',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await createJournalEntry('aq-1', { message: 'Water change', entryAt: '2026-07-19T09:30:00Z' })

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(options.body).toBe(
      JSON.stringify({ message: 'Water change', entry_at: '2026-07-19T09:30:00Z' }),
    )
  })

  it('updates a journal entry with only the provided fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        request_id: 'req-4',
        data: {
          id: 'j-4',
          aquarium_id: 'aq-1',
          entry_at: '2026-07-19T09:30:00Z',
          message: 'Updated message',
          created_at: '2026-07-19T09:00:00Z',
          updated_at: '2026-07-19T10:00:00Z',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(updateJournalEntry('aq-1', 'j-4', { message: 'Updated message' })).resolves.toMatchObject({
      id: 'j-4',
      message: 'Updated message',
    })

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/aquariums/aq-1/journal/j-4')
    expect(options.method).toBe('PATCH')
    expect(options.body).toBe(JSON.stringify({ message: 'Updated message' }))
  })

  it('deletes a journal entry by id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        request_id: 'req-del-1',
        data: {
          id: 'j-5',
          deleted: true,
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteJournalEntry('aq-1', 'j-5')).resolves.toBeUndefined()

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/aquariums/aq-1/journal/j-5')
    expect(options.method).toBe('DELETE')
  })

  it('does not retry create request on 422 validation error', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ detail: 'Message must not be empty' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(createJournalEntry('aq-1', { message: '' })).rejects.toMatchObject({ status: 422 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws when journal entry list response shape is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, request_id: 'req-5', data: [{ id: 'j-1' }] }),
      }),
    )

    await expect(listJournalEntries('aq-1')).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 502,
    })
  })
})
