# How to Integrate the OIA Alpha Loop v01

This guide explains how Codex should incorporate the **oia_alpha_loop_v01** specifications into the game project.  It covers HUD placement, data connections, time control wiring and high‑level loop implementation.  Refer to the JSON files and diagrams produced in earlier runs for data definitions.

## 1. Set Up Documentation and Assets

1. **Import Documentation** – Place `oia/docs/oia_alpha_loop_v01.md` and `oia/docs/oia_hud_and_time_ui_v01.md` into the project documentation folder or design wiki.  Use them as reference when building the UI and gameplay logic.
2. **Load Wireframes** – Copy `oia/assets/ui_hud_v01/hud_wireframe.png` and `time_controls_wireframe.png` into your UI reference directory.  These files illustrate the intended layout; you can overlay them in the engine’s UI designer to align widgets.
3. **Ensure JSON Data Availability** – Make sure the following JSON files are accessible at runtime:
   - `oia/data/mailbox_schema_v01/sample_tasks.json` – provides tasks definitions.
   - `oia/data/mailbox_schema_v01/mailbox_schema.json` – defines the structure of tasks.
   - `oia/data/npc_behavior_system_v01/npc_scheduler.json` – provides NPC schedules.
   - `oia/data/npc_behavior_system_v01/npc_behavior_tree.json` – defines NPC behaviour states.
   - `oia/data/npc_behavior_system_v01/movement_rules.json` and `interaction_rules.json` – for AI logic.
   - `oia/data/npc_starter_pack_v01/npc_roster.json` – NPC names, jobs, homes and portrait paths.

## 2. Create HUD Widgets

Use the engine’s UI framework to create the following widgets, matching the placement shown in `hud_wireframe.png`:

1. **Clock Widget** – Display current time (HH:MM) and optionally the day number.  The widget should listen to the game’s time system and update every in‑game minute.  Change colour or animate when paused or near task deadlines.
2. **Active Tasks List** – Create a scrollable vertical list showing each accepted task’s title, requester portrait and deadline.  Bind this list to the player’s active tasks array.  When tasks are completed or expired, remove them from the list and optionally animate the removal.
3. **Mini‑Map (optional)** – If implemented, create a simplified map widget with icons for the player and destination buildings.  Bind the icons to world coordinates or tile indices.  When a task is selected, highlight the relevant building on the map.
4. **Interaction Prompt** – A context-sensitive label that appears when the player is near an interactable object (mailbox, NPC, door).  Listen to collision triggers or line‑of‑sight checks to show/hide this widget.
5. **Message Area** – A transient message panel for notifications (task accepted, reward earned).  Implement a queue to display multiple messages sequentially and fade them out.
6. **Time Control Bar** – A horizontal group of three buttons (Pause, Play, Fast‑Forward) with a speed indicator.  Bind each button to its respective function on the time system.  Highlight the active state and disable the bar during dialogues/cutscenes.  Provide keyboard shortcuts.

## 3. Connect Data Systems

1. **Mailbox System** – Implement a subsystem that loads tasks from `sample_tasks.json`, validates them against `mailbox_schema.json`, and exposes functions to retrieve available tasks based on the current in‑game time.  When the player interacts with the mailbox, call this subsystem to populate the mailbox UI.
2. **Task Management** – Maintain a list of tasks in three states: new (available), accepted (active) and completed.  Accepting a task should move it to the active list and update the HUD.  Completing a task triggers `CompleteTask(taskId)` (see `alpha_loop_skeleton.cpp`).
3. **NPC Scheduler** – Use `npc_scheduler.json` and `npc_behavior_tree.json` with the AI system to move NPCs between locations and switch their behaviour states.  Ensure that NPCs are present at the appropriate building when tasks require interaction (e.g. the Postmaster is at the Post Office during working hours).
4. **Time System** – Implement a time controller that supports pausing, playing and a higher‑speed fast‑forward.  The controller should update NPC schedules, task timers and UI elements.  Fast‑forward should automatically revert to normal speed near deadlines or interactions.

## 4. Implement the Day Loop

1. **Begin Day** – Use `BeginDay()` to spawn the player, load interiors and town map, reset tasks for a new day and display the starting HUD.  Pause time until the player’s first movement or until they dismiss the introductory message.
2. **Opening the Mailbox** – When the player interacts with the mailbox, open the mailbox UI and call `OpenMailbox()` to fetch tasks whose `posted_at` time has passed.  Accepting a task calls `AcceptTask(taskId)`.
3. **Completing Tasks** – Implement logic in `CompleteTask(taskId)` to check task criteria (e.g. visiting buildings, talking to NPCs, performing interactions).  Upon completion, update the HUD and reward the player.  Some tasks may spawn follow‑ups; use the mailbox system to queue them for the next day.
4. **Handling Deadlines** – Regularly check the current time against each active task’s deadline.  If the deadline passes, mark the task as failed and notify the player.  Consider adding visual warnings as deadlines approach.
5. **End of Day** – At 23:00, call `EndDaySummary()` to freeze time and display a summary screen.  List tasks completed, failed and unattempted, show total rewards, and provide a button to start the next day or restart the alpha loop.

## 5. Additional Considerations

* **Controller Support** – Map HUD actions and time controls to controller buttons in addition to keyboard/mouse.
* **Localization** – Store UI strings externally for future translation.
* **Audio Cues** – Consider adding subtle sounds for time control toggles, task completion and deadline warnings.
* **Testing** – Use the optional skeleton in `oia/code_skeletons/alpha_loop_v01/alpha_loop_skeleton.cpp` as a starting point for integration.  Expand the pseudocode into engine‑specific code while referencing the JSON data.

Following this guide will allow Codex to assemble a coherent one‑day loop that leverages the data and assets created across earlier runs and provides players with a clear, timed task experience.
