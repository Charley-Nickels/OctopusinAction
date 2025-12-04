# OIA Phase 1 – Run 3: Mailbox Schema v01 Summary

## Overview

In this run we implemented the **mailbox system foundation** for Octopus in Action.  The mailbox is an in‑game task board where NPCs and buildings can post tasks for the player to accept and complete.  It includes a data schema, a sample task list, and a simple UI mock‑up.

## Deliverables

The following assets have been created and stored in their respective directories:

| File | Description |
|---|---|
| `oia/data/mailbox_schema_v01/mailbox_schema.json` | A JSON Schema (draft‑07) defining the structure of a mailbox task: unique ID, type, requester, associated building, priority (1–3), timestamps (`posted_at` and `deadline`), description, optional reward, and status (`new`, `accepted` or `completed`).  The schema disallows unspecified properties. |
| `oia/data/mailbox_schema_v01/sample_tasks.json` | An array of six example tasks that conform to the mailbox schema.  They cover delivery, repair, meeting, restocking and maintenance activities triggered by different buildings (City Hall, Post Office, Residential, Commercial and Utilities).  Timestamps are ISO 8601 strings.  Rewards are simple strings or `null`. |
| `oia/assets/mailbox_schema_v01/mailbox_ui_mock.png` | A wireframe mock‑up of the mailbox UI.  It depicts a simple panel with a header (“Mailbox”) and five column headers: Task, Requester, Building, Deadline and Status.  Five placeholder rows illustrate the general layout. |
| `oia/reports/summary_MAILBOX_SCHEMA_v01.md` | This summary document. |
| `oia/reports/how_to_integrate_MAILBOX_SCHEMA_v01.md` | Instructions for Codex on how to incorporate the mailbox data and UI into the game. |
| `oia/reports/notes_MAILBOX_SCHEMA_v01.md` | Documentation of assumptions made and open questions for the mailbox system. |

## Highlights

- **Extensible schema:** The JSON Schema can be validated at runtime or compile time to ensure tasks conform to the expected structure.  Required fields enforce data integrity, while an optional `reward` field allows flexibility.
- **Sample tasks:** The example tasks illustrate how various buildings and NPC roles generate different types of activities.  They include deadlines and priority levels so that the future scheduling and sorting logic can be tested.
- **UI mock‑up:** Though simple, the mock illustrates a functional layout for listing tasks.  It can be refined in Figma or replaced with a higher‑fidelity design later.

## Next Steps

After the mailbox system is reviewed, we can extend it by adding more complex reward structures, additional status values (e.g., “failed” or “expired”), attachments (e.g., items or documents), and support for recurring tasks.  The UI will need to integrate with the game state to display real tasks, allow players to accept or complete them, and update statuses accordingly.