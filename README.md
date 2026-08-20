# Wildline Nation

Wildline Nation is an original city-exploration and life-simulation desktop game with creature encounters, licensed battles, public transit, physical stores, and visible home construction. The currently playable desktop slice is Harbourlight, Gullhaven, and Asterfield. The project also ships a deterministic national catalogue and reusable transit, creature, battle, commerce, and construction systems that prepare the larger world; that catalogue is infrastructure, not a claim that the full fifty-city open world is already playable.

## Current release

The current published release is [`v0.2.0-build.8`](https://github.com/Ding-Ding-Projects/wildline-nation/releases/tag/v0.2.0-build.8), built from commit `051f48653a359aa55be22f7c8f46d0c983e6757b`. It is available through the [live landing and documentation site](https://ding-ding-projects.github.io/wildline-nation/) and the release page.

The release publication proof downloaded and verified all three release assets, including the update index:

| Asset | Size | SHA-256 |
| --- | ---: | --- |
| `RELEASES` | 86 bytes | `396b45507a45a5717f06fbfb2df284dfe2f417eb8d9b08576a8a6c93408fa032` |
| `wildline-nation-0.2.0-full.nupkg` | 238,517,779 bytes | `d9ceb98a0ef1760434e5511be8e9c1637c465f776f2fb6860c26913e9fb52c7b` |
| `Wildline-Nation-Setup-0.2.0.exe` | 239,376,896 bytes | `499cd6ac06406aa200033bf44adc3445020df2408c909e39b1ea702d4404c3f3` |

## Run the playable slice

```powershell
npm install
npm run build
npm start
```

The root scripts also provide a fresh-machine dependency path (`download-dependencies.bat`), a runnable build (`build.bat`), and an unsigned Squirrel.Windows installer build (`build-installer.bat`).

## Play rules

- Walk to a building to enter its physical interior context.
- The top bar only offers Save and Close game actions.
- Shopping, haircuts, meals, Catch Balls, house contracts, crew hiring, and prizes are physical-place transactions. The map and general GUI cannot buy them.
- Each playable city has its own Rest Stop, grocer, restaurant, salon, builder, arena, minigame centre, bus, subway, streetcar, creature, construction contract, and local progress.
- Harbourlight’s Gold Quay Line, Gullhaven’s Copper Bell Line, and Asterfield’s Sunline Loop are five-stop streetcar routes covered by the national basic transit pass.
- Ferries connect Harbourlight and Gullhaven for $18 one-way through physical ferry buildings. Flights connect Harbourlight and Asterfield for $60 one-way through physical airport buildings.
- Intercity tickets are route-specific physical inventory: buy one inside the correct departure building, then board there. Gullhaven and Asterfield transfer through Harbourlight rather than using a direct route.
- Intercity departures are saved before movement. Closing during a ferry or flight safely resumes or completes the journey on the next launch.
- Version 1 saves migrate to version 2 in Harbourlight while preserving money, Catch Balls, captured creatures, construction progress, minigame score, and timestamps.
- State autosaves every ten real seconds and saves on close.

## National catalogue and systems foundation

The deterministic national catalogue now ships:

- 50 city records;
- 5,000 enterable-building records, 100 per city;
- 500 minigame records, 10 per city; and
- 100 creature forms.

The transit, creature, and battle API reconciliation keeps both deterministic service contracts and the richer catalogue, roster, stop-by-stop, and system APIs. Physical commerce and construction services are integrated as well. These are domain/content systems and reusable product infrastructure. They are **not** yet the fully playable fifty-city open world, every enterable interior as a navigable authored scene, or a complete realistic life simulation. The desktop play surface remains the three-city Harbourlight/Gullhaven/Asterfield slice.

## Verification boundaries

The earlier intercity milestone at commit [`8ae4188`](https://github.com/Ding-Ding-Projects/wildline-nation/commit/8ae418800203111141a1eee99af0851f86f9de8a) is the evidence for the playable transport slice: seven focused tests passed, and built-artifact journeys verified Harbourlight → Gullhaven → Harbourlight → Asterfield, the three streetcar panels, both physical-ticket flows, ticket consumption, and city arrivals.

The later rapid pass that produced `v0.2.0-build.8` deliberately ran no unit, integration, end-to-end, lint, typecheck, accessibility, security, review, or smoke suites, and took no screenshots. Its publication proof is the downloaded three-asset release verification above. Those boundaries are kept separate so the rapid publication record is not mistaken for fresh runtime or visual evidence.

## License

Code is GPL-3.0-or-later. Original visual and audio assets are CC-BY-NC-4.0; see [LICENSE-CODE](LICENSE-CODE) and [LICENSE-ASSETS](LICENSE-ASSETS).
