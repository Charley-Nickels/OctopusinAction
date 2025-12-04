# BP_Mailbox

Blueprint for mailbox interaction that opens the task list.

- Static mesh placeholder plus collision box for overlap detection and interaction range tuned for comfortable approach; ignores interact input when the mailbox widget is already open so only one instance spawns.
- On player overlap within the collision box and pressing `E` (or Interact input), creates `WBP_MailboxTasks` only if one is not already open, passes a reference to `BP_TimeManager` set by the level blueprint, and shows tasks from `DT_Tasks`; while no widget is open, toggles `WBP_InteractionPrompt` to display a simple "Press E" style hint that disappears on end overlap and anchors away from HUD time text.
- Accept button in the widget calls `AddTask` on the time manager for the selected entry and closes the widget; a close/cancel button also dismisses the widget without duplication, and missing manager references optionally print a debug note instead of erroring; interaction input is ignored while the mailbox UI is open to prevent spam spawning, so only one instance ever appears during normal use.
- Still fires a `MailboxOpened` custom event on interaction to allow any additional hooks, and clears prompt/UI references on end overlap to avoid stale bindings between days.

## Blueprint Comment
- Event Graph note: overlap begin shows `WBP_InteractionPrompt`, stores the time manager reference passed from the level, and binds Interact input to open `WBP_MailboxTasks` only if no widget is active; overlap end hides the prompt and clears references.
- Widget spawn section: comment that accepted tasks call `AddTask` on the manager then close, while cancel also closes and resets the mailbox-open flag so prompts can reappear; missing manager refs optionally PrintString when debug is enabled.
