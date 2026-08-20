# Three-city transport network

## Behavior

Wildline Nation 0.2.0 has three complete playable cities:

| City | Bus | Subway | Streetcar | Intercity building |
| --- | --- | --- | --- | --- |
| Harbourlight | Route 7 Bayfront Bus Loop | Blue Loop Subway | Gold Quay Streetcar | Ferry Terminal and Airfield |
| Gullhaven | Breakwater Bus Loop | Green Current Subway | Copper Bell Streetcar | Ferry Exchange |
| Asterfield | Sunstep Bus Loop | Silver Arc Subway | Sunline Streetcar | Skyport |

Every local route has five stops and is covered by the starting national basic transit pass. Local rides never charge money or consume physical tickets.

Intercity travel uses physical buildings and route-specific one-way tickets:

- Harbourlight Ferry Terminal → Gullhaven Ferry Exchange: $18.
- Gullhaven Ferry Exchange → Harbourlight Ferry Terminal: $18.
- Harbourlight Airfield → Asterfield Skyport: $60.
- Asterfield Skyport → Harbourlight Airfield: $60.

Gullhaven and Asterfield do not have a direct connection. A journey between them transfers through Harbourlight.

## Physical ticket flow

1. Enter the exact departure terminal or airport.
2. Purchase a ticket for that route. Money and ticket inventory update together.
3. Board from the same building. A ticket for any other direction or mode is not accepted.
4. The ticket is consumed once and the pending journey is written before animation starts.
5. Arrival changes the current city and clears the pending journey.

An unused ticket survives save/reload. If the game closes after boarding, launch resumes the remaining travel time or completes an already elapsed journey. Repeated launches do not award arrival twice and do not refund an already consumed ticket.

## Rest Stops and city parity

Each city has its own Rest Stop with basement tools/help, ground-floor creature and transit services, universal washrooms, and a second-floor Catch Ball counter. Each city also has a unique grocer, restaurant, salon, builder, arena, minigame centre, creature habitat, construction contract, visual palette, and city-local progress.

## Failure handling

- Insufficient funds create no ticket and deduct no money.
- A purchase or boarding action from the wrong building is rejected without changing state.
- A route without a matching ticket cannot start.
- An active intercity journey prevents another boarding attempt.
- A failure to persist departure restores the consumed ticket in memory and does not start movement.
- Unknown cities, malformed tickets, duplicate ticket identifiers, incompatible pending journeys, and stale active-building identifiers are removed or reset deterministically during load.
- An unrecognized save version starts from the documented Harbourlight default instead of partially applying unknown fields.

## Security and integrity boundaries

The renderer uses a short-lived physical-place interaction token to prevent a map or unrelated panel from completing a purchase. Tickets bind the route, mode, origin, destination, fare paid, identifier, and purchase timestamp. The Electron bridge persists JSON only to the application data directory through unique temporary files and bounded rename retries; it exposes no general filesystem API to the renderer.

This physical-context mechanism is a gameplay integrity boundary, not an anti-tamper or account-security system. Save files are local and user-owned.

## Verification

Focused automated coverage checks:

- complete unique catalogs for all three cities;
- bus, subway, and streetcar presence in every city;
- no direct Gullhaven–Asterfield route;
- exact ferry and flight fares;
- version 1 migration without progress loss;
- wrong-building and insufficient-funds rejection;
- route-specific ticket consumption;
- malformed and duplicate ticket normalization.

The production desktop artifact was driven twice on isolated off-screen desktops. The final run verified one exact page target, all three streetcar panels, ferry travel in both directions, the flight to Asterfield, both intercity arrival states, physical ticket counts immediately after boarding, and inspected real captures at 1440×900.
