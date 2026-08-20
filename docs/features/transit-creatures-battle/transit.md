# Stop-by-stop transit system

## Behavior

The transit module models Harbourlight's Route 7 bus loop and Blue Loop subway as physical journeys. A rider boards a specific vehicle at its current stop, remains aboard while the vehicle departs and arrives one segment at a time, and may alight whenever that vehicle is stopped. The trip record retains every visited stop, the intended destination when one was selected, and whether the rider completed the planned journey or left early.

Schedules use a service day plus minutes from the start of that service day. Minutes may exceed 1,440 so late-night service can cross midnight without pretending it belongs to a new daytime schedule. Each route has one or more windows with its own frequency. `departuresFrom` expands those windows into exact scheduled departures for one stop and bounded time horizon.

Operational vehicle state records its route, current stop index, phase, capacity, passenger count, delay, service clock, next arrival time, and update timestamp. `board`, `departNextStop`, `arriveNextStop`, `alight`, `cancelBoarding`, and `updateVehicle` are explicit transitions; the map should never convert a ride into a single teleport.

## Integration

Import `TransitSystem` and `harbourlightTransitCatalog` from `src/systems/transit/index.ts`. Construct one system for the active save:

```ts
const transit = new TransitSystem(harbourlightTransitCatalog, save.transit);
```

Persist `transit.snapshot()` in the save file after every accepted transition. Render a trip from `TransitTripState.visitedStopIds`, `currentStopId`, `nextStopId`, and `status`. Render live vehicle information from `getVehicle`, and timetable information from `departuresFrom`. The UI supplies timestamps and service times so the domain layer remains independent from timers and rendering frameworks.

## Persistence and migration

`TransitSystemState` is versioned at `1` and contains only JSON-compatible data. Restoration validates that every catalogue vehicle exists exactly once, route and stop references remain valid, capacity is consistent, active travel has an arrival time, and every trip belongs to its declared vehicle and route. Invalid data throws `TransitDomainError` with code `INVALID_STATE`; callers should retain the last valid save and present a recovery action rather than partially applying the candidate.

## Failure modes

- Boarding fails when the vehicle is moving, at another stop, full, unknown, or the rider already has an active trip.
- Departure and arrival reject out-of-order transitions and backward service times.
- Arrival before the scheduled vehicle arrival is rejected as `TOO_EARLY`.
- A destination must be another stop on the same route.
- Capacity may not be reduced below the current passenger count.
- Transit never returns a geography unlock. Routes are available independently of battle or creature progress.

## Security and validation

All catalogue ids, references, durations, capacities, schedules, and state references are validated before use. Caller-provided ids and timestamps are treated as data. The module performs no file access, networking, dynamic code execution, payment, or account operation. Bound the persisted state at the save-file boundary before parsing it; the module validates structure and relationships but does not replace an input byte limit.

## Verification status

The initial ultra-speed implementation intentionally deferred tests, type checking, lint, built-artifact interaction, and captures. Those checks must be added and run in the subsequent release-grade verification pass before this module is treated as independently verified.

## Suggested articles

- [Creature habitats and capture](./creatures.md)
- [Paid turn-based battle contracts](./battle.md)
- [Subsystem integration overview](./README.md)
