# WBP_InteractionPrompt

Minimal prompt widget for mailbox interaction visibility.

- Displays a short message like "Press E to open mail" anchored near screen bottom/center with high-contrast text on a translucent backing and safe padding from HUD edges.
- Shown by `BP_Mailbox` when the player is overlapping the interaction volume and no mailbox/task widget is already open; hidden on end overlap or immediately when the mailbox UI opens so it never stacks under overlays.
- Kept lightweight so it can be reused for other interactables if needed.
