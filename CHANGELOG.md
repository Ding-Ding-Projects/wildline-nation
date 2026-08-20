# Changelog

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

Verification: seven focused Vitest cases passed; the production Vite build passed; two isolated built-artifact headless journeys completed the full Harbourlight → Gullhaven → Harbourlight → Asterfield route and exercised all three streetcar panels. Final ferry and flight ticket counts were verified as zero immediately after boarding.

## 0.1.0 — Harbourlight City vertical slice

- Added an original 2.5D city map with Rest Stop, grocery, restaurant, salon, builder office, arena, Minigame Centre, bus, and subway places.
- Added place-only purchases for local goods, meals, styling, Catch Balls, construction, and prizes.
- Added the Harbour Courtyard 01 template, named crew, and ten visible construction phases.
- Added Brineling, Catch Balls, a paid turn-based battle contract, and Lantern Current.
- Added ten-second autosave and save-on-close.
- Added the non-playable Pages-ready landing page.

Verification note: the initial rapid-release pass intentionally ran build/package only. Tests, lint, typecheck, review suites, and captures were deferred to the full release pass.
