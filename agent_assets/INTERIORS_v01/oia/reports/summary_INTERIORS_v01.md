# OIA Phase 1 – Run 2: Interiors v01 Summary

## Overview

In this run we created the **first iteration of interior maps** for the five buildings laid out in the town map.  Each interior matches the external footprint defined in Map Pack v01 and uses a consistent 48 × 48 px tile grid.  The goal was to provide functional, easy‑to‑read rooms with placeholder colours; Codex will replace them with final art later.

## Interiors Produced

| Interior | Tile Size | Grid Size (w × h) | Highlights |
|---|---|---|---|
| **City Hall** | 48 px | 6 × 5 | Reception desk across the second row, visitor chairs in front, door at bottom centre.  Walls line the perimeter. |
| **Post Office** | 48 px | 5 × 5 | Long service counter at row 2, shelves behind the counter for mail, door at bottom centre. |
| **Residential** | 48 px | 5 × 4 | Bedroom area with a bed, a central table with chairs around it, and a small shelf.  Door at bottom centre. |
| **Commercial** | 48 px | 5 × 4 | Shop counter along row 2, shelves for merchandise, open floor space for customers. |
| **Utilities/Maintenance** | 48 px | 6 × 4 | Workshop with a workbench (machines) along the back wall, tables and storage boxes in the middle, and a door at bottom centre. |

## Deliverables

All interior assets are located under `oia/assets/interiors_v01/` in the ZIP archive.  For each room we provide:

| File | Description |
|---|---|
| `city_hall.png`, `post_office.png`, `residential.png`, `commercial.png`, `utilities.png` | Top‑down PNG reference images of each interior.  Floor tiles are beige; walls, desks, chairs, beds, shelves, machines and other furniture are represented by distinct placeholder colours.  Grid lines are included to clarify tile boundaries. |
| `*.json` (one per room) | Structured JSON files describing each interior: tile size, width, height, a legend of furniture IDs, layer arrays (`floor` and `furniture`) and a collision map. |

The report directory contains:

* `summary_INTERIORS_v01.md` – this document.
* `how_to_integrate_INTERIORS_v01.md` – guidance for Codex on how to load and use these interiors.
* `notes_INTERIORS_v01.md` – assumptions made, design rationale and open questions.

## Notes

The interiors are purposefully simple.  They include essential elements (desks, tables, shelves, beds, machines) to hint at each building’s function.  Doors are placed at the bottom centre of each room for easy alignment with the exterior map.  Collision maps mark walls and objects as non‑walkable; the door tile itself is walkable.  The next steps, after approval, involve adding more decorative elements, interactive triggers and connecting these interiors to the town map’s door tiles.