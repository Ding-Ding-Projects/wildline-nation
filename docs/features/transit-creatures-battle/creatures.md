# Creatures, habitats, and capture

The creatures subsystem provides original species, visible habitats, temperament observation, a deterministic stability window, Catch Ball inventory handling, capture resolution, and a persistent roster. It is a pure TypeScript domain module under `src/systems/creatures/`; it does not import the renderer, Electron bridge, or shared application entrypoints.

## Behavior

The catalog currently contains three original species: Brineling in Tideglass Pools, Reedhorn in Reedfen Marsh, and Duskwisp on Moonlit Terrace. Each species declares traits, a temperament profile, preferred habitats, and a capture difficulty. Habitats declare their own baseline stability and preferred observation approaches.

Observation is explicit. A caller supplies the species, habitat, timestamp, and approach (`quiet`, `steady`, `patient`, or `rushed`). The result records the creature's state, confidence, stability bonus, and traits. A rushed approach can produce a startled or fleeing result; a patient approach generally produces more confidence. An observation for a species that does not belong to the habitat is rejected.

Stability windows are deterministic and time-bounded. `createStabilityWindow` accepts a caller-owned seed, opening time, and bounded duration. `readStabilityWindow` derives the current percentage from those values and the requested timestamp; it never reads wall-clock time or random state. Once the duration expires, capture is closed even if the last reading was favorable.

Catch Balls are immutable inventory values. Adding, consuming, and returning a Catch Ball returns a new inventory and never mutates its input. Capture resolution accepts the stability window and current time, derives the live reading inside the domain, then checks the habitat, observation, attempt sequence, and inventory before consuming one Catch Ball. A stale open reading therefore cannot be replayed after its window closes. A successful or missed throw consumes a ball; invalid observations, an expired window, and an empty inventory do not consume one.

Capture scoring combines stability, observation confidence, the observation bonus, species difficulty, and a deterministic attempt roll. A captured result includes a stable roster member identifier derived from the species, habitat, and caller-provided attempt identifier. This keeps later battle integration independent of the renderer while preserving an auditable outcome.

## Integration

Import from `src/systems/creatures/index.ts` in a future encounter controller. The subsystem's public exports are:

- `CREATURE_SPECIES`, `CREATURE_HABITATS`, and catalog lookup helpers;
- `observeCreature` for temperament observation;
- `createStabilityWindow`, `readStabilityWindow`, and `isStabilityWindowOpen`;
- `createCatchBallInventory`, `createCatchBallAttempt`, `addCatchBalls`, `consumeCatchBall`, `returnCatchBall`, and `canThrowCatchBall`;
- `resolveCapture` for deterministic capture outcomes; and
- roster creation, validation, snapshot/restore, immutable member updates, and JSON serialization helpers.

The battle adapter can consume `BattleRosterProjection` values from `toBattleRosterProjection`. Each projection contains exactly `rosterMemberId`, `speciesId`, `condition`, `teamPosition`, and deduplicated `comboTags`. Combo tags preserve catalog-defined species traits first, then add the member's mutable tags without mutating the roster.

Roster members expose a stable `memberId`, `speciesId`, `habitatId`, traits, free-form tags, condition, capture time, and nullable team position. These fields are intended for a later battle adapter and can be serialized without class instances, dates, functions, or renderer state.

## Persistence and validation

`serializeRoster` writes the versioned roster shape as JSON. `deserializeRoster` parses and validates the complete payload, including schema version, revision, member identifiers, duplicate IDs, known species and habitats, capture timestamps, tags, and unique team positions. The parser rejects malformed JSON and serialized payloads over 2 MB. `snapshotRoster` and `restoreRoster` clone their values and validate before returning them, so callers cannot mutate a prior snapshot through a shared array reference.

Roster mutations return a new state with an incremented revision. Team positions are zero-based and unique; `null` means that a member is not assigned to the active team. A restore is all-or-nothing: malformed or semantically invalid input throws before any caller-owned state is changed.

## Failure and security boundaries

The subsystem fails closed for unknown species or habitats, mismatched observations, invalid timestamps, expired stability windows, missing Catch Balls, duplicate roster identifiers, unsupported schemas, duplicate team positions, oversized JSON, and malformed JSON. It does not persist secrets, contact a network service, execute a command, access the filesystem, or accept arbitrary code. The caller remains responsible for atomic file replacement, user-facing error presentation, and any authentication or authorization around a save location.

The deterministic seed and attempt identifier should be generated by the owning encounter flow and treated as ordinary replay metadata. Do not place credentials, access tokens, or private user data in them. The roster is bounded to 1,000 members, 64 free-form tags per member, and 64 characters per tag; a product-level import path should still enforce its byte limit before invoking the parser if it accepts untrusted input.

## Deferred verification

This speed-pass implementation intentionally did not run tests, lint, type checking, review workflows, builds, screenshots, or other verification suites. A later release-grade pass must exercise deterministic replay, boundary timestamps, all capture outcomes, malformed and oversized roster payloads, duplicate identifiers and positions, immutable snapshot behavior, and integration with the built encounter surface.
