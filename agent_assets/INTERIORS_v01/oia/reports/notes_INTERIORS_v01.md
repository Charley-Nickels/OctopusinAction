# Notes and Assumptions – Interiors v01

This document records the choices made and the questions raised while designing the first set of building interiors for **Octopus in Action**.  The purpose is to inform the Master Architect and Creative Director about assumptions, so they can provide feedback for the next iteration.

## Assumptions

1. **Footprint alignment:**  Each interior uses exactly the same number of tiles as its exterior footprint.  This ensures that the door placement and transition logic can be mapped easily between exterior and interior.
2. **Tile size:**  Interiors use 48 × 48 px tiles, matching the exterior map.  Keeping the tile size consistent will simplify camera scaling and asset swapping later.
3. **Layer structure:**  Two layers are provided: `floor` (uniform 0s) and `furniture` (walls, desks, chairs, beds, shelves, machines, boxes, tables, doors).  Additional decorative layers can be added later if needed.
4. **Doors:**  A single door tile (ID 9) is placed on the bottom row, centred horizontally.  This assumption matches the location of exterior entrances.  Doors are walkable in the collision map.
5. **Collision rules:**  All furniture IDs except the door are considered solid.  Players and NPCs cannot walk over these tiles.  There is no differentiation between walls and other furniture for collision purposes in this version.
6. **Placeholder colours:**  Colours are chosen purely for readability and to distinguish between furniture types.  They are not final art.  The Creative Director may request a different palette or style later.
7. **Minimal clutter:**  To maintain clarity in an alpha slice, each interior contains only a few key objects that hint at its function.  Additional decoration or interactive elements can be added in subsequent runs.
8. **Orientation and camera:**  All interiors assume a top‑down orthogonal view.  If the final game uses an isometric or perspective camera, layouts may need to be adjusted.

## Open Questions / Considerations

1. **Interior–exterior connection:**  Are the door positions appropriate for the exterior map?  If doors need to be on different walls (e.g., side entrances), we will adjust interior layouts accordingly.
2. **Interactive furniture:**  Which pieces of furniture will support interactions?  For example, the Post Office counter might include a clerk NPC; the City Hall desk might open a UI for tasks.  Defining interactive hotspots will inform our NPC design in Run 4.
3. **Additional rooms:**  Should any of these buildings have multiple rooms (e.g., a back office in the Post Office or a second floor in the Residential building)?  We assumed single‑room interiors for simplicity.
4. **NPC pathing:**  The current collision maps allow free movement across floors.  If we need to restrict NPC movement to behind desks or within certain boundaries, we may need a secondary collision map or pathing layer.
5. **Visual style:**  The eventual art style (pixel art, 2D top‑down, or 3D) may require different tile sizes or proportions.  Feedback on style will guide future iterations.

## Next Steps

After receiving feedback, we can refine these interiors by adding decorative elements, implementing multi‑room layouts, or adapting the door placement.  Additional layers can be introduced to support carpets, lighting, or interactive objects.  These interiors will serve as the backdrop for NPC placement and the mailbox/ticket interactions in later runs.