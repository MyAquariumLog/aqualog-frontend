import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import type { JournalEntry } from '../api/journal'
import { EmptyState } from '../components/EmptyState'
import { useAquariumsList } from '../features/aquariums/useAquariumsList'
import { useJournalEntries } from '../features/journal/useJournalEntries'
import {
  defaultJournalFormValues,
  toLocalDateTimeInput,
  validateJournalForm,
  type JournalFormErrors,
  type JournalFormValues,
} from '../features/journal/journalForm'

export function JournalPage() {
  const {
    status: aquariumsStatus,
    aquariums,
    error: aquariumsError,
    retry: retryAquariums,
  } = useAquariumsList()
  const [selectedAquariumId, setSelectedAquariumId] = useState<string | null>(null)

  // Default to the first aquarium once the list loads, without overriding a
  // selection the user already made (e.g. by retrying after an error).
  useEffect(() => {
    if (aquariumsStatus === 'ready' && !selectedAquariumId) {
      setSelectedAquariumId(aquariums[0]?.id ?? null)
    }
  }, [aquariumsStatus, aquariums, selectedAquariumId])

  const {
    viewState,
    historyError,
    retryHistory,
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
  } = useJournalEntries(selectedAquariumId)

  const [formValues, setFormValues] = useState<JournalFormValues>(defaultJournalFormValues())
  const [formErrors, setFormErrors] = useState<JournalFormErrors>({})

  const [editValues, setEditValues] = useState<JournalFormValues>(defaultJournalFormValues())
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const aquariumOptions = aquariums.map((aquarium) => ({ value: aquarium.id, label: aquarium.name }))

  const handleFormSubmit = async () => {
    const validation = validateJournalForm(formValues)
    if (Object.keys(validation).length > 0) {
      setFormErrors(validation)
      return
    }

    setFormErrors({})
    const { fieldErrors } = await submitEntry(formValues)
    if (Object.keys(fieldErrors).length > 0) {
      setFormErrors(fieldErrors)
      return
    }
    setFormValues(defaultJournalFormValues())
  }

  const startEdit = (entry: JournalEntry) => {
    beginEdit(entry.id)
    setEditValues({ message: entry.message, entryAtLocal: toLocalDateTimeInput(entry.entryAt) })
  }

  const handleSaveEdit = (entryId: string) => {
    void saveEdit(entryId, editValues)
  }

  const requestDeleteEntry = (entryId: string, shiftKey: boolean) => {
    if (shiftKey) {
      void deleteEntryById(entryId)
      return
    }
    setPendingDeleteId(entryId)
  }

  const cancelPendingDelete = () => setPendingDeleteId(null)

  const confirmPendingDelete = () => {
    if (!pendingDeleteId) return
    const entryId = pendingDeleteId
    setPendingDeleteId(null)
    void deleteEntryById(entryId)
  }

  const aquariumsLoading = aquariumsStatus === 'loading'

  return (
    <Stack gap="lg" pb="md">
      <Stack gap={2}>
        <Title order={2}>Journal</Title>
        <Text c="dimmed" size="sm">
          Record observations, maintenance, and events for your aquariums over time.
        </Text>
      </Stack>

      {aquariumsLoading && <JournalLoadingState />}

      {!aquariumsLoading && aquariumsStatus === 'error' && (
        <Alert color="red" title="Could not load aquariums">
          <Stack gap="sm">
            <Text size="sm">{aquariumsError}</Text>
            <Group>
              <Button variant="outline" size="xs" onClick={retryAquariums}>
                Retry
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}

      {!aquariumsLoading && aquariumsStatus !== 'error' && aquariums.length === 0 && (
        <EmptyState
          title="No aquariums available"
          description="Add an aquarium in the Aquariums section before recording journal entries."
        />
      )}

      {!aquariumsLoading && aquariumsStatus !== 'error' && aquariums.length > 0 && (
        <>
          <Card withBorder>
            <Card.Section p="md">
              <Stack gap="md">
                <Select
                  label="Aquarium"
                  data={aquariumOptions}
                  value={selectedAquariumId}
                  onChange={setSelectedAquariumId}
                  allowDeselect={false}
                />

                <Textarea
                  label="Message"
                  placeholder="What's happening in the tank?"
                  value={formValues.message}
                  onChange={(event) => {
                    const message = event.currentTarget.value
                    setFormValues((current) => ({ ...current, message }))
                  }}
                  error={formErrors.message}
                  disabled={saving}
                  minRows={2}
                />

                <TextInput
                  type="datetime-local"
                  label="Entry Time (optional)"
                  description="Leave blank to use the current time"
                  value={formValues.entryAtLocal}
                  onChange={(event) => {
                    const entryAtLocal = event.currentTarget.value
                    setFormValues((current) => ({ ...current, entryAtLocal }))
                  }}
                  error={formErrors.entryAtLocal}
                  disabled={saving}
                />

                <Group justify="end">
                  <Button onClick={() => void handleFormSubmit()} loading={saving}>
                    Add Entry
                  </Button>
                </Group>

                {submitError && (
                  <Alert color="red" title="Could not save journal entry">
                    <Stack gap="sm">
                      <Text size="sm">{submitError}</Text>
                      <Group>
                        <Button variant="outline" size="xs" onClick={retrySubmit} disabled={!lastSubmit || saving}>
                          Retry Submit
                        </Button>
                      </Group>
                    </Stack>
                  </Alert>
                )}

                {deleteError && (
                  <Alert color="red" title="Could not delete journal entry">
                    <Stack gap="sm">
                      <Text size="sm">{deleteError}</Text>
                      <Group>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={retryDelete}
                          disabled={!lastDeleteAttempt || deletingEntryId !== null}
                        >
                          Retry Delete
                        </Button>
                      </Group>
                    </Stack>
                  </Alert>
                )}
              </Stack>
            </Card.Section>
          </Card>

          {viewState === 'loading' && <JournalLoadingState />}

          {viewState === 'error' && (
            <Alert color="red" title="Could not load journal history">
              <Stack gap="sm">
                <Text size="sm">{historyError}</Text>
                <Group>
                  <Button variant="outline" size="xs" onClick={() => void retryHistory()}>
                    Retry
                  </Button>
                </Group>
              </Stack>
            </Alert>
          )}

          {viewState === 'ready' && sortedEntries.length === 0 && (
            <EmptyState
              title="No journal entries yet"
              description="Add your first entry above to start a history for this aquarium."
            />
          )}

          {viewState === 'ready' && sortedEntries.length > 0 && (
            <Card withBorder>
              <Card.Section p="md" data-testid="journal-history-table">
                <Table.ScrollContainer minWidth={520}>
                  <Table verticalSpacing="xs">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Entry Time</Table.Th>
                        <Table.Th>Message</Table.Th>
                        <Table.Th ta="right">Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {sortedEntries.map((entry) => {
                        const isEditing = editingEntryId === entry.id
                        return (
                          <Table.Tr key={entry.id}>
                            {isEditing ? (
                              <>
                                <Table.Td w={220}>
                                  <TextInput
                                    type="datetime-local"
                                    aria-label="Entry Time"
                                    value={editValues.entryAtLocal}
                                    onChange={(event) => {
                                      const entryAtLocal = event.currentTarget.value
                                      setEditValues((current) => ({ ...current, entryAtLocal }))
                                    }}
                                    disabled={editSaving}
                                    error={editFieldErrors.entryAtLocal}
                                  />
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={4}>
                                    <Textarea
                                      aria-label="Message"
                                      value={editValues.message}
                                      onChange={(event) => {
                                        const message = event.currentTarget.value
                                        setEditValues((current) => ({ ...current, message }))
                                      }}
                                      disabled={editSaving}
                                      error={editFieldErrors.message}
                                      minRows={1}
                                    />
                                    {editError ? (
                                      <Group gap="xs">
                                        <Text c="red" size="xs">{editError}</Text>
                                        <Button
                                          size="xs"
                                          variant="subtle"
                                          onClick={retryEdit}
                                          disabled={!lastEditAttempt || editSaving}
                                        >
                                          Retry
                                        </Button>
                                      </Group>
                                    ) : null}
                                  </Stack>
                                </Table.Td>
                                <Table.Td ta="right">
                                  <Group justify="flex-end" gap="xs" wrap="nowrap">
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      loading={editSaving}
                                      onClick={() => handleSaveEdit(entry.id)}
                                    >
                                      Save
                                    </Button>
                                    <Button size="xs" variant="subtle" onClick={cancelEdit} disabled={editSaving}>
                                      Cancel
                                    </Button>
                                  </Group>
                                </Table.Td>
                              </>
                            ) : (
                              <>
                                <Table.Td>{formatDate(entry.entryAt)}</Table.Td>
                                <Table.Td style={{ whiteSpace: 'pre-wrap' }}>{entry.message}</Table.Td>
                                <Table.Td ta="right">
                                  <Group justify="flex-end" gap="xs" wrap="nowrap">
                                    <Button size="xs" variant="subtle" onClick={() => startEdit(entry)}>
                                      Edit
                                    </Button>
                                    <Button
                                      size="xs"
                                      color="red"
                                      variant="subtle"
                                      loading={deletingEntryId === entry.id}
                                      onClick={(event) => requestDeleteEntry(entry.id, event.shiftKey)}
                                    >
                                      Delete
                                    </Button>
                                  </Group>
                                </Table.Td>
                              </>
                            )}
                          </Table.Tr>
                        )
                      })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Card.Section>
            </Card>
          )}
        </>
      )}

      <Modal opened={pendingDeleteId !== null} onClose={cancelPendingDelete} title="Delete journal entry?" centered>
        <Stack gap="md">
          <Text size="sm">Are you sure you want to delete this journal entry? This cannot be undone.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={cancelPendingDelete}>
              Cancel
            </Button>
            <Button color="red" onClick={confirmPendingDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function JournalLoadingState() {
  return (
    <Stack gap="sm">
      <Skeleton h={42} />
      <Skeleton h={180} />
    </Stack>
  )
}
