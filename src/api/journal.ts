import { ApiRequestError, apiDelete, apiGet, apiPatch, apiPost } from './client'

export interface JournalEntry {
  id: string
  aquariumId: string
  entryAt: string
  message: string
  createdAt: string
  updatedAt: string
}

export interface CreateJournalEntryInput {
  message: string
  entryAt?: string
}

export interface UpdateJournalEntryInput {
  message?: string
  entryAt?: string
}

interface JournalEntryPayload {
  id: string
  aquarium_id: string
  entry_at: string
  message: string
  created_at: string
  updated_at: string
}

interface JournalEntryResponse {
  success: boolean
  request_id: string
  data: JournalEntryPayload
}

interface JournalEntryListResponse {
  success: boolean
  request_id: string
  data: JournalEntryPayload[]
}

interface DeleteJournalEntryResponse {
  success: boolean
  request_id: string
  data: {
    id: string
    deleted: boolean
  }
}

export async function listJournalEntries(
  aquariumId: string,
  signal?: AbortSignal,
): Promise<JournalEntry[]> {
  const response = await apiGet<unknown>(`/api/v1/aquariums/${aquariumId}/journal`, undefined, signal)

  if (!isJournalEntryListResponse(response)) {
    throw new ApiRequestError('Received an unexpected journal entry list response shape from the API.', 502)
  }

  return response.data.map(toJournalEntry)
}

export async function createJournalEntry(
  aquariumId: string,
  input: CreateJournalEntryInput,
  signal?: AbortSignal,
): Promise<JournalEntry> {
  const response = await apiPost<unknown>(
    `/api/v1/aquariums/${aquariumId}/journal`,
    {
      message: input.message,
      ...(input.entryAt !== undefined ? { entry_at: input.entryAt } : {}),
    },
    signal,
  )

  if (!isJournalEntryResponse(response)) {
    throw new ApiRequestError('Received an unexpected journal entry response shape from the API.', 502)
  }

  return toJournalEntry(response.data)
}

export async function updateJournalEntry(
  aquariumId: string,
  entryId: string,
  input: UpdateJournalEntryInput,
  signal?: AbortSignal,
): Promise<JournalEntry> {
  const response = await apiPatch<unknown>(
    `/api/v1/aquariums/${aquariumId}/journal/${entryId}`,
    {
      ...(input.message !== undefined ? { message: input.message } : {}),
      ...(input.entryAt !== undefined ? { entry_at: input.entryAt } : {}),
    },
    signal,
  )

  if (!isJournalEntryResponse(response)) {
    throw new ApiRequestError('Received an unexpected journal entry response shape from the API.', 502)
  }

  return toJournalEntry(response.data)
}

export async function deleteJournalEntry(
  aquariumId: string,
  entryId: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await apiDelete<unknown>(`/api/v1/aquariums/${aquariumId}/journal/${entryId}`, signal)

  if (!isDeleteJournalEntryResponse(response)) {
    throw new ApiRequestError('Received an unexpected journal entry delete response shape from the API.', 502)
  }
}

function toJournalEntry(payload: JournalEntryPayload): JournalEntry {
  return {
    id: payload.id,
    aquariumId: payload.aquarium_id,
    entryAt: payload.entry_at,
    message: payload.message,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  }
}

function isJournalEntryPayload(input: unknown): input is JournalEntryPayload {
  if (typeof input !== 'object' || input === null) return false
  const obj = input as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    typeof obj.aquarium_id === 'string' &&
    typeof obj.entry_at === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  )
}

function isJournalEntryResponse(input: unknown): input is JournalEntryResponse {
  if (typeof input !== 'object' || input === null) return false
  const obj = input as Record<string, unknown>

  return (
    typeof obj.success === 'boolean' &&
    typeof obj.request_id === 'string' &&
    isJournalEntryPayload(obj.data)
  )
}

function isJournalEntryListResponse(input: unknown): input is JournalEntryListResponse {
  if (typeof input !== 'object' || input === null) return false
  const obj = input as Record<string, unknown>

  if (typeof obj.success !== 'boolean' || typeof obj.request_id !== 'string' || !Array.isArray(obj.data)) {
    return false
  }

  return obj.data.every((item) => isJournalEntryPayload(item))
}

function isDeleteJournalEntryResponse(input: unknown): input is DeleteJournalEntryResponse {
  if (typeof input !== 'object' || input === null) return false
  const obj = input as Record<string, unknown>
  if (typeof obj.success !== 'boolean' || typeof obj.request_id !== 'string') return false
  if (typeof obj.data !== 'object' || obj.data === null) return false

  const data = obj.data as Record<string, unknown>
  return typeof data.id === 'string' && typeof data.deleted === 'boolean'
}
