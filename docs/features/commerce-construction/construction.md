# Construction lifecycle

`ConstructionService` models a single building project from an in-person builder-office visit through physical-site inspection and handover. It does not charge the construction quote; the adapter should first settle the office contract through `CommerceService`, then begin the project only after that receipt exists.

## Deterministic service setup

```ts
import { ConstructionService } from '../../../src/systems/construction';

const construction = new ConstructionService({
  templates: DEFAULT_TEMPLATES,
  workers: DEFAULT_WORKERS,
  allowedOfficeIds: ['northline-builders'],
  now: () => gameClock.isoTimestamp,
  idFactory: (prefix) => `${prefix}-${saveSequence.next()}`,
});
```

Inject `now` and `idFactory` for deterministic saves and replays. The default catalog includes `Harbour Courtyard 01` and named workers Jo, Ren, Akiko, and Mara. Every worker retains a role, timezone, weekly schedule, and optional unavailable dates.

## Builder-office-only actions

`beginProject()`, `selectTemplate()`, and `hireCrew()` require an unexpired `builder-office` context whose office identifier is allowlisted. The context includes a non-empty interaction and actor identifier plus observed and expiry timestamps.

`remote-gui` and `map` return `builder-office-required`. A remote progress view may call `getState()` and `getVisiblePhases()`, but it cannot choose a template, hire a worker, or create the contract.

The normal office call order is:

1. `beginProject(projectId, lot, officeContext)`;
2. `selectTemplate(templateId, officeContext)`; and
3. `hireCrew(workerIds, officeContext)`.

Project creation validates lot identifiers, finite coordinates and dimensions, supported area and slope, zoning, road access, utilities, occupancy, and easements. Template selection adds footprint, minimum area, allowed zoning, and required-utility checks. Crew hiring requires unique registered workers and the template's exact crew size.

## Ten visible phases

`getVisiblePhases()` always returns the complete ordered sequence, including pending phases:

1. Survey & fencing
2. Foundation
3. Frame
4. Roof & enclosure
5. Windows & doors
6. Utility rough-in
7. Insulation
8. Interior finish
9. Exterior finish
10. Inspection & handover

Each record includes a stable identifier, zero-based index, workday duration, `pending`/`active`/`complete` state, and progress from 0 to 1. The renderer should display all ten records instead of collapsing construction into a single timer.

## Workdays, schedules, delays, pause, and resume

Advance with an explicit ISO date whenever possible:

```ts
const report = construction.advanceWorkday('2026-08-21');
```

The report states whether work advanced, whether a delay consumed the day, why, which phase completed, the current state, and all ten visible phases.

`addDelay(reason, workdays, source)` records weather, schedule, inspection, user, or other delays. A recorded delay consumes future workdays before phase progress continues. If a named worker is unavailable on the supplied date, `advanceWorkday()` records a one-day schedule delay and returns a successful report with `advanced: false` and `delayed: true`.

`pause()` stops advancement. `resume()` returns to `delayed` while delay days remain and otherwise returns to `active`. A paused advancement request returns a domain failure without changing state.

## Save and reload

`saveSnapshot()` returns a version-1 snapshot containing the complete state and save timestamp. `reloadSnapshot()` validates supported schema versions, calendar date, phase cursor and progress, and required project records before replacing live state. `serializeSnapshot()` and `parseSnapshot()` provide JSON boundaries; malformed JSON returns `snapshot-invalid` without changing state.

The state includes the project, lot and validation result, selected template, named crew and schedules, phase cursor, calendar date, elapsed workdays, pending and historical delays, inspection, handover, and cancellation reason.

## Cancellation

`cancel(reason)` requires a non-empty reason and records the terminal cancelled state. A completed handover cannot be cancelled. The domain service deliberately does not compute a refund; the adapter should apply any contract-specific refund as a separate physical commerce transaction with its own receipt.

## Inspection and handover

Inspection and handover require an unexpired `construction-site` context whose lot identifier matches the project. Remote, map, office, and mismatched-lot contexts cannot complete either action.

After all ten phases are complete, `inspect()` records checks for lot validity, the ten-phase structure, utilities, an accessible route, and retained named crew records. A failed inspection is a successful recorded inspection result with `passed: false`, not an exception. It returns the project to active state and blocks handover until a later inspection passes.

After a passing inspection, `handover(recipientId, siteContext)` records the recipient, lot, template, timestamp, and exact ten-phase count, then marks the project completed.

## Failure and mutation contract

Expected refusals return `ServiceResult<T, ConstructionDomainError>`. No public method intentionally changes state before returning `ok: false`.

Two successful calls can record a state change without advancing the project:

- an unavailable named schedule records a delay; and
- a failed inspection stores its report.

An externally supplied clock or identifier callback may throw; adapters should keep those callbacks deterministic and side-effect free.

## Security and integrity boundary

The construction service enforces game-domain rules but does not prove real-world identity, location, or payment. Create office and site contexts through a trusted scene adapter, not from arbitrary renderer input. Keep receipt linking, quote payment, save writes, and any refund in the application's privileged persistence and transaction layer.

The service performs no network request, filesystem access, telemetry, analytics, or dynamic code execution.

## Verification

No tests, type checking, build, review workflow, or screen capture ran in this task. The integration lane must exercise office-context rejection, every lot rule, exact crew size, all ten visible phases, schedule and explicit delays, pause/resume, snapshot round trips, cancellation, failed and passing inspection, mismatched sites, and handover.

## Suggested articles

- [Integration API](integration.md)
- [Physical commerce](commerce.md)
- [Commerce and construction systems](README.md)

