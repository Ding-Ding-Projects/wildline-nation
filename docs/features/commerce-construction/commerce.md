# Physical commerce

`CommerceService` is the authoritative in-memory transaction model for store and service-place purchases. It owns account balances, inventory quantities and revisions, reservations, checkout queues, terminal request identifiers, and receipts. Its versioned snapshot contains every mutable value needed for save and reload.

## Configure establishments

Create the service with at least one `EstablishmentDefinition`. Each definition supplies:

- a stable establishment and physical place identifier;
- a currency and integer tax rate in basis points;
- the maximum interaction distance accepted by a physical counter or machine;
- local weekly opening windows and a timezone label;
- one or more named counters with a staff name for receipts; and
- revisioned stock with integer-cent prices and non-negative quantities.

The caller converts the game clock into `CommerceClock.dayOfWeek`, `minuteOfDay`, `localDate`, and `epochMs`. The service does not guess a timezone from the host computer. A window whose closing minute is earlier than its opening minute continues into the next local day.

Invalid definitions are programmer configuration errors and cause the constructor to throw before state is created. Expected player and runtime refusals use `CommerceResult<T>` and a typed `CommerceDomainError` instead.

## Open an account and display stock

```ts
import { CommerceService } from '../../../src/systems/commerce';

const commerce = new CommerceService({
  establishments,
  now: () => gameClock.epochMs,
});

commerce.registerAccount('player-1', 24_000);
const stock = commerce.getStock('moss-market-grocer');
```

Money is represented in integer cents. Credits require a positive amount; purchases and tax calculations fail rather than exceeding JavaScript's safe integer range.

## Require physical context

Both queue entry and settlement require `PhysicalTransactionContext` with all of the following:

- `channel` is `physical-counter` or `physical-machine`;
- actor, establishment, place, and counter identifiers match the request and definition;
- a non-empty interaction identifier belongs to the current visit;
- entry and expiry timestamps contain the supplied game-clock timestamp; and
- the actor remains within the configured transaction distance.

`remote-gui` returns `remote-purchase-forbidden`. `map-overlay`, expired visits, mismatched counters, and out-of-range actors return a physical-context failure. An inventory panel may call read-only methods such as `getStock()`, but it cannot manufacture an accepted transaction context.

## Queue a purchase

The UI reads current stock and includes each line's `expectedStockRevision`:

```ts
const queued = commerce.enqueuePurchase(
  {
    requestId: 'grocer-visit-42-order-1',
    actorId: 'player-1',
    establishmentId: 'moss-market-grocer',
    counterId: 'checkout-1',
    lines: [{ sku: 'local-lunch', quantity: 1, expectedStockRevision: 3 }],
  },
  physicalCounterContext,
  clock,
);
```

The service validates the complete request before it changes state. A successful enqueue reserves each quantity, advances its stock revision, and returns a stable ticket with the FIFO position and customers-ahead count. It does not debit the account or issue a receipt yet.

Request identifiers are permanent idempotency keys across queued, completed, cancelled, and rejected outcomes. Reusing one returns `duplicate-request`, preventing a repeated action from charging twice.

## Serve the queue head

```ts
const settlement = commerce.serveNext(
  'moss-market-grocer',
  'checkout-1',
  physicalCounterContext,
  clock,
);
```

Settlement requires the same unexpired physical interaction and rechecks store hours. A successful settlement debits the account, converts reservations into sold stock, advances account and stock revisions, removes the queue head, and records a receipt.

The receipt records stable identifiers, place, establishment, counter, cashier, date and timestamp, currency, subtotal, tax, total, account revision, and each line's observed and final stock revisions. `getReceipt()` and `listReceipts()` return copies so renderer code cannot mutate the ledger.

If the account balance changed or a saved reservation cannot be reconciled, service returns an `ok: true` rejected settlement, releases the reservation, advances stock revisions, and permanently closes that request identifier. This is a recorded queue outcome rather than an API failure. Invalid context or a closed store returns `ok: false` without removing the queue head.

The purchasing actor may call `cancelQueuedPurchase()` with a reason. Cancellation can be offered outside the store because it reverses a pending reservation rather than completing a purchase; it never debits money or issues a receipt.

## Stock adjustments

`adjustStock()` is the inventory intake and correction boundary. It requires the currently observed stock revision, accepts a non-zero integer delta, and rejects a result that would make on-hand stock negative or smaller than active reservations. A successful adjustment advances the revision.

## Save and reload

Use `saveSnapshot()` or `serializeSnapshot()` as part of the game's normal save transaction. Restore through `reloadSnapshot()`, `parseSnapshot()`, or `CommerceService.fromSnapshot()`.

Restore validates the schema, account and stock bounds, configuration membership, unique request and ticket identifiers, queue ordering, request totals, and the exact equality between queued reservations and aggregate reserved stock. Validation builds replacement state separately and changes the live service only after the snapshot passes.

## Failure modes

Common error codes include:

- `remote-purchase-forbidden` and `physical-context-required`;
- `interaction-expired` and `interaction-invalid`;
- `store-closed` and `counter-not-found`;
- `stock-revision-conflict`, `stock-insufficient`, and `inventory-not-found`;
- `insufficient-funds` and `insufficient-funds-at-service`;
- `duplicate-request`, `queue-empty`, and `queue-head-mismatch`; and
- `snapshot-invalid`.

Use the code for control flow and the message for user-facing detail. Do not infer success from the absence of an exception.

## Security and integrity boundary

This module enforces domain policy; it is not an anti-cheat or network security boundary. A production renderer should obtain interaction contexts from a privileged scene or main-process adapter and should never accept arbitrary renderer-authored coordinates, timestamps, account credits, or stock adjustments. Save data should use the application's existing atomic persistence boundary.

The service performs no network request, analytics, telemetry, filesystem access, or dynamic code execution.

## Verification

No automated or built-artifact verification ran in this task. The integration lane must cover remote rejection, store-open boundaries, overnight hours, stale revisions, two queued customers, insufficient funds at service, cancellation, receipt contents, snapshot round trips, malformed snapshots, and reservation reconciliation.

## Suggested articles

- [Integration API](integration.md)
- [Construction lifecycle](construction.md)
- [Commerce and construction systems](README.md)

