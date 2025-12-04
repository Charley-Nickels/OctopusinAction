# OIA Phase 2 – Run 5: NPC Behavior System v01 Summary

## Overview

In this run we designed a **deterministic behaviour architecture** for the NPCs introduced in the previous run.  The system consists of JSON definitions for the state machine, daily scheduler, movement rules and interaction rules, along with diagrammatic illustrations and supporting documentation.  These files will allow Codex to implement consistent, reproducible behaviours for each character.

## Deliverables

The behaviour system output is organized under `oia/data/npc_behavior_system_v01/`, `oia/assets/npc_behavior_system_v01/` and `oia/reports/`.  The key files are:

| File | Description |
|---|---|
| `npc_behavior_tree.json` | Defines a deterministic state machine with states **idle**, **move**, **work**, **social**, **sleep** and **interact**.  Each state lists an action and conditions that cause transitions to other states.  The machine starts in `idle` and uses time‑based conditions (e.g., `scheduled_move`, `bedtime`, `wake_time`) and interaction triggers. |
| `npc_scheduler.json` | Maps each NPC’s job to time blocks (HH:MM format) and high‑level states.  For example, the Mayor moves to City Hall between 07:00 and 09:00, works from 09:00 to 12:00, socializes from 12:00 to 13:00, works again from 13:00 to 17:00, moves home from 17:00 to 19:00, idles until 23:00 and sleeps until 07:00.  Similar schedules are provided for the Postmaster, Shopkeeper, Maintenance Chief and Resident. |
| `movement_rules.json` | Specifies movement behaviours, including speed categories (slow/normal/fast with tiles‑per‑second values), pathfinding preferences (A* algorithm, Manhattan heuristic), collision avoidance, preference for walkways, and door transitions.  Additional rules describe behaviour during interactions. |
| `interaction_rules.json` | Describes how NPCs interact with players, buildings and tasks.  It includes player interaction behaviours for idle and work states, building‑specific arrival/leave actions, task‑generation triggers for certain NPCs at specified times, and social interaction behaviour. |
| `behavior_diagrams/behavior_tree.svg` | An SVG diagram visualising the behaviour state machine.  It shows the core states and arrows representing transitions (e.g., Idle → Move → Work → Social → Sleep → Idle, with additional transitions to/from `Interact`). |
| `behavior_diagrams/schedule_flow.svg` | A generic timeline diagram illustrating a typical daily cycle with coloured segments for sleep, move, work, social, move and idle states.  This serves as a visual guide for interpreting the scheduler. |
| `summary_NPC_BEHAVIOR_SYSTEM_v01.md` | This document summarising the work. |
| `how_to_integrate_NPC_BEHAVIOR_SYSTEM_v01.md` | Instructions for Codex on how to implement the behaviour system. |
| `notes_NPC_BEHAVIOR_SYSTEM_v01.md` | Notes on assumptions, design decisions and open questions. |

## Highlights

- **Deterministic design:** The behaviour tree eschews random branches in favour of predictable transitions based on schedule and interaction triggers.  This makes the system easier to implement and debug in the alpha slice.
- **Time‑driven scheduler:** Each NPC’s daily routine is defined in one place.  The scheduler uses HH:MM strings to delineate time blocks; Codex can convert these into game time units and update NPC states accordingly.
- **Modular rules:** Separate JSON files handle movement and interaction behaviours, allowing Codex to reuse or override them as needed.  For example, the movement rules define speed categories and pathfinding preferences, while the interaction rules specify how tasks are generated.
- **Visual aids:** Two SVG diagrams convey the overall state machine and a sample daily schedule, helping designers and developers understand the flow at a glance.

## Next Steps

This behaviour system provides a foundation but can be expanded.  Future iterations might include more complex interaction sequences, dynamic priorities, random idling, or adaptive schedules based on player actions.  Codex should implement the current design first and then iterate as gameplay feedback becomes available.