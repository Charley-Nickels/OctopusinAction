# BP_TimeManager

 Minimal Blueprint asset for ticking in-game time and tracking daily tasks while exposing debug hooks for schedule consumers.
- Store a dedicated timer handle (e.g., `TimeTickHandle`) and only create the repeating 1s real-time timer once in `BeginPlay` (or `ResumeTime`) when no handle is active so duplicate timers cannot spawn; cache in a variable for guards, and assert `IsPaused` starts false while time starts automatically on level load.
- Track `IsPaused` so `PauseTime()` clears the timer handle and sets the flag, while `ResumeTime()` restarts the 1s timer only if `IsPaused` is true and no active handle exists, then unsets the flag; buttons on `WBP_HUD_Time` call these functions directly.
- Tick logic accumulates in-game minutes (1 per timer fire), only increments `CurrentHour` when minutes roll past 59, and fires `OnHourChanged` exactly once on that hour transition; use modulo wrap 23→0 to avoid skipping hours on hiccups, and gate prints behind `DebugEnabled` (default false).
- `CurrentHour` is exposed as a readable/public variable for UI, NPC logic, and other systems; event dispatcher `OnHourChanged` broadcasts whenever the hour changes and is the only signal NPC managers listen to for work/home swaps.
- `ActiveTasks` (array of `STR_Task`) stores accepted tasks; `AddTask(STR_Task NewTask)` is BlueprintCallable so `BP_Mailbox`/`WBP_MailboxTasks` can invoke it after being handed a reference and internally uses a helper `HasTask(TaskID)` to ignore duplicate `TaskID` entries.
- `HasShownSummaryToday` boolean guards end-of-day; when `CurrentHour` reaches or passes 17, it fires `ShowDailySummary` once with a snapshot copy of `ActiveTasks`, sets the flag, and pauses further summary firing until `HasShownSummaryToday` resets on the next day.
- Expose a delegate `OnSummaryClosed`; `WBP_DailySummary` triggers it so the manager clears `ActiveTasks`, resets the summary guard, and resumes ticking for the next day without instantly re-firing the summary.
- Add an `OnNewDay` event fired when hours wrap (after 23→0) to reset day-scoped flags like `HasShownSummaryToday` and prepare consumers; resetting also clears any stale widget references to avoid duplicate bindings.

## Blueprint Comment
- Event Graph header: note that BeginPlay/ResumeTime starts a single 1-second timer handle driving minutes → hours, raising `OnHourChanged` on wrap and pausing/resuming via UI buttons; day rollover (23→0) resets `HasShownSummaryToday` and daily flags.
- ActiveTasks block: comment that `AddTask` is callable from mailbox UI, ignores duplicate TaskIDs via `HasTask`, and summary firing after >=17 uses a snapshot copy before `OnSummaryClosed` clears the array.
- DebugEnabled variable: add a short tooltip/comment “Enables debug prints for time/hour dispatch and summary triggers; off by default.”
