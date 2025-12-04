# WBP_DailySummary

Widget shown at end of day to recap accepted tasks with a dimmed backdrop for readability.

- Created when `BP_TimeManager` broadcasts `ShowDailySummary`; receives a snapshot copy of `ActiveTasks` to build a vertical list of task `Title` values and the total count so the view stays stable even if the manager array changes, and the level blueprint only spawns a single instance per day.
- Guarded by `HasShownSummaryToday` in the manager so it only appears once per day, using the passed snapshot instead of live data and not re-opening until the next day reset.
- "Close Day" button removes the widget from viewport and calls back to `BP_TimeManager` (via `OnSummaryClosed` or direct function) so the manager clears `ActiveTasks`, resets the summary guard, and readies the next day without immediately retriggering the summary; widget stays centered with a translucent overlay to keep text legible over the scene and sits away from HUD elements.

## Blueprint Comment
- Construct/Init: comment that the widget receives an array snapshot of tasks from the time manager and populates the vertical list plus total count from that snapshot.
- Close flow: annotate the button to RemoveFromParent and notify `BP_TimeManager` via `OnSummaryClosed` so tasks clear and the guard resets; anchored center overlay to avoid HUD overlap.
