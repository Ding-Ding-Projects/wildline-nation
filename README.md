# Wildline Nation

Wildline Nation is an original city-exploration and life-simulation desktop game with creature encounters, licensed battles, public transit, physical stores, and visible home construction. Version `0.2.0` expands the playable world to Harbourlight, Gullhaven, and Asterfield.

## Run the slice

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
- Each city has its own Rest Stop, grocer, restaurant, salon, builder, arena, minigame centre, bus, subway, streetcar, creature, construction contract, and local progress.
- Harbourlight’s Gold Quay Line, Gullhaven’s Copper Bell Line, and Asterfield’s Sunline Loop are five-stop streetcar routes covered by the national basic transit pass.
- Ferries connect Harbourlight and Gullhaven for $18 one-way through physical ferry buildings. Flights connect Harbourlight and Asterfield for $60 one-way through physical airport buildings.
- Intercity tickets are route-specific physical inventory: buy one inside the correct departure building, then board there. Gullhaven and Asterfield transfer through Harbourlight rather than using a direct route.
- Intercity departures are saved before movement. Closing during a ferry or flight safely resumes or completes the journey on the next launch.
- Version 1 saves migrate to version 2 in Harbourlight while preserving money, Catch Balls, captured creatures, construction progress, minigame score, and timestamps.
- State autosaves every ten real seconds and saves on close.

## Status

The focused transit/save suite contains six passing tests. The production Vite bundle builds successfully, and a real headless desktop artifact completed Harbourlight → Gullhaven → Harbourlight → Asterfield with all three streetcar panels, both physical-ticket flows, consumed-ticket badges, and city arrivals verified.

## License

Code is GPL-3.0-or-later. Original visual and audio assets are CC-BY-NC-4.0; see [LICENSE-CODE](LICENSE-CODE) and [LICENSE-ASSETS](LICENSE-ASSETS).

The public landing and documentation site is designed for `https://ding-ding-projects.github.io/wildline-nation/` when Pages is enabled.
