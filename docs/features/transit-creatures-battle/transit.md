# Transit network

## Behavior

`TransitService` owns stops, bus and subway routes, ordered stop sequences, operating clocks,
headway windows, vehicle trips, capacity, boarding and alighting, transfers, passes, cash fares,
and disruptions. `getStatus` reports the current service state and the exact active disruptions for
one route. `dispatchTrip` creates one deterministic trip for the next scheduled departure;
dispatching the same route/date/departure twice is rejected. `board` validates the rider's fare,
capacity, origin, destination, and current stop. `advanceTrip` moves a vehicle one ordered stop,
applies an active disruption delay, and completes journeys whose destination is reached.

## Configuration

Provide unique `TransitStop` records and `TransitRoute` records whose `stopIds` refer to those
stops. Headway windows use minutes after midnight and must not overlap semantically; route capacity,
fare, operating range, and window headways are bounded positive integers. Inject `now` when a host
needs reproducible snapshot timestamps. Passes identify a holder, an epoch validity range, modes,
and optional zones; the service does not infer entitlement from a display label.

## Failure modes

The service returns `TransitDomainError` values for unknown routes/stops/trips/passes, invalid
clocks or fares, missing capacity, invalid destinations, duplicate trips, stale or disrupted
vehicle state, and malformed snapshots. A rejected fare never boards a rider, and a full vehicle
never silently exceeds its configured capacity.

## Integrity and security boundaries

Transit is local domain logic. It does not call a payment provider, fetch schedules, or trust a
renderer-provided entitlement. Callers must validate payment at their own physical transaction
boundary and persist snapshots with an atomic, trusted store. Snapshot reload validates route
membership, trip uniqueness, capacity, and pass dates before replacing in-memory state.

## Integration and verification

Use `import { TransitService } from './src/systems/transit'`. Map a UI service clock to the game's
local calendar and call `getStatus` for display; do not derive the next vehicle from animation time.
This rapid pass ran no tests or captures. A release-grade pass should verify all boarding, alighting,
capacity, fare, transfer, disruption, clock, and snapshot error paths against the built artifact.

## Suggested articles

- [Physical places](../physical-places.md)
- [Commerce integration](../commerce-construction/commerce.md)
