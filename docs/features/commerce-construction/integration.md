# Commerce and construction integration API

The two services are deliberately independent of the current renderer and save bridge. A thin adapter should own scene-derived contexts, the game clock, persistence, and the link between a paid builder contract receipt and a construction project.

## Exported modules

```ts
import {
  CommerceService,
  type CommerceClock,
  type CommerceSnapshot,
  type EstablishmentDefinition,
  type PhysicalTransactionContext,
} from './systems/commerce';

import {
  ConstructionService,
  CONSTRUCTION_PHASES,
  DEFAULT_TEMPLATES,
  DEFAULT_WORKERS,
  type ConstructionSnapshot,
} from './systems/construction';
```

No shared entrypoint or manifest was changed in this implementation lane. The owning integration branch must add imports explicitly.

## Adapter responsibilities

The adapter should:

1. construct both services once per loaded save;
2. convert the game clock into the two APIs' explicit clock/date values;
3. create physical contexts from actual scene entry, proximity, counter, actor, interaction, and expiry state;
4. expose read-only stock, queue, receipt, construction-state, and phase views to the renderer;
5. map expected domain error codes to factual non-blocking notifications;
6. save both version-1 snapshots in the same existing save transaction; and
7. keep credits, stock adjustments, office contexts, and site contexts behind the privileged game boundary.

## Purchase flow

```ts
const stock = commerce.getStock('moss-market-grocer');
if (!stock.ok) return showCommerceError(stock.error);

const queued = commerce.enqueuePurchase(request, physicalContext, clock);
if (!queued.ok) return showCommerceError(queued.error);

renderQueuePosition(queued.value.position, queued.value.customersAhead);

const settlement = commerce.serveNext(
  queued.value.establishmentId,
  queued.value.counterId,
  physicalContext,
  clock,
);

if (!settlement.ok) return showCommerceError(settlement.error);
if (settlement.value.status === 'rejected') return showQueueRejection(settlement.value);
renderReceipt(settlement.value.receipt);
```

Never replace `physicalContext` with a map or remote-interface marker. Read-only catalog display and transaction authorization are separate capabilities.

## Builder contract and construction flow

The quote in `ConstructionTemplate.quoteCents` is paid through a configured physical builder-office establishment. Only a successful commerce receipt should authorize project creation.

```ts
const officeSettlement = commerce.serveNext(
  'northline-builders',
  'contracts-desk',
  physicalOfficeCommerceContext,
  commerceClock,
);

if (!officeSettlement.ok || officeSettlement.value.status !== 'completed') return;

construction.beginProject(projectId, lot, builderOfficeContext);
construction.selectTemplate(templateId, builderOfficeContext);
construction.hireCrew(workerIds, builderOfficeContext);
```

The adapter then renders `getState()` and `getVisiblePhases()`, calls `advanceWorkday(explicitDate)` on the game calendar, and exposes `addDelay()`, `pause()`, and `resume()` through suitable controls.

At the matching physical lot:

```ts
const inspection = construction.inspect(constructionSiteContext);
if (!inspection.ok || !inspection.value.passed) return;

const handover = construction.handover('player-1', constructionSiteContext);
if (!handover.ok) return showConstructionError(handover.error);
```

## Save and reload

Persist both snapshots together:

```ts
interface CitySystemsSaveV1 {
  readonly schemaVersion: 1;
  readonly commerce: CommerceSnapshot;
  readonly construction: ConstructionSnapshot | null;
}
```

On load, restore commerce first so accounts, reservations, queues, and receipts exist before renderer actions resume. Restore construction when a project snapshot exists. If either restore fails, keep the last valid live service state, report the exact failure, and do not partially apply the invalid snapshot.

## Error presentation

Expected domain refusals are data. They should become non-blocking notices unless the user must make a decision. Preserve the exact facts: establishment, counter, required physical context, revision conflict, missing amount, lot issue, phase, or inspection check.

Do not retry a stale stock revision automatically. Refresh stock and let the player confirm the changed quantity or price. Do not create a new office or site context to make a rejected remote action succeed; the player must return to the physical location.

## Integration status

The domain modules and these articles are implemented. Shared renderer, Electron, save-schema, and manifest integration are intentionally outside this branch's assigned paths. No test or build verdict exists for the modules yet.

## Suggested articles

- [Physical commerce](commerce.md)
- [Construction lifecycle](construction.md)
- [Commerce and construction systems](README.md)

