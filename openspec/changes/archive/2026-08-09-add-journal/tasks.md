## 1. API client

- [x] 1.1 Add `src/api/journal.ts`: `JournalEntry` type (camelCase), `CreateJournalEntryInput`/`UpdateJournalEntryInput` types, and `listJournalEntries`, `createJournalEntry`, `updateJournalEntry`, `deleteJournalEntry` functions using `apiGet`/`apiPost`/`apiPatch`/`apiDelete` against `/api/v1/aquariums/{aquariumId}/journal[/{entryId}]`.
- [x] 1.2 Add response/payload shape guards (`isJournalEntryPayload`, `isJournalEntryResponse`, `isJournalEntryListResponse`, delete-response guard) and snake_case→camelCase mapping (`toJournalEntry`), mirroring `src/api/measurements.ts`.

## 2. Feature module

- [x] 2.1 Add `src/features/journal/journalForm.ts`: local-datetime↔ISO helpers, client-side message validation (non-empty, ≤2000 chars), and a helper mapping `ApiRequestError.validationErrors` to field errors, mirroring `measurementForm.ts`.
- [x] 2.2 Add `src/features/journal/useJournalEntries.ts`: load entries for a selected aquarium id (`viewState`: idle/loading/ready/error, retry), newest-first sort, create-entry submit state (saving/submitError/retry, clears form on success), edit-entry state (per-entry saving/error, cancel restores prior values), delete-entry state (deletingId/error/retry, confirm-required unless shift-click).

## 3. Page and navigation

- [x] 3.1 Add `src/pages/JournalPage.tsx`: aquarium selector (reuse `useAquariumsList`), create-entry form (message `Textarea` + optional datetime-local input), entries list with inline edit and delete (confirmation `Modal`, shift-click bypass), loading/error/empty states — mirroring `MeasurementsPage.tsx`'s structure.
- [x] 3.2 Register `/journal` route with a lazy import in `src/App.tsx`.
- [x] 3.3 Add a "Journal" icon and `PrimaryNavItem` entry in `src/components/primaryNav.tsx`, positioned after Measurements.

## 4. Tests

- [x] 4.1 Add `src/test/api/journal.test.ts` covering list/create/update/delete request shaping and response-shape validation (mirroring `src/test/api/measurements.test.ts` if present, else `aquariums.test.ts`).
- [x] 4.2 Add `src/test/features/journal/useJournalEntries.test.ts` (or equivalent) covering load/create/edit/delete state transitions and error/retry paths.
- [x] 4.3 Add `src/test/pages/JournalPage.test.tsx` covering: default aquarium selection, add entry, empty-state guidance, edit flow (save/cancel), delete flow (confirm modal + shift-click bypass), and error/retry rendering.

## 5. Verification

- [x] 5.1 Run `npm run build` (type-check) and `npm run lint`.
- [x] 5.2 Run `npm run test` and confirm new journal tests pass alongside the existing suite.
