## Context

The backend already implements `api-aquarium-journal`: authenticated CRUD at `/aquariums/{aquarium_id}/journal[/{entry_id}]`, scoped to a user-owned aquarium, with an entry shaped as `{ id, aquarium_id, entry_at, message, created_at, updated_at }`. `message` is required (1–2000 trimmed chars); `entry_at` is optional on create (server defaults to now) and always ISO-8601 with timezone. There is no frontend consumer yet.

The frontend has an established, repeated pattern for "per-aquarium resource with history + inline create/delete" in the Measurements feature (`api/measurements.ts`, `features/measurements/useMeasurementHistory.ts`, `pages/MeasurementsPage.tsx`). Journal entries are simpler than measurements (single free-text field instead of a fixed parameter catalog) but share the same shape: pick an aquarium, see a chronological list, add new entries, remove old ones. This design reuses that pattern rather than inventing a new one, and additionally supports editing (measurements don't support edit; journal entries do, per the backend's `PATCH`).

## Goals / Non-Goals

**Goals:**
- Let a user create, view, edit, and delete journal entries for an aquarium they own, from a dedicated `/journal` page.
- Follow existing conventions exactly: `apiGet`/`apiPost`/`apiPatch`/`apiDelete` from `api/client.ts`, response-envelope + payload-shape runtime guards (`isXResponse`), snake_case↔camelCase mapping at the API-module boundary, `toUserMessage`/`ApiRequestError` for error surfacing, a feature hook holding load/submit/delete state, a lazy-loaded route + nav entry.
- Keep the v1 scope minimal: no pagination controls (API returns the full set unpaginated per its spec), no rich text, no attachments, no filtering/search.

**Non-Goals:**
- No optimistic UI / offline support.
- No journal entry sharing or cross-user visibility (the API forbids this).
- No client-side pagination, search, or filtering by date range in v1.
- No changes to the Aquarium detail page; journal entries live on their own page, aquarium-scoped via a selector, matching Measurements rather than being embedded in `AquariumDetailPage`.

## Decisions

**Dedicated `/journal` page vs. embedding in `AquariumDetailPage`.**
Chose a dedicated top-level page with an aquarium `Select`, mirroring `MeasurementsPage`. Journal is a distinct, potentially long-lived history a user browses on its own (like measurements), not a one-off settings field (like thresholds, which live on the detail page). This also keeps it reachable in one nav click per the existing IA, and avoids growing `AquariumDetailPage` further.

**Feature module shape: `useJournalEntries` + `journalForm`.**
Mirrors `useMeasurementHistory` + `measurementForm`: the hook owns fetch/create/update/delete state machines (`viewState`, error/retry pairs), the form module owns pure validation/mapping helpers (local-datetime ↔ ISO conversion, client-side message length/empty checks, mapping `ApiRequestError.validationErrors` to field errors). This keeps the page component declarative, consistent with every other feature module in the codebase.

**Inline edit, not a separate edit route/modal for the message.**
Journal entries are simple (message + timestamp), so editing happens inline in the entry list (a row switches to edit mode with a `Textarea` + timestamp input, Save/Cancel), avoiding a second page or heavyweight modal. Delete keeps the existing `Modal` confirm pattern from Measurements (shift-click to skip confirmation, consistent with `MeasurementsPage`'s `requestDeleteMeasurement`).

**Client-side newest-first sort.**
The API returns entries ascending by `entry_at` (its spec explicitly commits to this order and no pagination). The UI sorts newest-first client-side before rendering, matching the "newest to oldest" convention already established for measurement history, rather than asking the backend to change order.

**Response/payload shape guards duplicated per module.**
Following `api/measurements.ts`'s existing pattern (`isJournalEntryPayload`, `isJournalEntryResponse`, `isJournalEntryListResponse` in the new `api/journal.ts`) rather than extracting a shared generic — consistent with how `measurements.ts` and `aquariums.ts` each already duplicate this shape rather than sharing it. Not introducing a new abstraction in this change.

## Risks / Trade-offs

- **[Risk]** Message length limit (2000 chars) is enforced server-side (422) and should also be checked client-side to avoid a round trip → **Mitigation**: mirror the limit as a client-side constant in `journalForm.ts` (kept in sync manually, same as other client-side validation mirrors of server limits in this codebase).
- **[Risk]** No pagination now; a heavy journal (hundreds of entries) could render slowly → **Mitigation**: explicitly out of scope per the backend spec's v1 stance; acceptable for first implementation, revisit if usage shows it's needed.
- **[Trade-off]** Dedicated page adds one more top-level nav item rather than nesting under Aquariums → accepted for discoverability and consistency with Measurements; revisit IA only if nav becomes crowded.

## Migration Plan

Additive only — new page, new nav item, new API module, no changes to existing capabilities or data. No feature flag needed; ships enabled. Rollback is a plain revert (no persisted client state, no migrations).

## Open Questions

None blocking; scope intentionally kept minimal per "first implementation" framing in the request.
