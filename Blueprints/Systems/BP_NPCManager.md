# BP_NPCManager

Simple manager Blueprint that spawns/updates NPCs from the schedule table with guarded move commands and debug toggles.

- `DebugEnabled` boolean (default false) gates on-screen prints from this manager and any NPCs it configures.
- On `BeginPlay`, loads `DT_NPCSchedules`, finds matching home/work target actors (tag/name pairs like `NPCName_Home` / `NPCName_Work`), spawns a `BP_NPC` per row at the resolved home transform, applies the schedule, and forwards `DebugEnabled` so NPCs can echo their setup; binds to `OnHourChanged` once after the time manager reference is acquired.
- Maintains per-NPC state flags such as `IsAtHome`/`IsAtWork` to prevent duplicate move orders; when `OnHourChanged` from `BP_TimeManager` matches `StartWorkHour`, only NPCs not already at work get a single `AI Move To` to Work, and similarly they head home once at `EndWorkHour` using the cached flags to avoid hourly repeats.
- Emits `PrintString` lines for schedule apply, move-to-work/home transitions, and any move failures reported by NPCs when `DebugEnabled` is true; otherwise stays silent, and silently ignores missing targets so play continues.

## Blueprint Comment
- BeginPlay section: comment that the manager loads `DT_NPCSchedules`, resolves home/work target actors, spawns NPCs at home, and copies the `DebugEnabled` flag into each.
- HourChanged binding: annotate that it binds once to `BP_TimeManager.OnHourChanged` and only issues one work/home move per NPC per phase using `IsAtHome`/`IsAtWork` guards; debug prints show applied schedules and move orders when enabled.
- DebugEnabled tooltip: “Turns on PrintString logs for schedule apply, moves, and NPC retry/stuck notices; leave false for normal play.”
