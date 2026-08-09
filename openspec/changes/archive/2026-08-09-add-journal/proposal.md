## Why

The AquaLog API now exposes authenticated `Journal` endpoints (`/aquariums/{aquarium_id}/journal`) for recording free-text notes against an aquarium, but the frontend has no UI to create, view, edit, or delete them. Aquarists need a simple, chronological place to log observations, maintenance, and events per aquarium — this change delivers a first, minimal implementation of that.

## What Changes

- Add a new top-level "Journal" page (`/journal`), mirroring the existing Measurements page's aquarium-selector + history pattern, so journal entries are reachable in one interaction alongside Dashboard/Calculator/Aquariums/Measurements.
- Add an `api/journal.ts` client module (list, create, update, delete) following the conventions in `api/measurements.ts` (snake_case↔camelCase payload mapping, response-shape guards, `apiGet`/`apiPost`/`apiPatch`/`apiDelete`).
- Add a `features/journal/` module (`useJournalEntries` hook + `journalForm` helpers) providing: load entries for a selected aquarium, create an entry (message required, optional timestamp defaulting to now), inline edit of an existing entry's message/timestamp, and delete with confirmation — following the load/submit/delete state-machine shape of `useMeasurementHistory`.
- Add a "Journal" primary navigation entry (`src/components/primaryNav.tsx`) and route (`src/App.tsx`).
- Entries are listed newest-first in the UI (client-side sort), matching the Measurements page's presentation convention, even though the API returns them chronologically ascending.

## Capabilities

### New Capabilities
- `aquarium-journal`: Frontend UI and API-client capability for creating, listing, viewing, editing, and deleting free-text journal entries scoped to a user-owned aquarium.

### Modified Capabilities
(none — the existing `portal-shell-and-navigation` "consistent primary navigation" requirement already covers adding a reachable top-level section generically; no requirement text changes)

## Impact

- **New files**: `src/api/journal.ts`, `src/features/journal/useJournalEntries.ts`, `src/features/journal/journalForm.ts`, `src/pages/JournalPage.tsx`, plus mirrored tests under `src/test/**`.
- **Modified files**: `src/App.tsx` (route + lazy import), `src/components/primaryNav.tsx` (nav item + icon).
- **Backend dependency**: consumes the existing `api-aquarium-journal` backend endpoints (`POST/GET/PATCH/DELETE /api/v1/aquariums/{aquarium_id}/journal[/{entry_id}]`); no backend changes required.
- **No breaking changes** to existing capabilities.
