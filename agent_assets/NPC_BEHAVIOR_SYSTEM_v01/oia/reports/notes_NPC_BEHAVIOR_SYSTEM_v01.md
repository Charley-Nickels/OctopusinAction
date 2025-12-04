# Notes and Assumptions – NPC Behaviour System v01

This document summarises the reasoning behind the design choices for the first version of the NPC behaviour system and highlights areas that need further consideration.

## Assumptions

1. **Deterministic state machine:**  The behaviour tree uses deterministic transitions based on schedule and interaction events.  There is no randomness in this version.  Future iterations could introduce probabilistic or personality‑driven branching.
2. **Uniform daily pattern:**  Schedules are based on general working hours (e.g. 9 AM to 5 PM) with a midday social period and a fixed sleep period (11 PM–7 AM).  Individual differences (e.g. shorter work day for the Resident) are approximated but not exact.
3. **Time resolution:**  All times are expressed in HH:MM format with minute‑level precision.  We assume the game’s time system can interpret and compare these strings directly or convert them into ticks.
4. **Movement speeds:**  Movement categories (slow, normal, fast) are defined in tiles per second.  We assume 48 px tiles; thus these speeds translate directly into pixel units for 2D movement.
5. **Pathfinding algorithm:**  A* with the Manhattan heuristic is specified.  This presumes a grid‑based map with 4‑directional movement and no diagonal walk.
6. **NPC names:**  The scheduler uses the human‑readable names from the NPC roster (e.g. “Mayor”, “Postmaster”).  Should names change, both files must be updated together.
7. **Task generation:**  Only a handful of time‑based triggers are defined.  We assume this is sufficient for the alpha slice.  The descriptions are simple and map to task types in the mailbox schema.
8. **Social interactions:**  Social periods are modelled as wandering near the current location and initiating short dialogues.  They do not yet influence relationships or generate tasks.
9. **Building interactions:**  Each building has on‑arrival and on‑leave actions that may post tasks.  We assume one building per job.  If NPCs can have multiple work locations, the system will need adjustments.
10. **Overnight schedules:**  Time blocks that cross midnight are treated as continuous intervals spanning two days.  The scheduler must handle wrapping correctly.

## Open Questions / Further Work

1. **Personalised schedules:**  Should each NPC have a unique daily routine beyond job hours?  For example, the Resident might have errands at varying times, or the Postmaster might go for lunch at a specific café.
2. **Random idling/wandering:**  Should NPCs wander randomly within a radius when idle or socializing to make the town feel more alive?  If so, the behaviour tree might need a `wander` state with randomised durations.
3. **Dynamic task generation:**  How should tasks respond to player actions?  If the player completes tasks quickly, should new tasks spawn sooner?  Dynamic triggers could be added to `task_generation`.
4. **Multiple states per time block:**  Currently, a block maps to a single state.  Realistic behaviour might involve mixing activities (e.g., working while occasionally interacting with other NPCs).  Composite states or parallel behaviours could be introduced.
5. **Error handling:**  What happens if an NPC cannot reach their destination due to a blocked path?  Should they wait, find an alternate route or teleport?  We assume pathfinding always finds a route.
6. **Performance considerations:**  Evaluating all NPC schedules and behaviour transitions each tick could be expensive.  How should updates be batched or optimized?  This is outside the scope of the current design but should be addressed during implementation.
7. **Integration with personality flags:**  The current design does not vary behaviour based on personality (e.g. a “busy” NPC might skip social periods).  Integrating personality flags into the state machine could enrich gameplay.
8. **Multi‑NPC interactions:**  Social interactions are generic.  Should specific pairs of NPCs have unique dialogues or tasks?  This would require a more complex social system.
9. **Figma diagrams:**  The diagrams were generated programmatically due to lack of Figma access.  If Figma becomes available, these diagrams could be recreated there for better integration with the AtlasForge design workflow.

## Conclusion

This first version of the NPC behaviour system lays out a clear, deterministic framework that ties schedules, movement and interactions together.  Feedback on these assumptions and open questions will guide future enhancements, leading to more nuanced and immersive NPC behaviour.