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
