# Paid battle contracts

## Behavior

`BattleService` validates two named teams and starts a turn-based battle from a paid contract.
Actions are `strike`, `guard`, and `recover`; each turn validates the contract participant, active
side, living unit, move cooldown, and living target. Strike damage uses unit attack, move power,
and target defense; accuracy and damage use injected randomness and are recorded in the action log.
Guarding changes unit status, while cooldowns decrement after each action. A team defeat resolves a
win or loss, and a 100-turn limit resolves a draw. `settle` pays the contract reward to the winning
owner exactly once; draws pay no money. Battle rewards are money only and never gate map or route
access.

## Configuration

Teams contain one to six units with bounded health, attack, defense, and at least one move. A
contract identifies arena and owners, a non-negative cent reward, currency, expiry, and the literal
`mapAccessRequired: false` policy. Inject `now`, `random`, and `idFactory` for deterministic replay.

## Failure modes

`BattleDomainError` covers malformed or expired contracts, invalid or empty teams, unknown actors,
wrong turn order, unavailable units, invalid moves or targets, active-battle settlement, duplicate
contracts, and malformed snapshots. Repeated settlement returns the existing settlement instead of
paying twice.

## Integrity and security boundaries

This service records a reward obligation; it does not transfer real money, unlock a map, or call an
external payment service. A trusted host should apply the returned settlement through its own
idempotent ledger. Snapshot reload verifies battle identity, map-access policy, turn bounds, team
presence, and settlement uniqueness. The renderer must not be allowed to invent contract owners or
reward amounts.

## Integration and verification

Use `import { BattleService } from './src/systems/battle'`. Persist the snapshot after every
meaningful action if crash recovery is required. This rapid pass ran no tests or captures. A
release-grade pass should verify all action outcomes, cooldowns, draw limits, contract expiry,
exactly-once settlement, snapshot reload, and the invariant that no battle result changes map access.

## Suggested articles

- [Creature catalogue and capture](./creatures.md)
- [Commerce integration](../commerce-construction/commerce.md)
- [Physical places](../physical-places.md)
