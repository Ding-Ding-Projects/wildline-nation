# Roadmap

## v0.1.0 — Harbourlight City vertical slice

- [x] One playable city district and original 2.5D map presentation
- [x] Rest Stop basement, ground floor, second-floor shops, plaza, and washrooms
- [x] Physical-context purchase guard for shops and services
- [x] Builder office, template house, named hired crew, and ten construction phases
- [x] Rideable bus loop and subway loop entry points
- [x] Brineling encounter, Catch Ball capture contract, and paid battle
- [x] One substantial Lantern Current minigame and physical prize counter
- [x] Ten-second autosave and save-on-close
- [x] Pages-ready landing and documentation site

## v0.2.0 — Three-city playable transport slice

- [x] Gullhaven and Asterfield as complete, unique playable cities
- [x] Harbourlight Ferry Terminal and Gullhaven Ferry Exchange
- [x] Harbourlight Airfield and Asterfield Skyport
- [x] Route-specific $18 ferry tickets and $60 flight tickets bought and used in person
- [x] Gold Quay, Copper Bell, and Sunline five-stop streetcar loops
- [x] Bus, subway, streetcar, services, construction, battles, creatures, and minigames in every playable city
- [x] Version 2 saves with city progress, ticket inventory, pending journeys, and deterministic v1 migration
- [x] Resumable intercity travel and built-artifact route verification at commit `8ae4188`

## v0.2.0-build.8 — National catalogue and API foundation (shipped infrastructure)

- [x] Deterministic national catalogue with 50 city records
- [x] Deterministic national catalogue with 5,000 enterable-building records (100 per city)
- [x] Deterministic national catalogue with 500 minigame records (10 per city)
- [x] Deterministic national catalogue with 100 creature forms
- [x] Transit, creature, and battle API reconciliation through merge commit `051f48653a359aa55be22f7c8f46d0c983e6757b`
- [x] Preservation of both deterministic service contracts and richer catalogue, roster, stop-by-stop, and system APIs
- [x] Integrated physical commerce and construction services with their in-person boundaries
- [x] Published release `v0.2.0-build.8` with its verified update index, full package, and setup executable

These catalogue and API items are domain/content infrastructure. They do **not** mean that the fifty-city open world, every interior as a playable authored scene, or the full realistic life simulation has shipped. The playable desktop remains Harbourlight, Gullhaven, and Asterfield.

## Remaining playable-world and life-simulation work

- [ ] Turn all 50 catalogue city records into fully playable, navigable cities with authored interiors and city-specific runtime interactions
- [ ] Complete the 5,000-building surface as enterable, authored experiences rather than catalogue records alone
- [ ] Connect the 500 city minigames and 100 creature forms to the corresponding playable-world progression and interfaces
- [ ] Deliver national rail, coach, and expanded regional networks beyond the three-city ferry/flight/streetcar foundation
- [ ] Add full careers, relationships, households, businesses, furnishing, renovation, and construction validation
- [ ] Complete release-grade verification, built-artifact evidence, documentation, and screenshots for the expanded world
