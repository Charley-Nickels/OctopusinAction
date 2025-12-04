# OIA Phase 2 – Run 6: OIA Alpha Loop v01 Summary

This run defined the **alpha workday loop and HUD/time UI** for Octopus in Action.  The objective was to specify how a complete day plays out from start to finish, how tasks are delivered and completed, and how players control in‑game time.  The outputs of this run provide a clear blueprint for Codex to implement the playable loop using existing assets and data.

## Major Outputs

| File/Asset | Location | Purpose |
|---|---|---|
| `oia/docs/oia_alpha_loop_v01.md` | New documentation file | Describes the start‑of‑day sequence, mailbox interactions, task flow, NPC schedule interplay, end‑of‑day summary and MVP acceptance criteria for the alpha day. |
| `oia/docs/oia_hud_and_time_ui_v01.md` | New documentation file | Defines the HUD layout and time control interface, detailing positions of the clock panel, active tasks list, mini‑map, interaction prompts, message area and time control buttons.  Specifies behaviours, accessibility guidelines and interactions with tasks and schedules. |
| `oia/assets/ui_hud_v01/hud_wireframe.png` | New PNG asset | Wireframe illustrating the HUD layout on a 16:9 screen, showing placements for the clock, tasks list, mini‑map, messages and interaction prompts. |
| `oia/assets/ui_hud_v01/time_controls_wireframe.png` | New PNG asset | Wireframe showing a simple control bar with pause, play, fast‑forward buttons and a speed indicator. |
| `oia/code_skeletons/alpha_loop_v01/alpha_loop_skeleton.cpp` | Optional code skeleton | Provides pseudocode for functions `BeginDay`, `OpenMailbox`, `AcceptTask`, `CompleteTask` and `EndDaySummary`, offering a starting point for Codex to integrate the alpha loop into the engine. |
| `oia/reports/how_to_integrate_OIA_ALPHA_LOOP_v01.md` | Integration guide | Instructions for Codex on where to place HUD widgets, how to connect UI elements to data sources (mailbox, tasks, time system), and how to implement the one‑day loop using the JSON configurations. |
| `oia/reports/notes_OIA_ALPHA_LOOP_v01.md` | Assumptions & questions | Lists design assumptions (spawn times, panel positions, time control speeds, etc.) and raises questions for the Master Architect about additional features or possible changes. |

## Summary

The alpha loop specification describes a day beginning at 07:00 with the player emerging from their home.  They are instructed to check the mailbox, accept tasks posted by NPCs based on their schedules, and complete those tasks by interacting with NPCs and buildings across the town map.  The specification explains how tasks become available when their `posted_at` times are reached and how NPC availability is tied to the deterministic schedules defined earlier.

The HUD and time control specification places all necessary information within easy reach: a clock panel, an active tasks list, an optional mini‑map, contextual prompts and a message area.  The time control bar lets players pause, play and fast‑forward time, with rules on when each state is permissible.  Wireframes in the `ui_hud_v01` folder illustrate these layouts.

An optional code skeleton provides high‑level function definitions for the core loop.  Codex can flesh these out using the JSON data (mailbox schema, tasks, schedules, behaviour tree) and the integration instructions.

With these assets, Codex now has a clear path to assemble the playable alpha day.  Future feedback should refine the visuals, adjust timings, and expand the loop with additional interactions.