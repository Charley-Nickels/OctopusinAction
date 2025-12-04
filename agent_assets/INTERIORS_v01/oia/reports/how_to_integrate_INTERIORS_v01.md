# How to Integrate the OIA Interior Maps (Interiors v01)

This guide explains how to import and use the interior room assets created in Run 2.  Each interior corresponds to one building from Map Pack v01.  The data is provided as PNG reference images and JSON definitions containing tile layers and collision information.

## File Layout

```
oia/
  assets/
    interiors_v01/
      city_hall.png
      city_hall.json
      post_office.png
      post_office.json
      residential.png
      residential.json
      commercial.png
      commercial.json
      utilities.png
      utilities.json
  reports/
    summary_INTERIORS_v01.md
    how_to_integrate_INTERIORS_v01.md
    notes_INTERIORS_v01.md
```

### JSON Structure

Each `*.json` file follows the same structure:

```jsonc
{
  "tile_size": 48,             // pixels per tile
  "width": <number>,          // number of tiles horizontally
  "height": <number>,         // number of tiles vertically
  "legend": {                 // ID → furniture or floor name
    "0": "floor",
    "1": "wall",
    "2": "desk",
    "3": "chair",
    "4": "bed",
    "5": "shelf",
    "6": "machine",
    "7": "box",
    "8": "table",
    "9": "door"
  },
  "layers": {
    "floor": [ ... ],           // 2D array filled with 0 (floor)
    "furniture": [ ... ]       // 2D array containing IDs for walls and furniture
  },
  "collision_map": [ ... ]      // 2D array; 1=blocked, 0=walkable (doors are walkable)
}
```

Only two layers are provided: a `floor` layer (all zeros) and a `furniture` layer.  The latter contains walls, desks, chairs, beds and other objects.  The collision map marks any tile with a furniture ID (except the door) as blocked.

## Suggested Integration Process

1. **Import assets** into your project’s content folder (e.g., under `Content/OIA/Interiors/`).  The PNG images are for visual reference and can be used by designers to verify the tile layout.

2. **Parse the JSON** for each room using your engine’s JSON utility.  Extract `tile_size`, `width` and `height` to set up the tile grid for the room.

3. **Generate the tilemap**:
   - Create a tilemap or layered grid structure in your game engine matching the width and height of the room.
   - For every position `(x, y)` in the `floor` layer, place your interior floor tile (e.g., wooden floor or stone floor).  In this version the floor layer is uniform.
   - Iterate through the `furniture` layer.  When the value is 0, leave the tile empty; when it matches an ID in the legend, place the corresponding mesh or sprite (e.g., wall, desk, chair).  Use placeholder models for now; they can be replaced with high‑fidelity assets later.

4. **Set collision**:  Use the `collision_map` to mark blocked tiles.  Most furniture, including walls, counters, shelves, beds and machines, should block movement.  The door tile (ID 9) is intentionally marked as walkable to allow entering/exiting the room.

5. **Door transitions**:  Align the door tile location with the corresponding exterior door on the town map.  For example, the City Hall interior’s door at `(col=3, row=4)` should map to the City Hall’s entrance tile in the town exterior.  Add triggers so that when the player interacts with the exterior door they are teleported to the interior at the appropriate spawn point (typically just inside the door).

6. **Interactive hotspots**:  If you wish to add interactive behaviours (e.g., talk to clerk at desk), define hotspots on the relevant tiles using the positions from the JSON.  For instance, in the Post Office interior, the service counter runs from `(col=1, row=1)` to `(col=3, row=1)`; you can attach NPCs or interactive UI to these tiles.

7. **Further customisation**:  The colours and placeholders are not final art.  Feel free to replace them with your own textures, models and decorative props.  The JSON layer definitions will remain valid as long as you preserve the tile grid.

## Notes

- Walls occupy the entire perimeter of each room except for a single door tile on the bottom row.  This simplifies door placement and ensures players spawn into an open area.
- The floor layer currently contains only zeros, representing a uniform floor.  If you wish to add variation (e.g., rugs, carpet), you can modify the floor layer in future iterations.
- Additional layers (e.g., for clutter or decorative objects) can be introduced by adding extra arrays to the `layers` object.  Keep in mind that any non‑zero tile on a furniture layer should have a corresponding collision entry if it blocks movement.