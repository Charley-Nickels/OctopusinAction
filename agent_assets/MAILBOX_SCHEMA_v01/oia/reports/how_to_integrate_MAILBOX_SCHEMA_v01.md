# How to Integrate the OIA Mailbox System (Mailbox Schema v01)

This guide describes how to load and work with the mailbox data and present it within your game.  It covers reading the schema and tasks, rendering the UI, and handling task state changes.

## File Overview

```
oia/
  data/
    mailbox_schema_v01/
      mailbox_schema.json   ← JSON Schema definition for a task
      sample_tasks.json      ← Example tasks conforming to the schema
  assets/
    mailbox_schema_v01/
      mailbox_ui_mock.png    ← Wireframe of the mailbox UI
  reports/
    summary_MAILBOX_SCHEMA_v01.md
    how_to_integrate_MAILBOX_SCHEMA_v01.md
    notes_MAILBOX_SCHEMA_v01.md
```

### Schema Contents

`mailbox_schema.json` is a JSON Schema (draft‑07) describing the structure of a mailbox task.  It ensures that each task has:

- `task_id` (string) – unique identifier.
- `task_type` (string) – category such as “delivery”, “repair”, “meeting”, etc.
- `requester` (string) – NPC or entity who posted the task.
- `building` (string) – associated building (“City Hall”, “Post Office”, “Residential”, etc.).
- `priority` (integer) – values 1 (high), 2 (medium) or 3 (low).
- `posted_at` and `deadline` (ISO 8601 date‑time strings) – when the task was posted and when it should be completed.
- `description` (string) – human‑readable description.
- `reward` (string | null) – optional reward text.
- `status` (string) – must be one of `new`, `accepted` or `completed`.

Additional properties are forbidden, so any extra fields will cause validation to fail.  You can validate tasks using a JSON Schema validator in your chosen programming language.

### Sample Tasks

`sample_tasks.json` provides a small set of tasks you can load for testing.  Each object in the array fully adheres to the schema.  Use this file as seed data or as examples when generating tasks dynamically.

### UI Mock

`mailbox_ui_mock.png` shows a conceptual layout for the mailbox window:

- A header labelled “Mailbox”.
- Column headings: Task, Requester, Building, Deadline and Status.
- Several placeholder rows indicating where tasks will appear.

Use this mock as a starting point.  A Figma design should eventually replace it, but the mock clarifies the general proportions and spacing.

## Integration Steps

1. **Load the schema:**  Read `mailbox_schema.json` into your game.  If your engine or toolchain supports JSON Schema validation, configure it to validate new tasks against this schema to catch data errors early.

2. **Load tasks:**  Parse `sample_tasks.json` to obtain an array of task objects.  In production you will generate tasks dynamically based on game events, NPC interactions and building states.  Ensure each task matches the schema structure before adding it to the mailbox list.

3. **UI Implementation:**
   - Use the dimensions and layout from `mailbox_ui_mock.png` to build your UI panel.  Create a container with a header and a scrollable list of rows.
   - For each task, display key fields in the corresponding columns.  You may choose to abbreviate long descriptions or show the description in a detail view when the player selects a task.
   - Add interaction controls (e.g., “Accept” button) to each row or to a detail panel.  When the player accepts a task, update its status to `accepted`.  When a task is completed, set the status to `completed` and apply the reward.

4. **Task Management:**  Maintain a list or queue of active tasks in the player’s profile.  When a task is accepted, remove it from the “new” list and add it to the active tasks list.  Update deadlines and priorities as needed.  When a task’s deadline passes without completion, you might mark it as expired or failed (these statuses are not yet part of the schema but can be added in a future iteration).

5. **Persistence:**  Decide how tasks will persist between game sessions.  You could serialize the current tasks to a save file or use a small database.  Ensure you store the latest status and any player choices.

6. **Schema Evolution:**  If you need to extend the schema (e.g., to add attachments or additional status values), update `mailbox_schema.json` accordingly and regenerate sample tasks.  Use semantic versioning for new schema files (e.g., `mailbox_schema_v02.json`) so existing data can still be processed.

## Additional Considerations

- **Localization:**  If your game will support multiple languages, consider adding a `localized_description` field or using an external localization table keyed by `task_id`.
- **Unique ID generation:**  The example tasks use simple IDs (“T001”, etc.), but in production you may want to generate UUIDs or include the posting date in the ID.
- **Reward system:**  Rewards are currently just strings.  You may expand this to structured objects containing item IDs, currency values or experience points.
- **UI styling:**  The mock uses placeholder colours.  Adapt the colours and typography to match the overall game UI and AtlasForge brand guidelines.