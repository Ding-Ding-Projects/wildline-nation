# Handoff — Wildline Nation v0.2.0 transport expansion

## Current state

The `feat/intercity-ferries-flights-streetcars` branch contains a playable three-city desktop build. Harbourlight, Gullhaven, and Asterfield each have a complete set of daily-life buildings, three local transit modes, unique content, construction progress, a creature, an arena contract, and a minigame.

Intercity travel is intentionally hub-and-spoke: Harbourlight ↔ Gullhaven by ferry and Harbourlight ↔ Asterfield by flight. There is no direct Gullhaven ↔ Asterfield route. Tickets are one-way, route-specific inventory purchased and used inside the matching physical building.

## Important implementation boundaries

- `src/game/world.ts` is the data-driven city/place/route catalog.
- `src/game/types.ts` holds the version 2 world, ticket, progress, and journey contracts.
- `src/game/tickets.ts` owns pure physical-ticket purchase and consumption rules.
- `src/game/save.ts` owns bounded normalization and deterministic version 1 migration.
- `src/main.ts` owns renderer interaction, physical-context checks, ride animation, save-before-departure, and resume/arrival behavior.
- `electron/main.cjs` writes version 2 saves but falls back to the legacy version 1 filename for migration.
- The concurrent commerce and construction service work from `origin/main` is merged intact. The separate transit and creature service branch remains isolated for its owner and was not overwritten.

## Verification evidence

- `npm test`: 1 file, 7 tests passed.
- `npm run build`: production Vite bundle passed.
- `git diff --check`: passed; only expected line-ending conversion warnings were reported.
- First built-artifact headless drive: 29 bounded steps completed against one exact `file:///.../dist/index.html` target.
- Final built-artifact headless drive: 25 bounded steps completed against a new process/profile and the rebuilt bundle.
- Verified interactions: all three streetcar panels and full loops; outbound and return ferry purchase/boarding; flight purchase/boarding; Gullhaven and Asterfield arrivals; physical ticket badge changed to `0 tickets` immediately after both ferry and flight boarding.
- Final captures were inspected from the real 1440×900 desktop artifact; no blank, black, clipped, contaminated, or wrong-state image was accepted.

## Remaining work

- The separate transit and creature service branch should be integrated through its public exports after its owner finishes and its changes are reviewed.
- The current canvas buildings are deterministic map blocks rather than authored 3D meshes or navigable interior scenes.
- Full regional schedules, capacity, disruptions, rail, coaches, and additional cities remain future work.
- Dependency audit output reports 13 high and 1 critical advisory in the existing dependency tree; this change did not force-upgrade packaging dependencies.
