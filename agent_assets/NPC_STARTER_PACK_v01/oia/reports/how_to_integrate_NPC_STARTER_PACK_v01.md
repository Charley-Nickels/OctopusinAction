# How to Integrate the OIA NPC Starter Pack (NPC Starter Pack v01)

This document explains how to incorporate the NPC sprites and roster data into your game.  It covers importing the images, assembling animations and using the roster JSON to spawn and schedule NPCs.

## File Structure

```
oia/
  assets/
    npc_starter_pack_v01/
      mayor/
        idle_1.png
        idle_2.png
        walk_1.png
        walk_2.png
        walk_3.png
        walk_4.png
        portrait.png
      postmaster/
        ...
      shopkeeper/
        ...
      maintenance_chief/
        ...
      resident/
        ...
  data/
    npc_starter_pack_v01/
      npc_roster.json
  reports/
    summary_NPC_STARTER_PACK_v01.md
    how_to_integrate_NPC_STARTER_PACK_v01.md
    notes_NPC_STARTER_PACK_v01.md
```

## Loading Sprites

1. **Import the PNG files** into your engine’s asset system.  Maintain the directory structure so that relative paths in the JSON roster remain valid.  For example, `oia/assets/npc_starter_pack_v01/mayor/idle_1.png` should map to a content path such as `Content/OIA/NPCs/mayor/idle_1`.

2. **Create animation assets** for each NPC:
   - **Idle animation:** Use the two `idle_*.png` frames.  Set the frame rate to a low value (e.g., 1–2 fps) to create a subtle breathing motion.
   - **Walking animation:** Use the four `walk_*.png` frames.  Set the frame rate to 4–6 fps for a smooth walking cycle.  Loop the animation.
   - If your engine supports sprite sheets, you can combine the frames into a single sheet; otherwise keep them separate.

3. **Portraits:** Use the `portrait.png` file for dialogue boxes, UI panels or other situations where a headshot is needed.  The portraits are simple crops of the idle frames scaled up to 48×48 px.

## Using the NPC Roster

`npc_roster.json` contains an array of NPC definitions.  Each object includes:

- `name`, `species`, `home` and `job` — descriptive fields for UI and game logic.
- `schedule` — an ordered list of time/location pairs.  Times are in 24‑hour format (HH:MM) and should be interpreted relative to the game’s time system.  The engine should move the NPC to the specified location at the given time.
- `dialogue_starters` — a list of strings to initiate conversations.  These can be used by the dialogue system when the player speaks to the NPC.
- `personality_flags` — high‑level traits that can influence behaviour trees (e.g., how often the NPC generates tasks or how they react to the player).
- `color_palette` — hex colours used in the sprite.  This can help maintain a consistent art style or drive procedural variations.
- `sprites` — relative paths (from `oia/assets/npc_starter_pack_v01/`) to the idle frames, walk frames and portrait.

### Suggested Integration Workflow

1. **Parse the roster:** Read `npc_roster.json` into a data structure.  For each NPC, load the referenced sprite frames and create animation objects as described above.

2. **Spawn NPCs:** During level loading, instantiate NPC actors at their `home` location.  Assign the loaded animations and set their default state to idle.

3. **Scheduling:** Use the `schedule` array to drive NPC movement.  At specific in‑game times, move the NPC to the designated `location`.  You can translate building names (“City Hall”, “Post Office”, etc.) into world coordinates or interior maps based on your existing map data.

4. **Dialogue:** Provide the `dialogue_starters` to your dialogue system when the player interacts with the NPC.  Additional dialogue lines can be stored elsewhere and referenced by `name`.

5. **Personality flags:** Use the `personality_flags` to influence NPC behaviour.  For example, a “busy” NPC may walk faster or refuse casual conversations.  These flags will become more important when behaviour trees are introduced in Run 5.

6. **Colour palette:** If you want to generate variant NPCs programmatically, use the provided palettes as a base.  You can swap colours to create new characters while preserving the overall style.

## Notes on Directionality

The provided sprites face **downward** (toward the bottom of the screen).  For a fully featured system, you will need directional sprites (up, left, right).  You can create these by mirroring or rotating the current frames, or by drawing new ones.  For the alpha slice, downward‑facing sprites may suffice.

## Versioning

This is version 01 of the NPC starter pack.  If you expand the roster or improve the art, increment the version number in the directory and file names (e.g., `npc_starter_pack_v02`).  Ensure the JSON paths and integration scripts are updated accordingly.