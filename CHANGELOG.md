# Changelog

## 0.2.0-build.8 — National catalogue and system API reconciliation

- Added the deterministic national catalogue foundation: 50 city records, 5,000 enterable-building records (100 per city), 500 minigame records (10 per city), and 100 creature forms.
- Reconciled transit, creature, and battle APIs through merge commit `051f48653a359aa55be22f7c8f46d0c983e6757b`, preserving both deterministic service contracts and the richer catalogue, roster, stop-by-stop, and system API families.
- Integrated the physical commerce and construction services while retaining their in-person transaction and builder-office boundaries.
- Kept the catalogue distinction explicit: these are domain/content systems, not yet the fully playable fifty-city open world, every authored navigable interior, or the complete realistic life simulation. The playable desktop remains the Harbourlight/Gullhaven/Asterfield slice.
- Published the non-draft release [`v0.2.0-build.8`](https://github.com/Ding-Ding-Projects/wildline-nation/releases/tag/v0.2.0-build.8) from commit `051f48653a359aa55be22f7c8f46d0c983e6757b`.

### Rapid-pass verification boundary

This rapid publication pass intentionally ran no unit, integration, end-to-end, lint, typecheck, accessibility, security, review, or smoke suites, and took no screenshots. It must not be read as fresh runtime or visual evidence.

The earlier intercity evidence is separate and remains attached to commit [`8ae4188`](https://github.com/Ding-Ding-Projects/wildline-nation/commit/8ae418800203111141a1eee99af0851f86f9de8a): seven focused tests passed, and built-artifact journeys verified the Harbourlight → Gullhaven → Harbourlight → Asterfield route, streetcar panels, physical-ticket flows, ticket consumption, and arrivals.

### Publication proof

The release proof downloaded and verified all three assets, including the update index:

| Asset | Size | SHA-256 |
| --- | ---: | --- |
| `RELEASES` | 86 bytes | `396b45507a45a5717f06fbfb2df284dfe2f417eb8d9b08576a8a6c93408fa032` |
| `wildline-nation-0.2.0-full.nupkg` | 238,517,779 bytes | `d9ceb98a0ef1760434e5511be8e9c1637c465f776f2fb6860c26913e9fb52c7b` |
| `Wildline-Nation-Setup-0.2.0.exe` | 239,376,896 bytes | `499cd6ac06406aa200033bf44adc3445020df2408c909e39b1ea702d4404c3f3` |

## 0.2.0 — Ferries, flights, streetcars, and three complete cities

- Added full unique playable city catalogs for Harbourlight, Gullhaven, and Asterfield, with 34 globally unique physical buildings.
- Added Harbourlight Ferry Terminal ↔ Gullhaven Ferry Exchange travel for $18 one-way.
- Added Harbourlight Airfield ↔ Asterfield Skyport travel for $60 one-way.
- Added route-specific physical tickets with separate purchase and boarding actions, exact-building validation, insufficient-funds handling, and one-time consumption.
- Added the Gold Quay, Copper Bell, and Sunline five-stop streetcar loops, plus bus and subway loops in every city.
- Added unique city creatures, minigames, battle contracts, stores, services, builders, construction progress, and visual palettes.
- Added version 2 saves with current city, physical ticket inventory, per-city progress, pending journeys, and deterministic version 1 migration.
- Added save-before-departure and idempotent resume/arrival behavior for ferry and flight journeys.
- Added an accessible building list beside the canvas map and responsive narrow-layout styling.

Verification: seven focused tests passed; the production Vite build passed; two isolated built-artifact journeys completed the full Harbourlight → Gullhaven → Harbourlight → Asterfield route and exercised all three streetcar panels. Final ferry and flight ticket counts were verified as zero immediately after boarding.

## 0.1.0 — Harbourlight City vertical slice

- Added an original 2.5D city map with Rest Stop, grocery, restaurant, salon, builder office, arena, Minigame Centre, bus, and subway places.
- Added place-only purchases for local goods, meals, styling, Catch Balls, construction, and prizes.
- Added the Harbour Courtyard 01 template, named crew, and ten visible construction phases.
- Added Brineling, Catch Balls, a paid turn-based battle contract, and Lantern Current.
- Added ten-second autosave and save-on-close.
- Added the non-playable Pages-ready landing page.

Verification note: the initial rapid-release pass intentionally ran build/package only. Tests, lint, typecheck, review suites, and captures were deferred to the full release pass.
