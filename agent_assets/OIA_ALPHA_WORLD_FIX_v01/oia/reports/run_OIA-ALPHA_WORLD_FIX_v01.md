# Run Report – OIA-ALPHA_WORLD_FIX_v01

## Summary of Work

During this run we addressed the **world alignment issues** in the Octopus in Action alpha slice.  Following the global AtlasForge rules that prevent direct modification of game code, we produced a detailed specification for refactoring the world layout to a clean 48×48 tile grid.  The report and documentation created in this run will guide Codex in implementing the changes while maintaining the project’s architectural integrity.

### Files Created

| File | Purpose |
|---|---|
| `oia/docs/oia_world_grid_fix_v01.md` | Comprehensive specification describing the problems with the current map, principles of the 48×48 grid, recommended building placements, anchoring rules, a `TileGridManager` design, world loader guidelines, and depth sorting strategy. |
| `oia/reports/run_OIA-ALPHA_WORLD_FIX_v01.md` | This run report summarising what was created and why. |

### Key Architectural Choices

* **Non‑code approach** – In line with the AtlasForge guidelines, we did not modify any C++ or Blueprint files directly.  Instead, we provided clear instructions and pseudocode to enable the Codex implementation team to build the necessary systems.
* **Bottom‑centre anchoring** – All buildings should anchor to their bottom‑centre tile, ensuring their doors align with the central walkway.  This simplifies placement logic and ensures doors consistently meet the town’s path network.
* **Centralised `TileGridManager`** – A manager class is proposed to convert between grid and world coordinates, snap objects to the grid, and supply tile bounds.  All subsystems should call into this manager rather than hard‑coding tile sizes.
* **Deterministic depth sorting** – A simple Y‑based sorting scheme is recommended to ensure sprites draw in the correct order.  The design avoids heavy per‑frame computations by using grid Y as the primary key.

### How to Extend the Grid/Layout Later

* When adding new buildings or map regions, continue to adhere to the 48 px tile standard and anchor new assets by their bottom‑centre.
* Update the JSON layout file with any new grid coordinates; non‑programmers can edit this data without touching code.
* If the town expands, adjust the world loader to compute the new centre of occupied tiles so that the viewport remains centred.
* Ensure future props and interactive markers are placed on whole tiles and do not overlap the walkable path.

## Next Steps for Codex

* Implement the `TileGridManager` in the codebase per the spec provided.
* Refactor the world loader to read the updated layout, apply anchoring, and center the town.
* Adjust actor spawn positions to match grid coordinates.
* Remove any ad‑hoc offsets or placeholder layout code that conflicts with the grid system.
* Add Y‑based depth sorting to the rendering pipeline to correct overlap issues.

By following these guidelines, Codex will be able to correct the clumping and alignment issues and maintain a robust, grid‑aligned world for future expansion.
