# Notes and Assumptions – Mailbox Schema v01

This document outlines the assumptions made and questions raised while designing the first iteration of the mailbox system for **Octopus in Action**.

## Assumptions

1. **Data representation:**  We used [JSON Schema draft‑07](https://json-schema.org/) to formally define the task structure.  This allows programmatic validation and future evolution.
2. **Priority levels:**  Priorities range from 1 (high) to 3 (low).  This simple scale should suffice for the alpha slice.  More granularity or additional urgency flags can be added later.
3. **Status values:**  Only three statuses are defined (`new`, `accepted`, `completed`).  We assume that expired or failed tasks are either removed from the mailbox or handled by game logic outside the schema.  Additional statuses (e.g., `expired`, `failed`) could be introduced later.
4. **Time fields:**  The `posted_at` and `deadline` fields use ISO 8601 date‑time strings in UTC (`Z` suffix).  This avoids time zone confusion and aligns with typical server‑side timestamp conventions.
5. **Rewards:**  Rewards are represented as simple strings.  We assume that the reward system will be fleshed out later; for now, we do not model currency amounts or item IDs in the schema.
6. **NPC names and buildings:**  Sample tasks use placeholder NPC names (Mayor, Postmaster, Maintenance Chief, Shopkeeper) and reference the five buildings created in previous runs.  These names can change once the NPC roster is finalised.
7. **UI simplicity:**  The UI mock is a basic wireframe.  It conveys structure (columns, header, rows) but not final styling.  Figma assets were not used because Figma access was not available in the environment; the mock was generated programmatically.
8. **External dependencies:**  The mailbox system does not yet integrate with NPC dialogue or the ticket‑request flow.  We assume those connections will be handled in future runs when NPC behaviours and the time control UI are introduced.

## Open Questions

1. **Additional fields:**  Should tasks include references to items, quantities or other metadata?  For example, a delivery task may need to specify the item being delivered.
2. **Recurring or chained tasks:**  Will any tasks repeat daily/weekly, or depend on the completion of other tasks?  If so, the schema may need fields like `repeat_interval` or `dependencies`.
3. **Cancellation and failure:**  How should tasks be cancelled or marked as failed if the player declines or misses the deadline?  Adding `cancelled` or `failed` statuses could improve clarity.
4. **Dynamic NPC generation:**  As NPCs are created in a later run, how should the mailbox system link tasks to NPC schedules and dialogue?  A `requester_id` linking to an NPC database may be more robust than a string name.
5. **Localization and UI text:**  Should task descriptions and names be localized?  If so, the schema might separate localization keys from raw strings.
6. **Sorting and filtering:**  Will the UI need to support sorting tasks by priority, deadline or building?  This influences how the data is presented and whether additional computed fields are needed.

## Summary

The mailbox system defined here is intentionally minimal, providing just enough structure to post, display and manage tasks in the alpha slice.  Feedback from the Master Architect and Creative Director will guide its evolution.  Future iterations may expand the schema, refine the UI in Figma and integrate with NPC behaviours and the time control mechanics.