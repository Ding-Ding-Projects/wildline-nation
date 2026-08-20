## Deterministic service API
# Transit, creatures, and paid battles

This category documents the deterministic domain services added for the city slice. They are
framework-neutral TypeScript services: a renderer or save layer can consume their typed results
without importing UI state or network clients.

## Articles

- [Transit network](./transit.md) — routes, schedules, capacity, fares, disruptions, and journeys.
- [Creature catalogue and capture](./creatures.md) — encounters, Catch Balls, deterministic capture, and ownership.
- [Paid battle contracts](./battle.md) — teams, turns, outcomes, and exactly-once money settlement.

## Integration and verification

Import the relevant public index from `src/systems/transit`, `src/systems/creatures`, or
`src/systems/battle`. Each service accepts injected time and randomness, returns a typed success or
domain-error result, and serializes a schema-versioned snapshot. Consumers should persist snapshots
atomically and treat an error result as a user-visible, recoverable failure rather than throwing it
through the renderer.

This rapid delivery pass intentionally ran no tests, lint, typecheck, review suites, accessibility
or security suites, smoke suites, or captures. The next release-grade pass must exercise the public
APIs against the built artifact and inspect snapshot round trips and failure branches.

## Suggested articles

- [Physical places](../physical-places.md) for the in-person context rules around commerce and construction.
- [Commerce and construction integration](../commerce-construction/README.md) for adjacent money and place services.
- [Vertical slice](../vertical-slice.md) for the end-to-end city flow.
## Original branch systems API
# Transit, creatures, and battle systems

This folder documents three framework-neutral TypeScript subsystems for Wildline Nation. They are production domain modules and do not modify the existing renderer entrypoint. Integration code can adopt them incrementally while save migrations and UI work remain explicit.

## Articles

- [Stop-by-stop transit system](./transit.md) — schedules, live vehicle state, boarding, each route segment, and alighting.
- [Creature habitats and capture](./creatures.md) — original species, temperament observation, stability windows, Catch Ball attempts, and persistent rosters.
- [Paid turn-based battle contracts](./battle.md) — stances, momentum, interrupts, team combos, venue contracts, and one-time payouts.

## Shared integration boundary

Each subsystem exposes an `index.ts` entrypoint and a versioned JSON-compatible snapshot. The application owns the outer save document, timestamps, rendering, notifications, and persistence transport. The domain modules validate state and return explicit events or results without touching the DOM, filesystem, network, or account data.

The creature roster connects to battle through `toBattleRosterProjection` and `createBattleTeamFromRoster`. Transit remains independent: battles never unlock routes or locations, and capture never changes service schedules. This keeps exploration open and prevents a paid activity from becoming a geography key.

## Deferred integration

The current scoped change intentionally does not edit shared entrypoints, manifests, root documentation, release configuration, or renderer code. A later integration change must add versioned outer-save fields for the three subsystem snapshots, adapt the existing UI to their events, and migrate older save data without discarding it.

## Verification status

The initial ultra-speed pass intentionally ran no tests, type checking, lint, review suites, security or accessibility checks, built-artifact interaction, or captures. The source and documentation are implemented but unverified until the subsequent release-grade pass supplies those results.
