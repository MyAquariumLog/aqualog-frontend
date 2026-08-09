import type { ApiRequestError } from '../../api/client'

// Mirrors the backend's MAX_MESSAGE_LENGTH (src/schemas/aquarium_journal_entries.py)
// so obviously-invalid input is rejected before a round trip to the API.
export const MAX_MESSAGE_LENGTH = 2000

export interface JournalFormValues {
  message: string
  entryAtLocal: string
}

export type JournalFormErrors = Partial<Record<'message' | 'entryAtLocal', string>>

export function defaultJournalFormValues(): JournalFormValues {
  return {
    message: '',
    entryAtLocal: '',
  }
}

export function validateJournalForm(values: JournalFormValues): JournalFormErrors {
  const errors: JournalFormErrors = {}
  const trimmed = values.message.trim()

  if (!trimmed) {
    errors.message = 'Enter a message for the journal entry.'
  } else if (trimmed.length > MAX_MESSAGE_LENGTH) {
    errors.message = `Message must be at most ${MAX_MESSAGE_LENGTH} characters.`
  }

  return errors
}

export function mapJournalValidationErrors(error: ApiRequestError): JournalFormErrors {
  const errors: JournalFormErrors = {}

  for (const item of error.validationErrors ?? []) {
    if (item.loc.includes('message')) {
      errors.message = item.msg
    }

    if (item.loc.includes('entry_at')) {
      errors.entryAtLocal = item.msg
    }
  }

  return errors
}

export function toIsoString(localDateTime: string): string {
  const date = new Date(localDateTime)
  if (Number.isNaN(date.getTime())) {
    return localDateTime
  }

  return date.toISOString()
}

export function toLocalDateTimeInput(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
