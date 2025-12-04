# WBP_HUD_Time

UMG widget specification for showing time state with improved readability.

- Displays current hour (integer 0–23) and the `CurrentPhase` string with larger, high-contrast font and padding so it sits off the screen edges; a small "Paused" label or tint appears when `IsPaused` is true on `BP_TimeManager`.
- Listens to `OnHourChanged` (and reads `IsPaused`) to refresh text bindings so hour/phase stay correct across pause/resume and day rollover, with bindings initialized once on Construct using the cached time manager reference from the level blueprint.
- Pause button calls `PauseTime()` on the manager; Play/Resume button calls `ResumeTime()` which only restarts if paused; buttons use clear labels with spacing so they do not crowd other UI or the mailbox prompt.
- Plain text/buttons only.

## Blueprint Comment
- Event Graph note: Construct caches the time manager reference provided by the level, binds once to `OnHourChanged` to refresh hour/phase text, and re-reads `IsPaused` for the small paused label.
- Button section: comment that Pause calls `PauseTime()` while Play/Resume calls `ResumeTime()` (guarded by the manager) so no duplicate timers spawn; layout padding keeps controls away from mailbox prompts.
