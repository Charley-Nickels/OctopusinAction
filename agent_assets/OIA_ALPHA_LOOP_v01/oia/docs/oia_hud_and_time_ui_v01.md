# OIA HUD and Time Controls v01 Specification

## Purpose

This document defines the heads‑up display (HUD) and time control interface for the **Octopus in Action** alpha slice.  The HUD conveys essential information about the current time, active tasks and available interactions, while the time controls allow players to manage the flow of in‑game time.  The designs should be treated as functional wireframes; final art and animation will be supplied later by the Creative Director.

## HUD Layout

The HUD is composed of several panels positioned around the edges of the screen to minimise interference with the gameplay area.  All text uses a high‑contrast colour on a semi‑transparent background for readability.

### Clock Panel

* **Position**: Top‑left corner.
* **Contents**: Displays the current in‑game time (HH:MM) and an optional day counter (e.g. “Day 1”).  When paused, the time label changes colour and adds a pause icon.
* **Behaviour**: Updates in real time.  Flash or pulse when a task deadline is within 30 minutes to draw the player’s attention.

### Active Tasks Panel

* **Position**: Top‑right corner.
* **Contents**: A vertical list of up to four active tasks.  Each entry shows a short title (e.g. “Deliver Documents”), the requester’s icon (small portrait), and a deadline indicator (time or a bar).  Hovering or selecting an entry reveals a tooltip with the full description and a navigation hint.
* **Behaviour**: Entries are ordered by nearest deadline then by priority.  When a task is completed or fails, it fades out and is removed from the list.

### Mini‑Map Panel (optional)

* **Position**: Bottom‑left corner.
* **Contents**: A simplified representation of the town, with icons for the player, NPCs (when within range) and building entrances.  When the player selects a task, the relevant building blinks or is highlighted.  If the mini‑map is omitted for scope reasons, directional arrows on the ground can guide the player instead.

### Interaction Prompt Panel

* **Position**: Bottom‑centre or bottom‑right, floating slightly above the world.
* **Contents**: Contextual prompts such as “Press **E** to interact”, “Press **F** to open mailbox” or “Hold **Shift** to run”.  Use iconography (e.g. button glyphs) for controller support.
* **Behaviour**: Appears only when relevant and fades out after a short time if not acted upon.

### Message/Notification Area

* **Position**: Above the interaction prompt or just below the tasks panel.
* **Contents**: Short messages confirming actions (e.g. “Task accepted”), reward notifications (“+50 coins”) and warnings (“Postmaster is unavailable until 09:00”).
* **Behaviour**: Messages stack and fade away after a few seconds.  Use colour coding: green for success, yellow for warnings, red for failures.

## Time Controls UI

The time control bar allows players to adjust the pace of in‑game time.  It uses clearly labelled buttons or icons.  In the alpha slice, three states are supported: **Pause**, **Play** and **Fast‑Forward**.

### Control Bar Layout

* **Position**: Top‑centre or slightly below the clock panel.
* **Buttons**:
  1. **Pause (||)** – Stops time progression.  Useful for reading tasks or planning routes.  When paused, NPCs and animations freeze.
  2. **Play (▶)** – Normal time progression.  This is the default state.  If clicked when already playing, nothing changes.
  3. **Fast‑Forward (≫)** – Time flows faster (e.g. 5× normal speed).  Only available when no dialogue or cutscene is active and when the player is not inside a building where tasks are currently being performed.  Fast‑forward automatically reverts to normal speed when a task deadline is within 10 minutes or an interaction becomes available.
* **Behaviour**: Only one state is active at a time.  Pressing a button deactivates the others.  The button background indicates the current state (highlighted).  An additional **clock multiplier** indicator shows the current speed (1× or 5×).
* **Accessibility**: Ensure buttons are large enough to interact with via mouse or touchscreen.  Provide keyboard shortcuts (e.g. space for pause/play toggle, F for fast‑forward).

### Interaction with Game Systems

* **NPC Schedules** – Fast‑forwarding causes NPCs to advance through their schedules at an accelerated rate.  However, NPC pathfinding and arrival times must remain deterministic.  Pausing freezes NPCs but allows the player to open menus and plan.
* **Task Deadlines** – The UI should visually indicate when a task is approaching its deadline.  This can be done via colour changes in the task entry or subtle flashing of the clock panel.  Fast‑forward automatically slows down near deadlines to prevent accidental misses.
* **Dialogue/Interaction Lock** – While a dialogue window or cutscene is open, the time control bar is disabled and semi‑transparent.  A tooltip explains that time control is unavailable during interactions.

## Colour and Accessibility Considerations

* Use high‑contrast colour pairs for text and backgrounds.  The default palette should meet WCAG AA contrast ratios.
* Avoid relying solely on colour to convey information; combine with icons or text (e.g. deadlines use both a bar and a countdown number).
* Provide options for colour‑blind friendly modes in later iterations.
* All interactive elements should be at least 48 px tall/wide on high‑DPI displays to accommodate varied input devices.

## Wireframes

Placeholder wireframes have been created under `oia/assets/ui_hud_v01/`:

* **hud_wireframe.png** – Depicts the placement of the clock panel, tasks panel, mini‑map, interaction prompts and message area on a generic 16:9 screen.
* **time_controls_wireframe.png** – Shows the arrangement of the pause/play/fast‑forward buttons and the clock multiplier indicator.

These images are simple guides and should be replaced with refined artwork in future runs.  They align with the positions described above and provide labels to help Codex map UI elements to the underlying game logic.
