## ADDED Requirements

### Requirement: Users can reach the journal from primary navigation
The system SHALL provide a top-level "Journal" page reachable from primary navigation in at most one interaction, consistent with other top-level portal areas.

#### Scenario: Journal is reachable from navigation
- **WHEN** a user views any top-level portal page
- **THEN** the system displays a "Journal" primary navigation entry that routes to the journal page

### Requirement: Users select an aquarium to view its journal
The system SHALL let a user choose which of their aquariums' journal to view, and SHALL request that aquarium's journal entries from the API.

#### Scenario: Default aquarium selection
- **WHEN** a user opens the journal page and their aquariums have loaded
- **THEN** the system selects an aquarium by default and loads its journal entries

#### Scenario: Switching aquarium reloads entries
- **WHEN** a user selects a different aquarium from the journal page's aquarium selector
- **THEN** the system requests and displays that aquarium's journal entries in place of the previous selection

#### Scenario: No aquariums available
- **WHEN** a user opens the journal page and has no aquariums
- **THEN** the system displays guidance to add an aquarium first instead of a journal entry form or list

### Requirement: Users can add a journal entry
The system SHALL allow a user to submit a new journal entry for the selected aquarium with a required message and an optional timestamp.

#### Scenario: Successful journal entry creation
- **WHEN** a user enters a non-empty message, optionally sets a timestamp, and submits the journal entry form for the selected aquarium
- **THEN** the system sends a create request to the API and, on success, adds the entry to the displayed history and clears the form

#### Scenario: Timestamp defaults when omitted
- **WHEN** a user submits a new journal entry without setting a timestamp
- **THEN** the system omits the timestamp from the create request and displays the entry with the timestamp the API assigns

#### Scenario: Empty message is blocked client-side
- **WHEN** a user attempts to submit a journal entry with an empty or whitespace-only message
- **THEN** the system blocks submission and displays a validation message without calling the API

#### Scenario: Overlength message is blocked client-side
- **WHEN** a user attempts to submit a journal entry with a message exceeding the system's maximum allowed length
- **THEN** the system blocks submission and displays a validation message without calling the API

#### Scenario: Server-side validation errors are surfaced
- **WHEN** the API rejects a journal entry submission with a validation error
- **THEN** the system displays the API's validation feedback next to the relevant field and does not clear the form

### Requirement: Users can review journal entry history
The system SHALL retrieve and display a selected aquarium's journal entries ordered from newest to oldest.

#### Scenario: Load journal history
- **WHEN** a user opens the journal page or switches aquarium
- **THEN** the system requests journal entries from the API and renders them ordered from newest to oldest by entry timestamp

#### Scenario: Empty journal guidance
- **WHEN** the selected aquarium has no journal entries
- **THEN** the system displays an empty-state message explaining how to add the first entry

#### Scenario: Recoverable history retrieval failure
- **WHEN** the journal entry history request fails
- **THEN** the system displays an error message with a retry action that re-requests the history without a full page reload

### Requirement: Users can edit an existing journal entry
The system SHALL allow a user to update the message and/or timestamp of an existing journal entry belonging to the selected aquarium.

#### Scenario: Successful edit of message
- **WHEN** a user edits a journal entry's message and saves
- **THEN** the system sends an update request to the API and, on success, displays the updated message in the history

#### Scenario: Successful edit of timestamp
- **WHEN** a user edits a journal entry's timestamp and saves
- **THEN** the system sends an update request to the API and, on success, re-sorts and displays the entry at its updated position in the history

#### Scenario: Cancel discards edits
- **WHEN** a user cancels an in-progress edit of a journal entry
- **THEN** the system discards the unsaved changes and restores the entry's previously displayed values without calling the API

#### Scenario: Server-side validation errors are surfaced during edit
- **WHEN** the API rejects a journal entry update with a validation error
- **THEN** the system displays the API's validation feedback on the entry being edited and keeps it in edit mode

#### Scenario: Recoverable edit failure
- **WHEN** a journal entry update request fails for a reason other than validation
- **THEN** the system displays an error message with a retry action and keeps the entry in edit mode with the user's unsaved changes

### Requirement: Users can delete a journal entry
The system SHALL allow a user to delete a journal entry belonging to the selected aquarium, with confirmation before the deletion is submitted.

#### Scenario: Delete with confirmation
- **WHEN** a user requests deletion of a journal entry without a modifier key
- **THEN** the system shows a confirmation prompt and, only if confirmed, removes the selected entry through the API and refreshes the displayed history

#### Scenario: Delete skips confirmation with modifier key
- **WHEN** a user requests deletion of a journal entry while holding the shift key
- **THEN** the system removes the selected entry through the API without showing a confirmation prompt

#### Scenario: Recoverable delete failure
- **WHEN** a journal entry delete request fails
- **THEN** the system displays an error message with a retry action that re-attempts the same deletion
