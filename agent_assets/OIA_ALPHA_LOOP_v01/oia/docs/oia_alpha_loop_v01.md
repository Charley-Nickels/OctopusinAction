# OIA Alpha Loop v01 Specification

## Overview

This document outlines a **one‑workday gameplay loop** for the **Octopus in Action** (OIA) alpha slice.  The loop leverages assets and data created in previous runs: the town map and interiors, mailbox schema and sample tasks, the NPC starter pack, and the deterministic behaviour/scheduler system.  It is designed to be concise yet functional, providing enough structure for Codex to implement a playable day while leaving room for iteration.

The goal of the alpha is to allow the player to experience a single day in the town, pick up tasks from the mailbox, interact with NPCs and buildings, complete tasks, and receive a summary at the end of the day.  Time is an important mechanic; the loop includes start‑of‑day and end‑of‑day sequences as well as time controls exposed via the HUD.

## Start‑of‑Day Sequence

1. **Clock and Date** – At 07:00 the day begins.  A clock on the HUD shows the current in‑game time (24‑hour format).  The date is displayed either in the clock panel or briefly in a start‑of‑day banner (e.g. “Day 1 – Monday”).
2. **Player Spawn Location** – The player character starts inside their **Residential** interior at the bottom‑centre tile.  A brief fade‑in or camera pan introduces the room.
3. **UI Elements Initialised** – The HUD elements (time, active tasks list, mini‑map if used, interaction prompts) appear in their default positions (see HUD spec).  No tasks are yet active.
4. **Guidance Prompt** – An initial message appears (e.g. “Check your mailbox outside for tasks”) to orient the player.  The time is paused until the player dismisses the prompt or moves a few tiles, giving them a moment to acclimate.
5. **Time Unpaused** – Once the player exits their home or dismisses the initial prompt, the in‑game clock starts running at the normal rate.

## Mailbox Interaction and Task Flow

1. **Approach Mailbox** – The mailbox is located outside the player’s residence (on the town map).  When the player stands adjacent and presses the interaction key (e.g. `E`), the mailbox UI opens.
2. **View Available Tasks** – The mailbox UI lists all **new** tasks whose `posted_at` timestamp is less than or equal to the current time.  Each entry shows the task title, requester, building, priority and deadline (pulled from `sample_tasks.json`).
3. **Accept Tasks** – The player can read each task’s description and accept or decline.  Accepted tasks are moved to the **Active Tasks** list on the HUD and their status changes to `accepted`.
4. **Task Guidance** – Selecting a task highlights the relevant building on the mini‑map (if implemented) and may display a navigation arrow on the ground.  For example, the **delivery** tasks (T001, T005) require the player to go to the Post Office, talk to the Postmaster, then deliver the parcel to City Hall or the Residential building.
5. **Perform Task Actions** – Tasks require simple sequences:
   - **Delivery** – Speak to the requester (e.g. Postmaster) to receive the item, walk to the destination building, interact with the recipient (e.g. Mayor), then return to the requester or the mailbox (auto‑completion at handoff).
   - **Repair/Maintenance** – Collect tools from the Utilities building or the Maintenance Chief, go to the affected site (e.g. Residential basement), interact with the repair hotspot, then return to the chief for completion.
   - **Meeting** – Walk to City Hall and trigger a meeting cutscene or dialogue at the specified time window.
   - **Restock** – Assist the Shopkeeper by moving items from storage to shelves inside the Commercial building; each completed shelf increments progress.
6. **Task Completion** – When task criteria are satisfied, the status changes to `completed`, the task disappears from the active list, and a small reward notification pops up.  Completed tasks are recorded for the end‑of‑day summary.

## Interaction with NPC Schedules and Mailbox

NPC behaviour is governed by `npc_scheduler.json`.  The mailbox posts tasks based on the **requester**’s schedule:

* **Postmaster** posts delivery tasks around **09:00** and **13:00** (matching T001 and T005).  These tasks can only be accepted once the `posted_at` time has passed.  If the player arrives before 09:00 the mailbox will display “No new mail yet.”
* **Maintenance Chief** posts repair and maintenance tasks at **10:30** and **14:45** (T002 and T006).  The Maintenance Chief is working at the Utilities building during these times, so the player will find them there.
* **Mayor** schedules a **meeting** (T003) for the morning between **08:00** and **12:00**.  If the player arrives after the deadline, the task fails and may incur a penalty (to be defined later).
* **Shopkeeper** posts the restock task (T004) at **11:15**.  Since the shop is open from 09:00–19:00, the task can be performed during the afternoon.

If the player attempts to interact with an NPC outside of their work hours, the NPC will not be available (they may be moving home, socialising or sleeping).  This encourages the player to manage their time and use the **fast‑forward** function when waiting for the appropriate hours.

## End‑of‑Day Summary

At **23:00** the in‑game clock reaches the end of the day.  The system initiates an end‑of‑day summary:

1. **Time Freeze** – The clock pauses and the player can no longer interact with the world.
2. **Summary Screen** – A panel shows a list of tasks completed, failed, or still active.  For each task, the player sees the reward received (if any).  A stub for **reputation** or **score** is displayed but does not yet affect gameplay.
3. **Follow‑Up Tasks** – Some tasks may generate follow‑ups (e.g. after delivering documents, the Mayor may ask the player to attend a follow‑up meeting the next day).  These will appear in the mailbox the next morning.
4. **Continue to Next Day** – Pressing a confirm button advances to Day 2.  In this alpha slice only Day 1 is playable; pressing the button resets the game to the beginning for testing purposes.

## MVP Acceptance Criteria (Alpha B–E Playable Day)

To consider the alpha slice complete, the following minimum criteria must be met:

1. **Start‑of‑Day Setup** – The player spawns at 07:00 in their home, with the clock and HUD visible.  Time remains paused until the player moves or dismisses the initial prompt.
2. **Mailbox System** – The player can open the mailbox, view tasks whose `posted_at` time has passed, accept or decline tasks, and see accepted tasks in the HUD.  The mailbox updates its list when new tasks become available.
3. **Task Execution** – At least one delivery (e.g. T001) and one non‑delivery task (e.g. T002 or T003) can be fully completed via interactions with NPCs and buildings.  Accepted tasks are marked completed upon finishing the required sequence.
4. **NPC Availability** – NPCs follow their schedules.  Attempting to perform a task when the requester is unavailable results in a message explaining that the NPC is not present.
5. **Time Controls and Progression** – The player can pause, resume and fast‑forward time via the HUD.  Fast‑forward is disabled when in dialogue or cutscenes.  Deadlines count down appropriately; tasks fail if not completed by their deadline.
6. **End‑of‑Day Summary** – At 23:00 a summary screen lists tasks completed, failed or incomplete, and then resets or ends the session.

Meeting these criteria will produce a coherent, end‑to‑end “alpha day” for players to test the core loop of checking mail, completing tasks, and managing time.
