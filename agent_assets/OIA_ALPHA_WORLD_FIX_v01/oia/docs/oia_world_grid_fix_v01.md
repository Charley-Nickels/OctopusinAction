# OIA World Grid Fix v01 Specification

## Overview

This document outlines how to remedy the **clumping** and **misalignment** observed in the current alpha map by enforcing a consistent 48×48 pixel tile grid.  It provides guidance for coders (Codex) to implement a `TileGridManager`, update the world loader, and adjust the town layout to align buildings, props and spawn points cleanly on the grid.  No application logic is modified here; instead, this spec serves as a design blueprint for the upcoming implementation.

## Problems Observed

* **Off‑grid placement** – Some buildings, props and markers sit between grid lines, causing visual jitter and collision issues.
* **Clumping of objects** – Decorative items (trees, benches) overlap each other or intrude into walkways.
* **Inconsistent anchors** – Buildings are positioned from various corners, making door alignment unpredictable.
* **Depth ordering anomalies** – Sprites occasionally draw in the wrong order when characters move north/south.

## Tile Grid Principles

1. **Tile size** – The world uses a constant `TILE_SIZE = 48`.  All positions and sizes should be measured in tile units `(gridX, gridY)` and converted to pixel coordinates via `gridX × TILE_SIZE` and `gridY × TILE_SIZE`.
2. **Grid coordinate system** – Define `(0,0)` at the top‑left of the map.  Increasing `gridX` moves right; increasing `gridY` moves down.  The map retains its 25×25 tile dimensions but can expand in future.
3. **Snap to grid** – All buildings, props, spawners, waypoints and markers must occupy whole tiles.  Avoid sub‑pixel offsets; use the helper functions in the `TileGridManager` to convert between grid and world space.
4. **Anchoring** – Buildings should be anchored at their **bottom‑centre** tile.  This ensures their door aligns with the walkway tile immediately below.  Props should be anchored at their bottom‑left tile unless they are centred objects (e.g. statues).

## Recommended Layout Adjustments

* **Re‑position buildings** – Align each building so that its doorway sits directly on the horizontal walkway (row 12).  For example:
  - *City Hall* (6 tiles wide × 5 tiles tall): place its bottom row on `gridY = 11` with its central 2 tiles straddling the vertical walkway at `gridX = 12`.  The door occupies the central two tiles of that bottom row.
  - *Post Office* (5×5): similarly align its bottom row at `gridY = 11` and centre it on the vertical walkway.
  - *Residential*, *Commercial* and *Utilities* buildings (5–6 tiles wide, 4 tiles tall): place them south of the walkway with their top rows at `gridY = 13` and centre them on `gridX = 12`.
* **Clearance** – Leave at least one tile of empty walkway or grass between any two buildings.  Decorative props should occupy their own tiles and never overlap collision boundaries.
* **Spawn points** – Position the player’s start position on a walkway tile adjacent to the Residential door (`gridX = 12, gridY = 14` if following the above placement).  NPC spawn positions should correspond to their home buildings’ door tiles.
* **Props and markers** – Place benches, crates and signs on grass tiles adjacent to walkways.  Snap the mailbox to a tile just outside the player’s residence.

These coordinates are suggestions; the final values may differ based on artistic direction.  The critical point is that each asset occupies whole tiles and aligns with the central walkway.

## TileGridManager Specification

Codex should implement a `TileGridManager` (C++ or Blueprint) that provides the following features:

```c++
const int32 TILE_SIZE = 48;

// Converts grid coordinates to world (pixel) coordinates.
FVector2D GridToWorld(int32 GridX, int32 GridY) {
    return FVector2D(GridX * TILE_SIZE, GridY * TILE_SIZE);
}

// Converts world coordinates back to grid coordinates (floor division).
FIntPoint WorldToGrid(float WorldX, float WorldY) {
    return FIntPoint(FMath::FloorToInt(WorldX / TILE_SIZE), FMath::FloorToInt(WorldY / TILE_SIZE));
}

// Snaps an arbitrary world position to the nearest grid intersection.
FVector2D SnapToGrid(FVector2D WorldPos) {
    auto Grid = WorldToGrid(WorldPos.X, WorldPos.Y);
    return GridToWorld(Grid.X, Grid.Y);
}

// Optionally: returns the tile rectangle (in world space) for collision or selection.
FBox2D GetTileBounds(int32 GridX, int32 GridY) {
    FVector2D Min = GridToWorld(GridX, GridY);
    FVector2D Max = GridToWorld(GridX + 1, GridY + 1);
    return FBox2D(Min, Max);
}
```

This manager should be accessible globally so that all actors placing objects (map loader, NPC spawner, mailbox placement) snap to the grid.  Avoid duplicating the `TILE_SIZE` constant in multiple classes.

## World Loader Guidelines

1. **Parse JSON layout** – Read the existing `town_map_v01.json` or a revised layout file.  Use the `legend` to interpret tile types.
2. **Anchor objects** – For each building entry, calculate its bottom‑centre grid coordinate and call `GridToWorld()` to obtain its world position.  Place the building mesh or sprite such that its door aligns with the walkway.
3. **Centre the town** – After all objects are placed, determine the bounding box of occupied tiles and adjust the camera or parent actor so that the town sits centred in the viewport.  This prevents offset drift when resizing the world.
4. **Spawn points** – Spawn the player and NPCs at the grid positions defined in the layout.  Use `SnapToGrid()` to ensure precision.
5. **Remove legacy offsets** – Delete any code that adds arbitrary pixel offsets to building placements.  All offsets should now be derived from the grid system.

## Depth Sorting Strategy

To achieve correct overlap when sprites move past each other:

* Use a **Y‑based sort key**: lower `gridY` (higher up on the screen) should draw behind higher `gridY`.  If two actors share the same `gridY`, sort by their world Y coordinate plus a small offset based on their height.
* Implement sorting either in the rendering pipeline (e.g. via Unreal’s custom depth layer on a per‑tick basis) or batch update all actor `Z` or `DrawOrder` values after each movement.  Since the town is small, an O(n log n) sort each frame will be performant.
* Ensure background layers (ground, walkways) draw first, followed by props and buildings, then NPCs and the player.

## Extension and Maintenance

* Future buildings and interiors should follow the same bottom‑centre anchoring rule.  Document new building sizes and update the layout file accordingly.
* If the map expands beyond 25×25 tiles, update the world loader to handle variable sizes and recalculate the centre point.
* Keep `TileGridManager` free of gameplay logic.  It should solely manage coordinate conversions and snapping; AI and pathfinding should rely on it but not modify its internals.
* Maintain separation between data (JSON layout) and code.  Non‑programmers should be able to adjust the layout by editing the JSON file without touching code.

By following these guidelines, the town map will become neatly aligned, easier to navigate, and ready for further content additions.  Codex should reference this document while refactoring the existing world code.
