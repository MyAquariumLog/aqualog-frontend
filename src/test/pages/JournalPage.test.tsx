import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { Provider } from '../../components/ui/provider'
import { JournalPage } from '../../pages/JournalPage'
import { listAquariums } from '../../api/aquariums'
import {
  createJournalEntry,
  deleteJournalEntry,
  listJournalEntries,
  updateJournalEntry,
  type JournalEntry,
} from '../../api/journal'

vi.mock('../../api/aquariums', () => ({
  listAquariums: vi.fn(),
}))

vi.mock('../../api/journal', () => ({
  listJournalEntries: vi.fn(),
  createJournalEntry: vi.fn(),
  updateJournalEntry: vi.fn(),
  deleteJournalEntry: vi.fn(),
}))

function Wrapper({ children }: { children: ReactNode }) {
  return <Provider>{children}</Provider>
}

const listAquariumsMock = vi.mocked(listAquariums)
const listJournalEntriesMock = vi.mocked(listJournalEntries)
const createJournalEntryMock = vi.mocked(createJournalEntry)
const updateJournalEntryMock = vi.mocked(updateJournalEntry)
const deleteJournalEntryMock = vi.mocked(deleteJournalEntry)

function entryFixture(id: string, message: string, entryAt: string): JournalEntry {
  return {
    id,
    aquariumId: 'aq-1',
    entryAt,
    message,
    createdAt: entryAt,
    updatedAt: entryAt,
  }
}

function renderPage() {
  return render(<JournalPage />, { wrapper: Wrapper })
}

beforeEach(() => {
  vi.clearAllMocks()

  listAquariumsMock.mockResolvedValue([
    {
      id: 'aq-1',
      name: 'Living Room Reef',
      type: 'Saltwater Reef',
      volumeLiters: 280,
      createdAt: '2026-07-18T10:00:00Z',
      updatedAt: '2026-07-18T10:00:00Z',
    },
  ])

  listJournalEntriesMock.mockResolvedValue([
    entryFixture('j-1', 'Topped off with RO water', '2026-07-18T10:00:00Z'),
    entryFixture('j-2', 'Dosed alkalinity', '2026-07-19T10:00:00Z'),
  ])

  createJournalEntryMock.mockImplementation(async (_aquariumId, input) =>
    entryFixture('j-new', input.message, input.entryAt ?? '2026-07-20T10:00:00Z'),
  )

  updateJournalEntryMock.mockImplementation(async (_aquariumId, entryId, input) =>
    entryFixture(entryId, input.message ?? 'Edited', input.entryAt ?? '2026-07-19T10:00:00Z'),
  )

  deleteJournalEntryMock.mockResolvedValue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('JournalPage', () => {
  it('selects the first aquarium by default and loads its journal entries', async () => {
    renderPage()

    await screen.findByRole('heading', { name: /journal/i })

    await waitFor(() => {
      expect(listJournalEntriesMock).toHaveBeenCalledWith('aq-1', expect.anything())
    })
    expect(await screen.findByText('Dosed alkalinity')).toBeInTheDocument()
    expect(screen.getByText('Topped off with RO water')).toBeInTheDocument()
  })

  it('shows guidance instead of a form when there are no aquariums', async () => {
    listAquariumsMock.mockResolvedValueOnce([])
    renderPage()

    expect(await screen.findByText(/no aquariums available/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/message/i)).not.toBeInTheDocument()
  })

  it('shows empty-state guidance when the selected aquarium has no journal entries', async () => {
    listJournalEntriesMock.mockResolvedValueOnce([])
    renderPage()

    expect(await screen.findByText(/no journal entries yet/i)).toBeInTheDocument()
  })

  it('adds a new journal entry and refreshes the history', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Dosed alkalinity')

    await user.type(screen.getByLabelText(/^message$/i), 'Water change 20%')
    await user.click(screen.getByRole('button', { name: /add entry/i }))

    await waitFor(() => {
      expect(createJournalEntryMock).toHaveBeenCalledWith('aq-1', { message: 'Water change 20%' })
    })
    expect(listJournalEntriesMock).toHaveBeenCalledTimes(2)
  })

  it('blocks submission client-side when the message is empty', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Dosed alkalinity')
    await user.click(screen.getByRole('button', { name: /add entry/i }))

    expect(await screen.findByText(/enter a message for the journal entry/i)).toBeInTheDocument()
    expect(createJournalEntryMock).not.toHaveBeenCalled()
  })

  it('edits an entry message and saves the change', async () => {
    const user = userEvent.setup()
    renderPage()

    const table = await screen.findByTestId('journal-history-table')
    const row = within(table).getByText('Topped off with RO water').closest('tr')
    expect(row).not.toBeNull()

    await user.click(within(row as HTMLElement).getByRole('button', { name: /^edit$/i }))

    const messageInput = within(row as HTMLElement).getByLabelText(/^message$/i)
    await user.clear(messageInput)
    await user.type(messageInput, 'Topped off with RO water, tested salinity')

    await user.click(within(row as HTMLElement).getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(updateJournalEntryMock).toHaveBeenCalledWith(
        'aq-1',
        'j-1',
        expect.objectContaining({ message: 'Topped off with RO water, tested salinity' }),
      )
    })
  })

  it('cancels an in-progress edit without calling the API', async () => {
    const user = userEvent.setup()
    renderPage()

    const table = await screen.findByTestId('journal-history-table')
    const row = within(table).getByText('Topped off with RO water').closest('tr') as HTMLElement

    await user.click(within(row).getByRole('button', { name: /^edit$/i }))
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(updateJournalEntryMock).not.toHaveBeenCalled()
    expect(await screen.findByText('Topped off with RO water')).toBeInTheDocument()
  })

  it('deletes an entry after confirming, and refreshes the history', async () => {
    const user = userEvent.setup()
    renderPage()

    const table = await screen.findByTestId('journal-history-table')
    const row = within(table).getByText('Topped off with RO water').closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: /^delete$/i }))

    expect(await screen.findByRole('heading', { name: /delete journal entry\?/i })).toBeInTheDocument()
    expect(deleteJournalEntryMock).not.toHaveBeenCalled()

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(deleteJournalEntryMock).toHaveBeenCalledWith('aq-1', 'j-1')
    })
    expect(listJournalEntriesMock).toHaveBeenCalledTimes(2)
  })

  it('deletes an entry immediately without confirmation when shift-clicked', async () => {
    renderPage()

    const table = await screen.findByTestId('journal-history-table')
    const row = within(table).getByText('Topped off with RO water').closest('tr') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: /^delete$/i }), { shiftKey: true })

    await waitFor(() => {
      expect(deleteJournalEntryMock).toHaveBeenCalledWith('aq-1', 'j-1')
    })
    expect(screen.queryByRole('heading', { name: /delete journal entry\?/i })).not.toBeInTheDocument()
  })

  it('shows a recoverable history error with retry', async () => {
    const user = userEvent.setup()
    listJournalEntriesMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    renderPage()

    await screen.findByText(/could not load journal history/i)
    await user.click(screen.getByRole('button', { name: /^retry$/i }))

    expect(await screen.findByText('Dosed alkalinity')).toBeInTheDocument()
  })
})
