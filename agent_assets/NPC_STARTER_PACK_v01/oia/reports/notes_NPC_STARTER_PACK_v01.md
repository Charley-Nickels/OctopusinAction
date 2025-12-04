# Notes and Assumptions – NPC Starter Pack v01

This file records the assumptions, design choices and open questions that arose while creating the initial NPC assets for **Octopus in Action**.

## Assumptions

1. **Art style:** Sprites are designed in a simplified 48×48 px pixel art style reminiscent of classic handheld RPGs (e.g. Pokémon HG/SS).  The focus is on clear silhouettes and easily distinguishable colours rather than fine detail.
2. **Facing direction:** All sprites currently face downward.  We assume that for the alpha slice, NPCs will not need directional animations.  If necessary, Codex can mirror or rotate the existing frames to simulate other directions.
3. **Animation frames:** Idle animations use two frames to simulate breathing.  Walking animations use four frames to depict leg movement.  Frame rates are intentionally low to conserve resources.  Additional frames and smoother animations can be added in future iterations.
4. **Species:** All NPCs are humans.  The OIA world might include other species (e.g. animals, robots or octopus‑like creatures), but these are left for later expansions.
5. **Colour palettes:** Each NPC’s colour palette is chosen to harmonise with the existing town and interior assets.  Colours are recorded in the roster for easy reference and reuse.
6. **Schedules:** Daily schedules consist of simple time‑location pairs.  We assume the game’s time system uses a 24‑hour format and that NPCs move instantly to their next location at the scheduled time.  More complex behaviours (e.g. travel times, random wandering) will be defined via behaviour trees in Run 5.
7. **Dialogue:** Dialogue starters are short phrases to initiate conversations.  They serve as placeholders; the full dialogue system and story content are beyond the scope of this run.
8. **Figma limitations:** Figma could not be accessed in the current environment, so sprites were drawn programmatically using Python’s Pillow library.  Should Figma become available, the sprites can be recreated or refined there and exported as updates.

## Open Questions / Future Work

1. **Directional sprites:** Do we need separate animations for up, left and right?  This may depend on how free‑form NPC movement will be.
2. **Variety of NPCs:** Are five NPCs enough for the alpha slice, or should we add more citizens to make the town feel populated?
3. **Species diversity:** Should we introduce non‑human characters (e.g., anthropomorphic animals or creatures) to reflect the game’s world more accurately?
4. **More personality traits:** Personality flags are simplistic.  We might need a richer system (e.g., mood states or relationship values) for deeper interactions.
5. **Sprite refinement:** The current sprites are placeholders.  Once the art direction is finalised, artists may need to redraw them with more detail, shading and animation frames.
6. **Schedule granularity:** Should schedules include durations (e.g., “stay at location until X time”)?  This would help NPCs remain at a location rather than jumping instantly.
7. **Integration with behaviour trees:** How will the roster and animations tie into the behaviour tree definitions in Run 5?  We assume the behaviour trees will reference the same NPC names and personality flags.

## Conclusion

The NPC Starter Pack v01 lays the groundwork for populating the game world with simple, animated characters.  Feedback on their appearance, schedules and personality definitions will guide improvements in subsequent runs.  The upcoming behaviour tree definition will build on these assets to define how NPCs move, idle, interact and generate tasks.