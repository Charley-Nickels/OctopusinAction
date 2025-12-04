# Notes and Assumptions – OIA Alpha Loop v01

This document records the assumptions, design decisions and open questions arising during the creation of the alpha loop and HUD/time UI specifications.  Reviewing these notes will help guide future iterations and inform discussion with the Master Architect and Creative Director.

## Assumptions

1. **Single Day Scope** – The alpha slice covers one workday from 07:00 to 23:00.  It does not implement persistence across multiple days, though follow‑up tasks can be queued for the next day.
2. **Deterministic NPC Schedules** – NPC availability strictly follows the schedule in `npc_scheduler.json`.  No random deviations or emergent behaviour are considered in this version.
3. **Mailbox Posting Times** – Task availability is dictated by the `posted_at` timestamps in `sample_tasks.json`.  Players can only accept a task after its posted time.
4. **Task Completion Criteria** – Tasks are completed through a simple sequence: talk to the requester, visit the target building or location, optionally interact with an object, and return to the requester.  More complex multi‑stage tasks may be added later.
5. **Time Scale** – Normal time progresses at a rate that allows all tasks to be completed within a single session.  Fast‑forward speed is set to approximately 5× normal time (subject to tuning).  Time progression is paused during dialogues and cutscenes.
6. **UI Colours and Fonts** – Wireframes use neutral colours and a generic font.  Final art direction will define the actual colour palette and typography to align with the OIA style.
7. **Mini‑Map Optional** – The mini‑map is marked as optional.  If omitted, navigation aids like ground arrows or compass markers should suffice.
8. **Accessibility** – Basic guidelines for text contrast and element sizing are provided, but a full accessibility review is outside the scope of this run.
9. **Code Skeleton** – The provided pseudocode skeleton is a suggestion.  Actual implementation details will depend on the engine and may require additional functions (saving/loading, input handling, etc.).

## Open Questions

1. **Dynamic Task Variations** – Should tasks vary between play sessions (randomised order or availability) or remain fixed for the alpha?  Introducing randomness could improve replayability but may complicate testing.
2. **Multi‑Day Progression** – When the alpha eventually supports multiple days, how should persistent tasks and player reputation be handled?  A future run might define a meta‑game structure.
3. **Failure Consequences** – What penalties should apply if a task is not completed by its deadline?  Options include reputation loss, reduced rewards, or altering NPC schedules.
4. **NPC Personality Integration** – How should personality flags from the NPC roster affect task availability and dialogue?  A “busy” NPC might post more urgent tasks or skip social periods.
5. **HUD Customisation** – Should players be allowed to move or resize HUD elements?  This could improve accessibility but requires additional UI logic.
6. **Audio and Feedback** – The current spec focuses on visual design.  What sound cues and haptic feedback (for controllers) should accompany time control toggles, task acceptance and completion?
7. **Edge Cases** – How should the system behave if the player is inside a building when the day ends or when a deadline passes?  Should they be teleported, or can tasks be completed after hours?

Addressing these questions will refine the alpha loop and expand its depth in subsequent phases.  For now, the assumptions provide a baseline for implementation.
