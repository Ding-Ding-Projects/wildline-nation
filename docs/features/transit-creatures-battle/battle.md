# Paid turn-based battle contracts

## Behavior

The battle module treats licensed exhibitions as paid city work. A contract names its physical venue, opponent team, maximum turn count, repeatability, currency, and payout. `startContract` accepts a contract only while the caller supplies a current physical venue context for that arena. Winning creates one stored payout receipt; repeating a read or restoring a completed battle cannot issue the same receipt again.

Each active team submits one intent per turn. An intent selects an active fighter, an opposing target, a technique, and one of three stances:

- `surge` increases attack and slightly increases initiative while reducing defence.
- `brace` increases defence and momentum gain while reducing attack.
- `drift` emphasizes initiative and balanced damage.

The system resolves both intents in deterministic initiative order. Strike damage is calculated from technique power, fighter power, both stances, resilience, and an optional ready team-combo multiplier. Support techniques build momentum without dealing damage. No random source, timer, renderer, or network request participates in turn resolution.

## Momentum and interrupts

Team momentum is an integer from 0 through 100. Techniques and stances add momentum; interrupts and team combos spend it. The engine rejects an action when its team cannot pay the declared cost rather than allowing a negative balance.

Interrupt techniques are submitted separately and point at one opposing turn intent. Their trigger must match the targeted action: an opposing strike, an opposing combo, or a stance change. A valid interrupt resolves before the target intent, spends momentum, deals its bounded counter damage, and cancels that intent for the turn. At most the first valid interrupt in priority order cancels a given intent.

## Team-combo-ready data

`comboReadiness` reports every combo with its required tags, currently matched tags, living contributor ids, minimum contributor count, current momentum, cost, and ready state. A combo is ready only when all tags are represented by enough living contributors and the team can pay its momentum cost.

The creature subsystem supplies `BattleRosterProjection` through `toBattleRosterProjection`. Pass those projections to `createBattleTeamFromRoster(harbourlightBattleCatalog, projections)`. The adapter applies the battle profile for each species, retains stable roster ids, orders assigned team positions first, carries deduplicated combo tags, and applies explicit condition modifiers. The returned `BattleTeamSeed` can be passed directly to `startContract`.

## Integration

Import the subsystem from `src/systems/battle/index.ts`:

```ts
const battle = new BattleSystem(harbourlightBattleCatalog, save.battle);
const playerTeam = createBattleTeamFromRoster(
  harbourlightBattleCatalog,
  roster.members.map(toBattleRosterProjection),
);
const active = battle.startContract({
  contractId: 'civic-circuit-opening',
  playerTeam,
  venue: arenaContext,
  nowMs: Date.now(),
  occurredAt: new Date().toISOString(),
});
```

Persist `battle.snapshot()` after a contract starts and after every turn. Add `BattleTurnResolution.payout.amount` to the city ledger only when a new payout receipt is returned, and retain the receipt id as the idempotency key. Render events from the returned turn resolution rather than duplicating combat rules in the UI.

## Persistence and failure modes

`BattleSystemState` is versioned at `1` and contains only JSON-compatible data. Restore validation checks battle, team, fighter, technique, contract, momentum, vitality, and payout relationships. Invalid state throws `BattleDomainError` with code `INVALID_STATE`; callers should retain the last valid save instead of partially applying a candidate.

Other explicit failures include an expired or incorrect arena context, unknown contract or combatant, duplicate or missing team intent, unsupported technique, mismatched interrupt trigger, insufficient momentum, an unready combo, or an already completed battle. Contracts stop at their declared maximum turn count and resolve as a draw instead of growing history indefinitely.

## Geography boundary

Every `BattleTurnResolution` contains `geographyUnlocks: []`. The battle API has no route, district, building, or map-unlock mutation. Contracts pay money and record battle results; they do not gate exploration. A caller that wants to reveal geography must do so through a separate city rule and must not infer it from battle completion.

## Security and validation

The module validates catalogue ids, numeric bounds, team sizes, technique ownership, turn references, venue expiry, state relationships, and payout uniqueness. It performs no file access, networking, command execution, account operation, or real-money transaction. The payout is an in-world ledger instruction in Canadian dollars. Bound the save payload before parsing; restoration validates semantic structure but is not a replacement for an input byte limit.

## Verification status

The initial ultra-speed implementation intentionally deferred tests, type checking, lint, security and accessibility checks, built-artifact interaction, review suites, and captures. Those checks must be added and run in the subsequent release-grade verification pass before this module is treated as independently verified.

## Suggested articles

- [Creature habitats and capture](./creatures.md)
- [Stop-by-stop transit system](./transit.md)
- [Subsystem integration overview](./README.md)
