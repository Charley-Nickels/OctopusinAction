# How to Integrate the OIA Town Map (Map Pack v01)

This guide explains how to import the Map Pack v01 assets into your game project.  Codex (or other build tools) can use the provided image and data files to generate an Unreal level or to feed a custom level loader.

## Files and Structure

```
oia/
  assets/
    map_pack_v01/
      town_map_v01.png       ← reference image of the complete map
      town_map_v01.json      ← structured data for tiles, layers and collision
      town_map_v01.csv       ← flat grid of tile IDs
  reports/
    summary_MAP_PACK_v01.md
    how_to_integrate_MAP_PACK_v01.md
    notes_MAP_PACK_v01.md
```

### JSON Structure

The JSON file contains:

```jsonc
{
  "tile_size": 48,             // pixels per tile
  "width": 25,                 // number of tiles horizontally
  "height": 25,                // number of tiles vertically
  "legend": {                  // mapping IDs → symbolic names
    "0": "grass",
    "1": "walkway",
    "2": "city_hall",
    "3": "post_office",
    "4": "residential",
    "5": "commercial",
    "6": "utilities",
    "7": "decorative_tree"
  },
  "layers": {
    "ground": [ ... ],          // 25×25 array containing 0 (grass) or 1 (walkway)
    "buildings": [ ... ],      // 25×25 array with IDs 2–6; 0 elsewhere
    "decorative": [ ... ]      // 25×25 array with ID 7 for trees; 0 elsewhere
  },
  "collision_map": [ ... ]      // 25×25 boolean array; 1=non‑walkable (buildings), 0=walkable
}
```

If you do not need the CSV, you can ignore it; it simply flattens all tiles (including decorative) into a single 25×25 grid.

## Suggested Import Steps

1. **Prepare asset directories** in your Unreal project (or the chosen engine).  Place the contents of `oia/assets/map_pack_v01/` under an appropriate directory in your project’s content folder.

2. **Load the JSON**:  In your level‑loading code, parse `town_map_v01.json` to retrieve tile size, grid dimensions, layers and collision information.  For example, in Unreal you could use a Blueprint or C++ class that reads JSON using the built‑in JSON library.

3. **Generate the tilemap**:
   - Create a `TileMap` or `TileSet` asset in your engine with tiles representing grass, walkway, city hall, post office, residential, commercial, utilities and decorative tree.  For the alpha slice you can use simple coloured squares matching the PNG; later these can be replaced with detailed pixel art or 3D meshes.
   - Iterate through the `ground` layer and place the correct tile at each `(x, y)` coordinate.  For any non‑zero value in the `buildings` layer, place the corresponding building tile on a higher layer so it draws above the ground.  Similarly, place decorative trees on top of ground.

4. **Collision setup**:  Use the `collision_map` to mark blocking tiles.  In Unreal this could mean adding a `BlockingVolume` or enabling collision on certain tile instances.  All tiles with `1` in the collision map are non‑walkable (buildings).  Trees and roads are considered walkable in this version.

5. **Spawn points and triggers** (optional):  The map does not define spawn points or interactive triggers.  You will need to manually place actors (e.g., the player start, NPC spawn points, and door teleport triggers) on or adjacent to the correct tiles.

6. **Visual reference**:  The `town_map_v01.png` file provides a quick reference for designers and programmers.  It can be used to verify that the generated tilemap matches the intended layout.

## Notes

- The provided colours are placeholders.  Replace them with your own art once the Creative Director approves the overall layout.
- Tile size (48 px) can be changed globally by adjusting the `tile_size` value and regenerating the map art.  All positions in the JSON are tile‑relative, not pixel‑relative.
- Paths around buildings can be extended or refined in later runs.  If additional decorative items or unique tiles are needed, we can add them in a subsequent update.