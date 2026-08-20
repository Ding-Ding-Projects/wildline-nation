# Wildline Nation

Wildline Nation is an original city-exploration and life-simulation desktop game with creature encounters, licensed battles, public transit, physical stores, and visible home construction. This repository currently contains the `v0.1.0` Harbourlight City vertical slice.

## Run the slice

```powershell
npm install
npm run build
npm start
```

The root scripts also provide a fresh-machine dependency path (`download-dependencies.bat`), a runnable build (`build.bat`), and an unsigned Squirrel.Windows installer build (`build-installer.bat`).

## Play rules in this slice

- Walk to a building to enter its physical interior context.
- The pause chrome only offers Save and Close game.
- Shopping, haircuts, meals, Catch Balls, house contracts, crew hiring, and prizes are physical-place transactions. The map and general GUI cannot buy them.
- The builder office offers the Harbour Courtyard 01 template and hires Jo, Ren, and Akiko for a visible ten-phase construction sequence.
- The Blue Loop subway and Route 7 bus are rideable contextual transit places.
- Brineling is the first original creature, Catch Balls are the capture item, the Civic Circuit Arena pays $85 for a battle contract, and Lantern Current is the first city-exclusive minigame.
- State autosaves every ten real seconds and saves on close.

## Status

This is a rapid vertical slice release. Tests, lint, typecheck, review suites, and capture workflows are intentionally not run in this speed pass; they remain open work for the planned release-grade pass.

## License

Code is GPL-3.0-or-later. Original visual and audio assets are CC-BY-NC-4.0; see [LICENSE-CODE](LICENSE-CODE) and [LICENSE-ASSETS](LICENSE-ASSETS).

The public landing and documentation site is designed for `https://ding-ding-projects.github.io/wildline-nation/` when Pages is enabled.
