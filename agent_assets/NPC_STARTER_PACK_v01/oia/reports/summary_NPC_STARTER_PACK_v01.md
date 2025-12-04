# OIA Phase 2 – Run 4: NPC Starter Pack v01 Summary

## Overview

This run introduces the first set of **non‑player characters (NPCs)** for *Octopus in Action*.  It provides simple pixel‑art sprites, idle/walking animations and a roster file describing five distinct NPCs.  These characters will populate the town and drive tasks via the mailbox system in later runs.

## NPCs Created

| Name | Role | Home | Job | Highlights |
|---|---|---|---|---|
| **Mayor** | Human | City Hall | Mayor | Wears a dark‑blue suit and white shirt.  Runs the town and posts administrative tasks. |
| **Postmaster** | Human | Residential | Postmaster | Dresses in a brown postal uniform.  Manages mail and packages at the Post Office. |
| **Shopkeeper** | Human | Residential | Shopkeeper | Sports a teal outfit with an apron.  Operates the commercial shop. |
| **Maintenance Chief** | Human | Residential | Maintenance Chief | Wears a slate gray uniform with a yellow safety vest.  Responsible for utilities and repairs. |
| **Resident** | Human | Residential | Resident | Casual orange shirt and green pants.  Represents a generic citizen. |

## Deliverables

All assets are placed under `oia/assets/npc_starter_pack_v01/`.  For each NPC there is a subfolder named after the character (lowercase, spaces replaced with underscores) containing:

* **Idle animations:** Two PNG frames (`idle_1.png`, `idle_2.png`) show the NPC standing still with a slight bob for breathing.
* **Walking animations:** Four PNG frames (`walk_1.png` through `walk_4.png`) depict the character’s legs moving forward and back.
* **Portrait:** A 48×48 headshot (`portrait.png`) cropped from the first idle frame.  These can be used for dialogue boxes or UI elements.

Additionally, a roster file is provided:

| File | Description |
|---|---|
| `oia/data/npc_starter_pack_v01/npc_roster.json` | JSON array describing each NPC’s name, species, home, job, daily schedule (time and location entries), dialogue starters, personality flags, colour palette and relative paths to the sprite frames and portrait.  Colour values are provided as hex strings. |

Three documentation files accompany this pack:

* `summary_NPC_STARTER_PACK_v01.md` – this document.
* `how_to_integrate_NPC_STARTER_PACK_v01.md` – guidance on bringing the NPC sprites and roster into the game.
* `notes_NPC_STARTER_PACK_v01.md` – assumptions, design considerations and open questions.

## Notable Details

- **Tile size:** All sprites are 48×48 px to match the game’s tile size and align with map and interior assets.
- **Simplified animations:** Idle animations have two frames; walking animations have four frames, enough to convey basic movement.  Additional frames can be added later for smoother motion.
- **Colour palette:** Each NPC uses a cohesive palette that fits within the existing OIA art style.  Palettes are recorded in the roster file for reference.
- **Schedules:** Daily schedules are expressed as simple lists of time/location pairs.  These will later tie into the game’s time control system and behaviour trees.

## Next Steps

After review, we can refine these sprites (e.g., add directional animations), add more NPCs or species, and integrate them with behaviour trees and the mailbox system.  The next run (Run 5) will focus on defining behaviour trees and event triggers for these NPCs.