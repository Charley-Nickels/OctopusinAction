# Notes and Assumptions – Map Pack v01

This file captures the assumptions, design choices and open questions that arose while building Map Pack v01.  These notes are meant for the Master Architect and Creative Director to review before we proceed to Phase 1 Run 2.

## Assumptions

1. **Tile size:** Each tile is 48 × 48 px.  This allows for a moderate level of detail while keeping memory and draw calls manageable.  The tile size can be adjusted globally if needed, but all map dimensions, building sizes and collision data currently rely on this 48 px assumption.
2. **Map dimensions:** The town uses a 25 × 25 tile grid.  This results in a 1200 × 1200 px PNG when drawn at 48 px per tile.  The size is small on purpose; the slice should feel compact.
3. **Building footprints:**
   - City Hall: 6 × 5 tiles, positioned near the upper‑left.
   - Post Office: 5 × 5 tiles, upper‑right.
   - Residential: 5 × 4 tiles, lower‑left.
   - Commercial: 5 × 4 tiles, lower‑center.
   - Utilities: 6 × 4 tiles, lower‑right.
   These footprints are arbitrary but provide varied shapes for testing navigation.
4. **Walkways:** A cross‑shaped walkway connects all quadrants.  Grass is considered walkable for now, making the entire map accessible except for building tiles.  Later runs could restrict walking to roads if desired.
5. **Decorations:** Small green squares represent trees or bushes.  They have no collision in v01 but can be made blocking in future.
6. **Layering:** We separated the map into `ground`, `buildings` and `decorative` layers.  Additional layers (e.g. decals, overlays) can be added later if needed.
7. **Collision:** Only building tiles are non‑walkable.  Trees, grass and roads are all walkable in this version.  We will revisit collision for interiors and more complex obstacles in later runs.

## Open Questions / To‑Dos

1. **Building entrances and door transitions:** The current map does not mark doors.  Where should entrances be placed on each building, and how will Codex handle transitions to interior maps?  We can allocate specific tiles for door triggers in the next run.
2. **Visual style:** Colours are placeholders.  Should we adopt a specific art direction (e.g., 8‑bit pixel art, semi‑realistic)?  Input from the Creative Director will guide future asset creation.
3. **Map scale relative to the player:** Without knowing the player character size, it is unclear how many tiles should represent a typical building.  Our assumption is roughly 1 tile per 1 m² equivalent.  Please confirm if adjustments are needed.
4. **Navigation restrictions:** Should grass remain walkable, or should players be restricted to roads and designated paths?  Clarifying this will influence collision data and NPC pathing.
5. **Additional decorative assets:** Trees and bushes are the only decorative elements included.  Should we add benches, lamp posts, fountains, etc., or leave those for a later phase?
6. **Dynamic elements:** No dynamic objects (e.g. vehicles, moving NPCs) are present yet.  These will appear in later runs when we introduce NPCs.

## Summary

Map Pack v01 is a functional starting point.  It will evolve based on feedback regarding layout, tile sizes, art style and gameplay mechanics.  Please review the open questions and assumptions so that we can refine the map in Run 6 (or another reserved slot) if necessary.