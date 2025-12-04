# OIA Alpha Implementation v01 Guide

## Introduction

This guide describes how to build the first fully playable single‑day loop for **Octopus in Action**.  It synthesises the specifications from the alpha loop and HUD/time UI documents with the NPC behaviour and mailbox systems.  The goal is to wire these systems together so that a player can start a day, accept and complete tasks, observe NPC schedules, and view an end‑of‑day summary.

> **Important:**  The OIA agent provides specifications and data only.  Actual implementation must be performed by the Codex team in game code (C++/Blueprint).  The instructions below assume familiarity with Unreal Engine concepts.

## 1. Time System and HUD

### In‑Game Clock

* Create a `TimeManager` component that tracks the in‑game time between **07:00** and **23:00**.  Represent time as minutes since midnight for easy arithmetic.
* Support three speeds: **Pause (0×)**, **Play (1×)** and **Fast‑Forward** (suggest 5×).  Expose functions to change speed and broadcast a `OnTimeChanged` event every minute (or tick).
* At **23:00**, emit an `OnDayEnded` event to trigger the summary screen.

### HUD Integration

* Use the layout described in `oia_hud_and_time_ui_v01.md`.  Bind the clock panel to the `TimeManager` so it displays the current time.  Change its visual state based on the current speed.
* Implement a `TaskListWidget` that binds to the player’s active tasks array.  Each entry should show the task title, requester portrait (from `npc_roster.json`), and a deadline indicator.  Sort by deadline.
* Implement a `TimeControlBar` with three buttons.  Hook each button to the corresponding `TimeManager` speed.  Disable the bar during dialogues or cutscenes.
* Use the `MessageArea` to display system messages such as task acceptance, completion and failures.

## 2. Mailbox & Tasks

### Mailbox UI

* When the player interacts with the mailbox (use a trigger component on the mailbox actor), pause time and open a `MailboxWidget`.
* Load tasks from `sample_tasks.json` via a `TaskManager` subsystem.  Filter tasks based on their `posted_at` timestamps and current time.  Only tasks with `status = "new"` and `posted_at <= current_time` should appear.
* Display each available task with its description and accept/decline buttons.  When accepted, call `AcceptTask(taskId)` (see skeleton in `alpha_loop_skeleton.cpp`).  The task moves to the active list and appears on the HUD.

### Task Objectives

* Derive objectives from `task_type`:
  - **delivery** – player talks to the requester to receive an item, travels to the destination building, and interacts with the recipient.
  - **repair/maintenance** – player travels to the Utilities building to pick up tools, goes to the affected site (defined in `interaction_rules.json`), triggers a repair animation or mini‑game, and returns to the requester.
  - **meeting** – player attends a meeting at City Hall within the time window defined by the task deadline.
  - **restock** – player helps move items inside the Commercial building.  Each interaction increments progress until complete.
* Use collision volumes or interaction components to define hotspots within interiors.  When the player interacts, check the current active task’s requirements and update progress.

## 3. NPC Schedules & Movement

* Build an `NPCController` class that references `npc_behavior_tree.json` and `npc_scheduler.json`.  On each minute tick, evaluate the current time against the schedule for that NPC’s role and update the state accordingly (move, work, social, sleep).
* Use the `TileGridManager` from the world fix spec to convert grid positions into world coordinates.  Each NPC should have a list of key locations (home, work building, social spot).  When state transitions occur, set the NPC’s target grid and pathfind using A* (per `movement_rules.json`).
* For visible movement, spawn path markers or have the NPC use Unreal’s navigation system on the top‑down map.  Update the sprite animation state (idle vs walking) accordingly.
* Ensure NPCs can generate tasks as defined in `interaction_rules.json` when the player interacts with them or at scheduled times (e.g. Postmaster posting a delivery task at 09:00).

## 4. Interaction Rules

* Use simple interaction components to handle dialogues.  When the player approaches an NPC and presses the interaction key, pause time and display a dialogue box with a stub message (e.g. “Hello! Here’s your parcel.”).  Completing the dialogue may progress a task or post a new one.
* For **delivery** tasks, the requester should hand over an item to the player (represented by a boolean flag or inventory entry).  When the player reaches the destination and interacts with the recipient, mark the objective as complete.
* For **repair/maintenance**, create an interaction hotspot at the repair site (e.g. Residential basement).  The player’s interaction triggers a short animation or timer; upon completion, mark the objective complete.
* When tasks are completed, call `CompleteTask(taskId)` to update the task status and provide the reward (coins, voucher, etc.).  Display a message and remove the task from the active list.

## 5. End‑of‑Day Summary

* Listen to the `OnDayEnded` event from the `TimeManager`.  When received, pause all NPCs and the player.
* Display a `SummaryWidget` listing all tasks that were completed, expired or still active.  Show the reward totals and optionally a reputation score placeholder.
* Provide a button to restart the day (for the alpha) or proceed to the next day when multi‑day systems are implemented.

## Extension to Multi‑Day

* Persist the player’s completed tasks, coins and reputation between days.
* At the start of a new day, increment the day counter, reload new tasks, and update NPC schedules if necessary.
* Expand the scheduler and behaviour tree to include more varied activities and random events.

## Conclusion

Implementing the above components will create a functional single‑day alpha loop that integrates the mailbox, tasks, NPC AI and HUD/time UI.  The systems remain deterministic and data‑driven, allowing designers to adjust timings and behaviours by editing the JSON files rather than code.  Codex should use this guide, together with the existing specs and JSON data, to build the first playable day of Octopus in Action.
