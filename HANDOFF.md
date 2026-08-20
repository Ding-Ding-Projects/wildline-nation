# Handoff — Wildline Nation v0.2.0-build.8

## Current state

The default line is at commit `051f48653a359aa55be22f7c8f46d0c983e6757b`, published as [`v0.2.0-build.8`](https://github.com/Ding-Ding-Projects/wildline-nation/releases/tag/v0.2.0-build.8). The playable desktop remains the three-city Harbourlight/Gullhaven/Asterfield slice. Each of those cities has its daily-life buildings, local transit, unique content, construction progress, a creature, an arena contract, and a minigame.

The national content layer is integrated and deterministic: 50 city records, 5,000 enterable-building records, 500 minigame records (10 per city), and 100 creature forms. It is domain/content infrastructure for the larger product, not the finished fifty-city open world, not a set of fully authored navigable interiors, and not a full realistic life simulation.

The transit, creature, and battle work is integrated through merge commit `051f48653a359aa55be22f7c8f46d0c983e6757b`. Both API families were preserved: the deterministic service contracts and the richer catalogue, roster, stop-by-stop, and system APIs. Physical commerce and construction services are integrated as well.

## Important implementation boundaries

- `src/game/world.ts` remains the data-driven playable city/place/route catalogue.
- `src/game/types.ts` holds the version 2 world, ticket, progress, and journey contracts.
- `src/game/tickets.ts` owns pure physical-ticket purchase and consumption rules.
- `src/game/save.ts` owns bounded normalization and deterministic version 1 migration.
- `src/main.ts` owns renderer interaction, physical-context checks, ride animation, save-before-departure, and resume/arrival behavior.
- `electron/main.cjs` writes version 2 saves but falls back to the legacy version 1 filename for migration.
- The national catalogue and domain systems live under `src/systems/`; their records and APIs should be treated as reusable infrastructure until the corresponding playable-world surfaces are built.
- The commerce and construction services are integrated and must retain their physical-place builder/transaction boundaries.

## Verification evidence and boundaries

The earlier intercity verification belongs to commit [`8ae4188`](https://github.com/Ding-Ding-Projects/wildline-nation/commit/8ae418800203111141a1eee99af0851f86f9de8a), before the later rapid publication pass. It consisted of seven focused tests plus built-artifact journeys that verified Harbourlight → Gullhaven → Harbourlight → Asterfield, all three streetcar panels and loops, both physical-ticket flows, ticket consumption, and city arrivals.

The later rapid pass that produced `v0.2.0-build.8` ran no unit, integration, end-to-end, lint, typecheck, accessibility, security, review, or smoke suites, and took no screenshots. Do not cite that pass as fresh runtime, visual, or quality-suite evidence.

The final publication proof downloaded and verified the release index and payloads at the exact published commit:

| Asset | Size | SHA-256 |
| --- | ---: | --- |
| `RELEASES` | 86 bytes | `396b45507a45a5717f06fbfb2df284dfe2f417eb8d9b08576a8a6c93408fa032` |
| `wildline-nation-0.2.0-full.nupkg` | 238,517,779 bytes | `d9ceb98a0ef1760434e5511be8e9c1637c465f776f2fb6860c26913e9fb52c7b` |
| `Wildline-Nation-Setup-0.2.0.exe` | 239,376,896 bytes | `499cd6ac06406aa200033bf44adc3445020df2408c909e39b1ea702d4404c3f3` |

## Remaining work

- Keep issue [#1](https://github.com/Ding-Ding-Projects/wildline-nation/issues/1) open; the larger product request is not complete.
- Turn the national catalogue records into the corresponding playable world: fifty navigable cities, authored enterable interiors, city-specific interactions, and the remaining world-state integration.
- Build the full life-simulation layer: careers, relationships, households, businesses, furnishing, renovation, and deeper construction validation.
- Extend national rail, coach, and regional networks beyond the current three-city ferry/flight/streetcar foundation.
- Add the release-grade verification, built-artifact evidence, documentation, and screenshot work that the rapid pass intentionally did not run.
- Revisit dependency advisories through the normal dependency-maintenance process; the rapid pass did not force-upgrade packaging dependencies.

## Next owner

Treat `051f48653a359aa55be22f7c8f46d0c983e6757b` and `v0.2.0-build.8` as the published baseline. Preserve the distinction between deterministic national data and playable runtime coverage, and keep issue #1 open until the remaining world and life-simulation work is actually implemented and verified.
