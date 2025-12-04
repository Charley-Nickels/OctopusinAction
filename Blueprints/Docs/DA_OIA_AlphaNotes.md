# DA_OIA_AlphaNotes

Short design note summarizing the current OIA alpha loop for in-project reference.

- **Time and Day**: `BP_TimeManager` owns the in-game clock (1s → 1 minute), dispatches `OnHourChanged`, guards a single timer with pause/resume, and resets day flags on rollover.
- **Mailbox → Tasks → Summary**: `BP_Mailbox` opens `WBP_MailboxTasks` to accept `STR_Task` rows into the manager's `ActiveTasks`; after hour >= 17, `BP_TimeManager` shows `WBP_DailySummary` with a snapshot list and clears tasks on close.
- **NPC Schedules**: `BP_NPCManager` reads `DT_NPCSchedules`, spawns `BP_NPC` actors at home markers, and reacts to `OnHourChanged` to move them between home/work targets with optional debug prints.
- **Key UI**: `WBP_HUD_Time` shows hour/phase with pause/resume hooks; mailbox and daily summary widgets sit centered with translucent backdrops so HUD remains readable.
