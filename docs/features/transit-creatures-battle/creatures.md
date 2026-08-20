# Creature catalogue and capture

## Behavior

`CreatureService` keeps an original species catalogue, owner-scoped encounters, Catch Ball
inventories, and captured creature instances. `createEncounter` only permits a species in its
declared habitat. `observe` raises stability without bypassing encounter ownership. `capture`
consumes exactly one ball, computes a bounded probability from species difficulty, stability, and
ball bonus, and uses an injected random value when supplied. Five failed attempts end an encounter
as fled. Captured instance identifiers and ownership are unique, so a duplicate capture never
overwrites a previously owned creature.

## Configuration

Species declare base power/resilience, element, difficulty in `[0,1]`, and habitats. Ball types
declare a bounded bonus and maximum stack. Inject `random` and `idFactory` for deterministic
simulations or replay tools. Inventory revisions increment on every grant or capture consumption.

## Failure modes

`CreatureDomainError` reports unknown species or balls, invalid habitats, owners, quantities, empty
inventory, ended encounters, ownership mismatch, duplicate instances, and malformed snapshots.
Capture outcomes distinguish a failed attempt from a domain failure; callers can show the remaining
inventory and probability without guessing.

## Integrity and security boundaries

The service does not generate real-world odds from a network, accept unbounded quantities, or expose
another owner's creatures. Randomness is injected at the domain boundary and clamped to a safe
`[0,1)` interval. Snapshot reload checks species references, duplicate instance IDs, ball references,
and non-negative quantities before replacing state.

## Integration and verification

Use `import { CreatureService } from './src/systems/creatures'`. Save `saveSnapshot()` alongside the
game state and restore it only after schema validation. This rapid pass ran no tests or captures. A
release-grade pass should exercise deterministic rolls, five-attempt fleeing, duplicate-safe
ownership, inventory revisions, malformed snapshots, and restart persistence.

## Suggested articles

- [Paid battle contracts](./battle.md)
- [Commerce integration](../commerce-construction/commerce.md)
- [Vertical slice](../vertical-slice.md)
