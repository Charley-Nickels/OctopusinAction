# BP_DayCycle

Prototype Blueprint describing the day phase shell.

- Binds to `BP_TimeManager.OnHourChanged` on begin play.
- Exposes `CurrentPhase` (enum with Day, Evening, Night).
- Phase calculation: Day = hours 9–17, Evening = 18–20, Night = 21–8.
- On hour changes, recomputes and updates `CurrentPhase`; no lighting or audio hooks yet.
