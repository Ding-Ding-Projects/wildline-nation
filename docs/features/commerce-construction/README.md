# Commerce and construction systems

These modules replace the vertical slice's UI-local purchase and construction counters with deterministic domain services. They do not register themselves in the renderer, Electron bridge, save manager, or build manifest; integration code must import them explicitly.

## Articles

- [Physical commerce](commerce.md) — opening hours, place context, revisioned stock, checkout queues, receipts, and persistence.
- [Construction lifecycle](construction.md) — builder-office contracts, lot and crew validation, ten visible phases, delays, inspection, and handover.
- [Integration API](integration.md) — the intended adapter boundary and the minimum call order for the first city slice.

## Contract summary

| Requirement | Production API |
| --- | --- |
| No remote purchase | `CommerceService.enqueuePurchase()` and `serveNext()` reject `remote-gui` and non-physical contexts. |
| Store schedules | `isEstablishmentOpen()` evaluates weekly local windows, including overnight hours. |
| Stock concurrency | Every request supplies `expectedStockRevision`; reservation, cancellation, adjustment, and sale advance revisions. |
| Checkout queues | `enqueuePurchase()` reserves stock and returns a FIFO position; `serveNext()` settles only the physical queue head. |
| Receipts | Successful service records immutable line, price, tax, stock-revision, counter, cashier, and account-revision evidence. |
| Builder-office contract | `beginProject()`, `selectTemplate()`, and `hireCrew()` require an unexpired allowed office context. |
| Visible build | `getVisiblePhases()` always returns the fixed ten-phase sequence with state and progress. |
| Delays and controls | `addDelay()`, named worker schedules, `pause()`, `resume()`, and `advanceWorkday()` provide deterministic state changes. |
| Save and reload | Both services expose version-1 snapshots and validated restore paths. |
| Completion | A matching physical site context, passing `inspect()`, and `handover()` complete construction. |

## Verification state

This slice was implemented under an explicitly requested ultra-speed boundary. No tests, lint, type checking, build, review workflow, or screen capture ran in this task. That absence is a verification limitation, not passing evidence. The parent integration lane must compile and exercise the modules after it imports them.

## Suggested articles

- Start with [Physical commerce](commerce.md) when wiring money and store interiors.
- Continue with [Construction lifecycle](construction.md) when wiring the builder office and lot scene.
- Use [Integration API](integration.md) before editing a shared renderer or persistence entrypoint.

