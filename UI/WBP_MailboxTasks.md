# WBP_MailboxTasks

Simple mailbox task selection widget.

- On construct, reads `DT_Tasks` (STR_Task rows) and populates a scroll list showing `TaskID` and `Title` for each entry with centered layout so it is unobstructed by the HUD.
- Each row has an Accept button that triggers a delegate or direct call to `BP_TimeManager.AddTask` on the passed-in manager reference, then removes the widget from the viewport; a Close/Cancel button dismisses without adding and clears the mailbox’s open flag so the prompt returns.
- Receives a `BP_TimeManager` reference when created by `BP_Mailbox`; guards against missing references, optionally prints a debug message, and safely ignores the add when invalid so bad refs do not block closing.
- Includes a light translucent backdrop to subtly dim the world while keeping the mailbox list readable; the mailbox blueprint ensures only one instance is open at a time and anchors the panel away from the HUD clock.

## Blueprint Comment
- Construct/Init note: comment that the widget pulls rows from `DT_Tasks`, builds the scroll list, and expects a valid time manager reference injected by `BP_Mailbox`.
- Row buttons: annotate Accept to call `AddTask` then `RemoveFromParent`, and Cancel to just close and clear the mailbox open flag; missing manager refs optionally PrintString when debug is enabled.
