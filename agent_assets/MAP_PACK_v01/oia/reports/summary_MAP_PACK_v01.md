# OIA Phase 1 – Run 1: Map Pack v01 Summary

## Overview

This run delivered the first draft of the **Octopus in Action (OIA) Town Map**.  The map represents a small slice of the game world designed for the early alpha and contains all of the Phase 1 buildings.  It is intentionally compact to keep walking distances reasonable and to focus on the core loop rather than exploration.

### Key Features

- **Tile‑based layout:** The map is a 25 × 25 grid.  Each tile is 48 × 48 px.  This size was chosen because it strikes a balance between readability and flexibility in top‑down games.
- **Core buildings:** Five clearly marked buildings appear on the map:
  1. **City Hall** (ID 2) – central administrative building in the upper‐left quadrant.
  2. **Post Office** (ID 3) – a separate building for mail and tickets in the upper‑right quadrant.
  3. **Residential Building** (ID 4) – lower‑left quadrant, representing the player’s home or general housing.
  4. **Commercial Building** (ID 5) – lower‑center quadrant, placeholder for shops or services.
  5. **Utilities/Maintenance Building** (ID 6) – lower‑right quadrant, industrial‑style context for tasks and repairs.
- **Roads and green space:** A cross‑shaped walkway (ID 1) connects all quadrants.  Grass tiles (ID 0) fill the rest of the map.  Decorative trees (ID 7) mark key points along the road and near building entrances.
- **Collision map:** A boolean collision grid marks building tiles as non‑walkable and all other tiles as walkable.  This will be important for path‑finding and NPC navigation.
- **Multiple layers:** The map JSON separates ground, buildings and decorative layers, enabling Codex to control rendering order in the engine.

## Deliverables

The following files were produced in this run and are located under `oia/assets/map_pack_v01/` in the ZIP:

| File | Description |
|---|---|
| `town_map_v01.png` | A top‑down PNG of the town map.  Colours differentiate building types, roads and decorative trees.  Buildings have black outlines to improve clarity. |
| `town_map_v01.json` | A JSON file describing map metadata and layers: tile size, grid dimensions, legend, ground layer, building layer, decorative layer, and the collision map. |
| `town_map_v01.csv` | CSV version of the combined tile grid for quick import into spreadsheets or tools that accept CSVs. |

Three companion documents were also created in `reports/`:

* **this summary**, explaining the deliverables.
* **a “how‑to” integration guide** with suggestions for Codex on how to import the map data.
* **a notes file** documenting assumptions (tile size, style) and open questions for the Master Architect.

## Next Steps

After review, feedback can be incorporated during a reserved run.  The subsequent runs will build on this foundation by creating interior layouts, defining the mailbox/ticket schema, populating the world with NPCs and adding a time‑control UI.