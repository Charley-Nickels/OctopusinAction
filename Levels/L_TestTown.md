# L_TestTown

Minimal level layout for the alpha loop scaffold with soft ocean-tinted lighting and readable interaction affordances.

- Contains a basic ground plane, PlayerStart, directional and sky lights with a subtle blue-green tint, plus a global PostProcessVolume for light teal grading; adds a simple plaza and pathing strips between City Hall, the mailbox pad, and nearby buildings so routes feel intentional without clutter.
- Places `BP_TimeManager`, `BP_DayCycle`, and `BP_NPCManager` actors in the level; the level blueprint caches the time manager reference on `BeginPlay` via `GetAllActorsOfClass`, starts time once, and passes the ref to HUD and interactables without rebinding per frame.
- Spawns a `BP_Mailbox` near PlayerStart on a small visual pad with nearby props and a floating prompt to highlight it; a navigation mesh bounds volume covers the mailbox, plaza, and NPC home/work routes so both player and NPCs can traverse without obstruction.
- Adds simple target points or empty actors for NPC home/work locations tagged or named for each schedule row (e.g., Clerk_Home, Clerk_Work), placed in reachable spots along the paths so `BP_NPCManager` can resolve vectors when moving NPCs at start/end hours; NPCs start at home and move only once per phase change.
- Level HUD adds `WBP_HUD_Time` on begin play, binds to `OnHourChanged`, and listens for the time manager `ShowDailySummary` event to spawn `WBP_DailySummary` with the provided task snapshot; mailbox and summary widgets appear centered with a dimming overlay so they are not obscured by HUD elements or interaction prompts, and interaction prompt anchors avoid overlap.
