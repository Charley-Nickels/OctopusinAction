# BP_NPC

Minimal NPC Blueprint with schedule-driven movement plus simple recovery/debug hooks for reliable travel.

- Components: capsule for collision plus a simple mesh (static or skeletal) for visibility, and an AI controller using `AI Move To`.
- Variables: `NPCName` (Name), `CurrentSchedule` (`STR_NPCSchedule`), `CurrentTargetLocation` (Vector), and a local `PendingMoveOffsetTried` boolean to prevent infinite retries.
- `ApplySchedule(STR_NPCSchedule InSchedule)` stores the schedule, sets `CurrentTargetLocation` to `HomeLocation`, optionally spawns at that location, and prints a debug line if `DebugEnabled` was passed in.
- When `CurrentTargetLocation` is set, issues an `AI Move To` toward that point; OnSuccess clears the retry flag while OnFail retries once toward a small random XY offset around the target, then stops with a debug print if enabled.
- A lightweight idle (idle anim or small rotate timer) plays when not moving; a periodic timer checks progress toward `CurrentTargetLocation`, and if the NPC is stuck too long it prints a debug line (when allowed) and reissues one move or teleports closer for recovery.

## Blueprint Comment
- Event Graph overview: comment near ApplySchedule/BeginPlay that the NPC spawns or teleports to HomeLocation, stores the schedule, and mirrors `DebugEnabled` passed from the manager for any prints.
- Movement section: annotate the AI Move To call so OnSuccess clears retry flags and OnFail retries once with a small XY offset; note the stuck-check timer that optionally reissues a move or teleports closer when debug is on.
