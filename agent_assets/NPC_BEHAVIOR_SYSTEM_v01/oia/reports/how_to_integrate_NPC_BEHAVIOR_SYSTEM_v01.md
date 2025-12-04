# How to Integrate the OIA NPC Behaviour System (Behaviour System v01)

This guide explains how to use the JSON definitions and diagrams produced in Run 5 to implement NPC behaviours in the game.  Codex (the coding agent) should follow these steps to incorporate the behaviour tree, scheduler, movement rules and interaction rules with the NPC sprites and mailbox system.

## File Structure

```
oia/
  data/
    npc_behavior_system_v01/
      npc_behavior_tree.json
      npc_scheduler.json
      movement_rules.json
      interaction_rules.json
  assets/
    npc_behavior_system_v01/
      behavior_diagrams/
        behavior_tree.svg
        schedule_flow.svg
  reports/
    summary_NPC_BEHAVIOR_SYSTEM_v01.md
    how_to_integrate_NPC_BEHAVIOR_SYSTEM_v01.md
    notes_NPC_BEHAVIOR_SYSTEM_v01.md
```

## Behaviour Tree

1. **Parse `npc_behavior_tree.json`:**  The file defines an array of states.  Each state object contains a `name`, an `action` string describing what the NPC does in that state, and a list of `transitions` with a `condition` and a `target` state.

2. **Implement states:**  Map each `name` to a set of functions or behaviours in your engine.  For example, the `idle` state should play the idle animation and wait until a transition condition (time, player interaction) is met.

3. **Evaluate transitions:**  Regularly evaluate the conditions listed under the current state.  When a condition becomes true, transition to the corresponding `target` state.  Conditions include:
   - `scheduled_move`: it is time to move according to the scheduler.
   - `player_interaction`: the player has interacted with this NPC.
   - `work_period_over`, `social_period_over`: the relevant time block has ended.
   - `bedtime`/`wake_time`: the scheduler indicates sleep or waking periods.
   - `arrived_at_destination_and_*`: the NPC has reached the destination and the schedule indicates the next state.

4. **Determinism:**  The behaviour tree is deterministic.  There are no random branches; transitions are governed solely by time and interactions.  This makes it easier to debug and to align NPC actions with the player’s expectations.

## Scheduler

1. **Load `npc_scheduler.json`:**  Each NPC’s job (e.g. “Mayor”) maps to an ordered list of time blocks with `from`, `to` and `state` fields.  These fields use 24‑hour HH:MM format.

2. **Synchronise with game time:**  Convert real‑world times into the in‑game time system.  When the current in‑game time enters a block’s interval, set a flag such as `scheduled_move`, `work`, `social`, `idle` or `sleep`.  Use the `state` string as hints for behaviour transitions:
   - `move_to_<location>` triggers a move state and sets the destination to the specified building or home.
   - `work` triggers the work state at the NPC’s job location.
   - `social` triggers the social state.
   - `idle` triggers the idle state.
   - `sleep` triggers the sleep state.

3. **Handling overnight intervals:**  If a block’s `to` time is earlier than its `from` time (e.g. 23:00 → 07:00), treat it as spanning midnight.

## Movement Rules

1. **Speeds:**  Use the `speeds` dictionary in `movement_rules.json` to assign movement speeds.  The values are in tiles per second.  For example, NPCs may walk at the `normal` speed while moving to work and at the `slow` speed when socializing or idling.

2. **Pathfinding:**  Implement A* pathfinding using the Manhattan heuristic over the tile grid defined in the map JSON.  Use the `collision_map` to mark impassable tiles (buildings, furniture).  Prefer walkway tiles when `prefer_walkways` is true.

3. **Door transitions:**  When an NPC reaches a tile marked as a door (e.g., in the exterior or interior maps), teleport the character to the corresponding interior or exterior spawn point.

4. **Stop for interactions:**  When a player initiates conversation or another NPC interacts, pause movement and face the interaction partner until the interaction concludes.

## Interaction Rules

1. **Player interactions:**  According to `interaction_rules.json`, if the NPC is in the `idle` state when the player interacts, they should face the player, display a greeting from their dialogue starters and, if appropriate, offer tasks (e.g. via the mailbox).  If the NPC is in the `work` state, they acknowledge the player and return to work unless a task handoff occurs.

2. **Building interactions:**  On arrival and departure, NPCs perform job‑specific actions.  Use the `building_interaction` section to trigger events, such as generating tasks when the Postmaster arrives at the Post Office or logging repairs when the Maintenance Chief leaves the Utilities building.

3. **Task generation:**  The `task_generation` array lists triggers for creating new tasks in the mailbox system.  At the specified times, call into the mailbox/ticket system to create new tasks on behalf of the NPC.  Use the task types (`delivery`, `repair`, `restock`, `meeting`) and descriptions as a basis for the `mailbox_schema_v01` structure.

4. **Social interaction:**  During social periods, NPCs wander near their current location and engage in dialogues with nearby NPCs.  This can be implemented by randomly selecting other NPCs within a certain radius and triggering a brief conversation.

## Diagram Usage

* `behavior_tree.svg` visualises the state machine.  Use it as a reference when implementing the state logic.  The dashed lines represent transitions that occur under special conditions (e.g. from Work directly to Sleep when the working day ends).
* `schedule_flow.svg` illustrates a typical daily timeline with colour‑coded segments.  Use it to verify that your scheduler implementation correctly maps time intervals to behaviours.

## Integration with Existing Assets

1. **NPC Starter Pack:**  This behaviour system assumes the names defined in `npc_starter_pack_v01/npc_roster.json`.  Ensure the names in the scheduler match those used in the roster.
2. **Mailbox System:**  The task generation rules tie into the mailbox schema defined in `MAILBOX_SCHEMA_v01`.  For example, when the Postmaster’s 08:00 trigger fires, create a new `delivery` task as defined in the mailbox schema.  Use the existing fields (`task_id`, `task_type`, `requester`, `building`, etc.) to populate the task.
3. **Time Control UI:**  The time control and HUD (to be delivered in a later run) should hook into the scheduler so that speeding up, slowing down or pausing time affects NPC behaviour transitions accordingly.

## Versioning

This is version 01 of the NPC behaviour system.  Future versions may introduce randomness, personality‑dependent branching, more sophisticated schedules or additional states.  When making changes, increment the version folder name (e.g., `npc_behavior_system_v02`) and update integration scripts accordingly.