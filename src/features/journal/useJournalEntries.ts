import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createJournalEntry,
  deleteJournalEntry,
  listJournalEntries,
  updateJournalEntry,
  type JournalEntry,
} from '../../api/journal'
import { ApiRequestError, toUserMessage } from '../../api/client'
import {
  mapJournalValidationErrors,
  toIsoString,
  type JournalFormErrors,
  type JournalFormValues,
} from './journalForm'

export type JournalViewState = 'idle' | 'loading' | 'ready' | 'error'

interface SubmitResult {
  fieldErrors: JournalFormErrors
}

interface LastEditAttempt {
  entryId: string
  values: JournalFormValues
}

/**
 * Loads journal entry history for a selected aquarium and exposes
 * create/edit/delete mutations that reload the history on success.
 * Mirrors useMeasurementHistory's load/submit/delete state-machine shape.
 */
export function useJournalEntries(aquariumId: string | null) {
  const [viewState, setViewState] = useState<JournalViewState>('idle')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [historyError, setHistoryError] = useState('')

  const loadEntries = useCallback(
    async (signal?: AbortSignal) => {
      if (!aquariumId) {
        setEntries([])
        setViewState('idle')
        return
      }

      setViewState('loading')
      setHistoryError('')

      try {
        const result = await listJournalEntries(aquariumId, signal)
        setEntries(result)
        setViewState('ready')
      } catch (error) {
        setHistoryError(toUserMessage(error))
        setViewState('error')
      }
    },
    [aquariumId],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadEntries(controller.signal)
    return () => controller.abort()
  }, [loadEntries])

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => Date.parse(b.entryAt) - Date.parse(a.entryAt)),
    [entries],
  )

  // ─── Create ─────────────────────────────────────────────────────────────

  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [lastSubmit, setLastSubmit] = useState<JournalFormValues | null>(null)

  const submitEntry = useCallback(
    async (values: JournalFormValues): Promise<SubmitResult> => {
      if (!aquariumId) {
        setSubmitError('Select an aquarium before adding a journal entry.')
        return { fieldErrors: {} }
      }

      setSaving(true)
      setSubmitError('')
      setLastSubmit(values)

      try {
        await createJournalEntry(aquariumId, {
          message: values.message,
          ...(values.entryAtLocal ? { entryAt: toIsoString(values.entryAtLocal) } : {}),
        })
        await loadEntries()
        return { fieldErrors: {} }
      } catch (error) {
        setSubmitError(toUserMessage(error))
        const fieldErrors =
          error instanceof ApiRequestError && error.validationErrors?.length
            ? mapJournalValidationErrors(error)
            : {}
        return { fieldErrors }
      } finally {
        setSaving(false)
      }
    },
    [aquariumId, loadEntries],
  )

  const retrySubmit = useCallback(() => {
    if (lastSubmit) void submitEntry(lastSubmit)
  }, [lastSubmit, submitEntry])

  // ─── Edit ───────────────────────────────────────────────────────────────

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editFieldErrors, setEditFieldErrors] = useState<JournalFormErrors>({})
  const [lastEditAttempt, setLastEditAttempt] = useState<LastEditAttempt | null>(null)

  const beginEdit = useCallback((entryId: string) => {
    setEditingEntryId(entryId)
    setEditError('')
    setEditFieldErrors({})
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingEntryId(null)
    setEditError('')
    setEditFieldErrors({})
  }, [])

  const saveEdit = useCallback(
    async (entryId: string, values: JournalFormValues) => {
      if (!aquariumId) return

      setEditSaving(true)
      setEditError('')
      setEditFieldErrors({})
      setLastEditAttempt({ entryId, values })

      try {
        await updateJournalEntry(aquariumId, entryId, {
          message: values.message,
          ...(values.entryAtLocal ? { entryAt: toIsoString(values.entryAtLocal) } : {}),
        })
        await loadEntries()
        setEditingEntryId(null)
      } catch (error) {
        setEditError(toUserMessage(error))
        if (error instanceof ApiRequestError && error.validationErrors?.length) {
          setEditFieldErrors(mapJournalValidationErrors(error))
        }
      } finally {
        setEditSaving(false)
      }
    },
    [aquariumId, loadEntries],
  )

  const retryEdit = useCallback(() => {
    if (lastEditAttempt) void saveEdit(lastEditAttempt.entryId, lastEditAttempt.values)
  }, [lastEditAttempt, saveEdit])

  // ─── Delete ─────────────────────────────────────────────────────────────

  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [lastDeleteAttempt, setLastDeleteAttempt] = useState<string | null>(null)

  const deleteEntryById = useCallback(
    async (entryId: string) => {
      if (!aquariumId) return

      setDeletingEntryId(entryId)
      setDeleteError('')
      setLastDeleteAttempt(entryId)

      try {
        await deleteJournalEntry(aquariumId, entryId)
        await loadEntries()
      } catch (error) {
        setDeleteError(toUserMessage(error))
      } finally {
        setDeletingEntryId(null)
      }
    },
    [aquariumId, loadEntries],
  )

  const retryDelete = useCallback(() => {
    if (lastDeleteAttempt) void deleteEntryById(lastDeleteAttempt)
  }, [lastDeleteAttempt, deleteEntryById])

  return {
    viewState,
    historyError,
    retryHistory: loadEntries,
    sortedEntries,
    saving,
    submitError,
    lastSubmit,
    submitEntry,
    retrySubmit,
    editingEntryId,
    editSaving,
    editError,
    editFieldErrors,
    lastEditAttempt,
    beginEdit,
    cancelEdit,
    saveEdit,
    retryEdit,
    deletingEntryId,
    deleteError,
    lastDeleteAttempt,
    deleteEntryById,
    retryDelete,
  }
}
