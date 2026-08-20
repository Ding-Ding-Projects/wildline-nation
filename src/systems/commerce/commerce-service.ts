import { CommerceDomainError } from './errors';
import { isEstablishmentOpen, isValidCommerceClock, isValidHoursWindow } from './store-hours';
import type {
  AccountView,
  CancelledQueueTicket,
  CommerceClock,
  CommerceResult,
  CommerceServiceOptions,
  CommerceSnapshot,
  CounterDefinition,
  EstablishmentDefinition,
  PhysicalTransactionContext,
  PurchaseReceipt,
  PurchaseRequest,
  QueueSettlement,
  QueueTicket,
  QueueTicketView,
  ReceiptLine,
  ReservedPurchaseLine,
  StockSnapshot,
  StockView,
} from './types';

interface InternalAccount {
  balanceCents: number;
  revision: number;
}

interface InternalStock {
  readonly displayName: string;
  readonly unitPriceCents: number;
  onHand: number;
  reserved: number;
  revision: number;
}

const ok = <T>(value: T): CommerceResult<T> => ({ ok: true, value });

const fail = <T>(
  code: ConstructorParameters<typeof CommerceDomainError>[0],
  message: string,
  details: ConstructorParameters<typeof CommerceDomainError>[2] = {},
): CommerceResult<T> => ({
  ok: false,
  error: new CommerceDomainError(code, message, details),
});

const stockKey = (establishmentId: string, sku: string): string =>
  `${establishmentId}\u0000${sku}`;

const queueKey = (establishmentId: string, counterId: string): string =>
  `${establishmentId}\u0000${counterId}`;

function cloneTicket(ticket: QueueTicket): QueueTicket {
  return {
    ...ticket,
    lines: ticket.lines.map((line) => ({ ...line })),
  };
}

function cloneReceipt(receipt: PurchaseReceipt): PurchaseReceipt {
  return {
    ...receipt,
    lines: receipt.lines.map((line) => ({ ...line })),
  };
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function validNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function validPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function validateDefinition(definition: EstablishmentDefinition): void {
  if (
    !nonEmpty(definition.establishmentId) ||
    !nonEmpty(definition.placeId) ||
    !nonEmpty(definition.displayName) ||
    !nonEmpty(definition.currency) ||
    !nonEmpty(definition.timezoneLabel)
  ) {
    throw new TypeError('Commerce establishment identifiers and labels must be non-empty.');
  }
  if (
    !Number.isSafeInteger(definition.taxRateBasisPoints) ||
    definition.taxRateBasisPoints < 0 ||
    definition.taxRateBasisPoints > 10_000
  ) {
    throw new TypeError(`Invalid tax rate for ${definition.establishmentId}.`);
  }
  if (
    !Number.isFinite(definition.maxInteractionDistanceMeters) ||
    definition.maxInteractionDistanceMeters < 0
  ) {
    throw new TypeError(`Invalid interaction distance for ${definition.establishmentId}.`);
  }
  if (definition.hours.length === 0 || definition.hours.some((window) => !isValidHoursWindow(window))) {
    throw new TypeError(`Invalid opening-hours schedule for ${definition.establishmentId}.`);
  }

  const counters = new Set<string>();
  for (const counter of definition.counters) {
    if (
      !nonEmpty(counter.counterId) ||
      !nonEmpty(counter.displayName) ||
      !nonEmpty(counter.staffName) ||
      counters.has(counter.counterId)
    ) {
      throw new TypeError(`Invalid or duplicate counter in ${definition.establishmentId}.`);
    }
    counters.add(counter.counterId);
  }
  if (counters.size === 0) {
    throw new TypeError(`${definition.establishmentId} must define at least one counter.`);
  }

  const stock = new Set<string>();
  for (const item of definition.inventory) {
    if (
      !nonEmpty(item.sku) ||
      !nonEmpty(item.displayName) ||
      !validNonNegativeInteger(item.unitPriceCents) ||
      !validNonNegativeInteger(item.initialQuantity) ||
      (item.initialRevision !== undefined && !validPositiveInteger(item.initialRevision)) ||
      stock.has(item.sku)
    ) {
      throw new TypeError(`Invalid or duplicate stock item in ${definition.establishmentId}.`);
    }
    stock.add(item.sku);
  }
}

export class CommerceService {
  private readonly establishments = new Map<string, EstablishmentDefinition>();
  private readonly counters = new Map<string, Map<string, CounterDefinition>>();
  private readonly now: () => number;
  private accounts = new Map<string, InternalAccount>();
  private stock = new Map<string, InternalStock>();
  private queues = new Map<string, QueueTicket[]>();
  private receipts = new Map<string, PurchaseReceipt>();
  private terminalRequestIds = new Set<string>();
  private nextSequence = 1;

  constructor(options: CommerceServiceOptions) {
    if (options.establishments.length === 0) {
      throw new TypeError('CommerceService requires at least one establishment.');
    }

    for (const definition of options.establishments) {
      validateDefinition(definition);
      if (this.establishments.has(definition.establishmentId)) {
        throw new TypeError(`Duplicate establishment ${definition.establishmentId}.`);
      }

      const copy: EstablishmentDefinition = {
        ...definition,
        hours: definition.hours.map((window) => ({ ...window })),
        counters: definition.counters.map((counter) => ({ ...counter })),
        inventory: definition.inventory.map((item) => ({ ...item })),
      };
      this.establishments.set(copy.establishmentId, copy);
      this.counters.set(
        copy.establishmentId,
        new Map(copy.counters.map((counter) => [counter.counterId, counter])),
      );

      for (const item of copy.inventory) {
        this.stock.set(stockKey(copy.establishmentId, item.sku), {
          displayName: item.displayName,
          unitPriceCents: item.unitPriceCents,
          onHand: item.initialQuantity,
          reserved: 0,
          revision: item.initialRevision ?? 1,
        });
      }
    }

    this.now = options.now ?? Date.now;
  }

  static fromSnapshot(
    options: CommerceServiceOptions,
    snapshot: CommerceSnapshot,
  ): CommerceResult<CommerceService> {
    const service = new CommerceService(options);
    const restored = service.reloadSnapshot(snapshot);
    if (!restored.ok) return { ok: false, error: restored.error };
    return ok(service);
  }

  listEstablishments(clock?: CommerceClock): readonly (EstablishmentDefinition & { open?: boolean })[] {
    return [...this.establishments.values()].map((definition) => ({
      ...definition,
      hours: definition.hours.map((window) => ({ ...window })),
      counters: definition.counters.map((counter) => ({ ...counter })),
      inventory: definition.inventory.map((item) => ({ ...item })),
      ...(clock ? { open: isEstablishmentOpen(definition, clock) } : {}),
    }));
  }

  getStock(establishmentId: string): CommerceResult<readonly StockView[]> {
    const establishment = this.establishments.get(establishmentId);
    if (!establishment) {
      return fail('establishment-not-found', 'The requested establishment is not registered.', {
        establishmentId,
      });
    }

    return ok(
      establishment.inventory.map((definition) => {
        const state = this.stock.get(stockKey(establishmentId, definition.sku))!;
        return this.toStockView(establishmentId, definition.sku, state);
      }),
    );
  }

  getAccount(actorId: string): CommerceResult<AccountView> {
    const account = this.accounts.get(actorId);
    return account
      ? ok({ actorId, balanceCents: account.balanceCents, revision: account.revision })
      : fail('account-not-found', 'The requested commerce account does not exist.', { actorId });
  }

  registerAccount(actorId: string, openingBalanceCents: number): CommerceResult<AccountView> {
    if (!nonEmpty(actorId) || !validNonNegativeInteger(openingBalanceCents)) {
      return fail('amount-invalid', 'An account needs a non-empty actor id and a non-negative cent balance.', {
        actorId,
        openingBalanceCents,
      });
    }
    if (this.accounts.has(actorId)) {
      return fail('account-already-exists', 'A commerce account already exists for this actor.', {
        actorId,
      });
    }
    this.accounts.set(actorId, { balanceCents: openingBalanceCents, revision: 1 });
    return this.getAccount(actorId);
  }

  creditAccount(actorId: string, amountCents: number): CommerceResult<AccountView> {
    const account = this.accounts.get(actorId);
    if (!account) {
      return fail('account-not-found', 'The commerce account to credit does not exist.', { actorId });
    }
    if (!validPositiveInteger(amountCents)) {
      return fail('amount-invalid', 'A commerce credit must be a positive integer number of cents.', {
        amountCents,
      });
    }
    if (!Number.isSafeInteger(account.balanceCents + amountCents)) {
      return fail('amount-invalid', 'The commerce credit would exceed the supported balance range.', {
        amountCents,
      });
    }

    account.balanceCents += amountCents;
    account.revision += 1;
    return this.getAccount(actorId);
  }

  adjustStock(
    establishmentId: string,
    sku: string,
    expectedRevision: number,
    quantityDelta: number,
  ): CommerceResult<StockView> {
    const state = this.stock.get(stockKey(establishmentId, sku));
    if (!state) {
      return fail('inventory-not-found', 'The stock item to adjust does not exist.', {
        establishmentId,
        sku,
      });
    }
    if (!Number.isSafeInteger(quantityDelta) || quantityDelta === 0) {
      return fail('request-invalid', 'A stock adjustment must be a non-zero integer.', {
        quantityDelta,
      });
    }
    if (state.revision !== expectedRevision) {
      return fail('stock-revision-conflict', 'The stock changed after it was observed.', {
        establishmentId,
        sku,
        expectedRevision,
        actualRevision: state.revision,
      });
    }
    const nextOnHand = state.onHand + quantityDelta;
    if (!validNonNegativeInteger(nextOnHand) || nextOnHand < state.reserved) {
      return fail('stock-insufficient', 'The stock adjustment would remove reserved or nonexistent stock.', {
        establishmentId,
        sku,
        onHand: state.onHand,
        reserved: state.reserved,
        quantityDelta,
      });
    }

    state.onHand = nextOnHand;
    state.revision += 1;
    return ok(this.toStockView(establishmentId, sku, state));
  }

  enqueuePurchase(
    request: PurchaseRequest,
    context: PhysicalTransactionContext,
    clock: CommerceClock,
  ): CommerceResult<QueueTicketView> {
    const establishment = this.establishments.get(request.establishmentId);
    if (!establishment) {
      return fail('establishment-not-found', 'The requested establishment is not registered.', {
        establishmentId: request.establishmentId,
      });
    }

    const contextResult = this.validatePhysicalContext(
      request.actorId,
      request.establishmentId,
      request.counterId,
      context,
      clock,
      establishment,
    );
    if (!contextResult.ok) return contextResult;

    if (!nonEmpty(request.requestId) || request.lines.length === 0) {
      return fail('request-invalid', 'A purchase needs a request id and at least one line.', {
        requestId: request.requestId,
      });
    }
    if (this.hasRequestId(request.requestId)) {
      return fail('duplicate-request', 'This purchase request id has already been used.', {
        requestId: request.requestId,
      });
    }
    if (!isEstablishmentOpen(establishment, clock)) {
      return fail('store-closed', 'The establishment is closed at the supplied local game time.', {
        establishmentId: request.establishmentId,
        localDate: clock.localDate,
        minuteOfDay: clock.minuteOfDay,
      });
    }

    const seenSkus = new Set<string>();
    const pendingLines: Array<{
      state: InternalStock;
      sku: string;
      displayName: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
      observedStockRevision: number;
    }> = [];
    let subtotalCents = 0;

    for (const line of request.lines) {
      if (
        !nonEmpty(line.sku) ||
        !validPositiveInteger(line.quantity) ||
        !validPositiveInteger(line.expectedStockRevision) ||
        seenSkus.has(line.sku)
      ) {
        return fail('request-invalid', 'Purchase lines need unique SKUs, positive quantities, and revisions.', {
          sku: line.sku,
          quantity: line.quantity,
          expectedStockRevision: line.expectedStockRevision,
        });
      }
      seenSkus.add(line.sku);

      const state = this.stock.get(stockKey(request.establishmentId, line.sku));
      if (!state) {
        return fail('inventory-not-found', 'A requested stock item does not exist at this establishment.', {
          establishmentId: request.establishmentId,
          sku: line.sku,
        });
      }
      if (state.revision !== line.expectedStockRevision) {
        return fail('stock-revision-conflict', 'Stock changed after the player observed it.', {
          establishmentId: request.establishmentId,
          sku: line.sku,
          expectedRevision: line.expectedStockRevision,
          actualRevision: state.revision,
        });
      }
      if (state.onHand - state.reserved < line.quantity) {
        return fail('stock-insufficient', 'The requested quantity is no longer available.', {
          establishmentId: request.establishmentId,
          sku: line.sku,
          requested: line.quantity,
          available: state.onHand - state.reserved,
        });
      }

      const lineTotalCents = state.unitPriceCents * line.quantity;
      if (!Number.isSafeInteger(lineTotalCents) || !Number.isSafeInteger(subtotalCents + lineTotalCents)) {
        return fail('amount-invalid', 'The purchase total exceeds the supported cent range.', {
          sku: line.sku,
        });
      }
      subtotalCents += lineTotalCents;
      pendingLines.push({
        state,
        sku: line.sku,
        displayName: state.displayName,
        quantity: line.quantity,
        unitPriceCents: state.unitPriceCents,
        lineTotalCents,
        observedStockRevision: state.revision,
      });
    }

    const taxCents = Math.round((subtotalCents * establishment.taxRateBasisPoints) / 10_000);
    const totalCents = subtotalCents + taxCents;
    if (!Number.isSafeInteger(totalCents)) {
      return fail('amount-invalid', 'The purchase total exceeds the supported cent range.');
    }
    const account = this.accounts.get(request.actorId);
    if (!account) {
      return fail('account-not-found', 'The purchasing actor does not have a commerce account.', {
        actorId: request.actorId,
      });
    }
    if (account.balanceCents < totalCents) {
      return fail('insufficient-funds', 'The commerce account cannot cover this purchase.', {
        actorId: request.actorId,
        balanceCents: account.balanceCents,
        totalCents,
      });
    }

    const sequence = this.nextSequence;
    const lines: ReservedPurchaseLine[] = pendingLines.map((line) => {
      line.state.reserved += line.quantity;
      line.state.revision += 1;
      return {
        sku: line.sku,
        displayName: line.displayName,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.lineTotalCents,
        observedStockRevision: line.observedStockRevision,
        reservedStockRevision: line.state.revision,
      };
    });
    this.nextSequence += 1;

    const ticket: QueueTicket = {
      ticketId: `ticket-${sequence}`,
      sequence,
      requestId: request.requestId,
      actorId: request.actorId,
      establishmentId: establishment.establishmentId,
      placeId: establishment.placeId,
      counterId: request.counterId,
      interactionId: context.interactionId,
      queuedAtEpochMs: clock.epochMs,
      queuedLocalDate: clock.localDate,
      subtotalCents,
      taxCents,
      totalCents,
      currency: establishment.currency,
      lines,
    };
    const key = queueKey(establishment.establishmentId, request.counterId);
    const queue = this.queues.get(key) ?? [];
    queue.push(ticket);
    this.queues.set(key, queue);
    return ok(this.toTicketView(ticket, queue.length));
  }

  serveNext(
    establishmentId: string,
    counterId: string,
    context: PhysicalTransactionContext,
    clock: CommerceClock,
  ): CommerceResult<QueueSettlement> {
    const establishment = this.establishments.get(establishmentId);
    if (!establishment) {
      return fail('establishment-not-found', 'The requested establishment is not registered.', {
        establishmentId,
      });
    }
    const key = queueKey(establishmentId, counterId);
    const queue = this.queues.get(key);
    const ticket = queue?.[0];
    if (!queue || !ticket) {
      return fail('queue-empty', 'This checkout queue has no waiting purchase.', {
        establishmentId,
        counterId,
      });
    }

    const contextResult = this.validatePhysicalContext(
      ticket.actorId,
      ticket.establishmentId,
      ticket.counterId,
      context,
      clock,
      establishment,
    );
    if (!contextResult.ok) return contextResult;
    if (context.interactionId !== ticket.interactionId) {
      return fail('queue-head-mismatch', 'The physical interaction does not own the queue head.', {
        ticketId: ticket.ticketId,
        interactionId: context.interactionId,
      });
    }
    if (!isEstablishmentOpen(establishment, clock)) {
      return fail('store-closed', 'The establishment closed before this queued purchase was served.', {
        establishmentId,
        ticketId: ticket.ticketId,
      });
    }

    const account = this.accounts.get(ticket.actorId);
    if (!account || account.balanceCents < ticket.totalCents) {
      return ok(
        this.rejectAndRelease(
          key,
          ticket,
          'insufficient-funds-at-service',
          'The account balance changed while the purchase waited in the queue.',
        ),
      );
    }
    const stockIsReserved = ticket.lines.every((line) => {
      const state = this.stock.get(stockKey(ticket.establishmentId, line.sku));
      return state !== undefined && state.reserved >= line.quantity && state.onHand >= line.quantity;
    });
    if (!stockIsReserved) {
      return ok(
        this.rejectAndRelease(
          key,
          ticket,
          'reserved-stock-unavailable',
          'Reserved stock could not be reconciled at service time.',
        ),
      );
    }

    account.balanceCents -= ticket.totalCents;
    account.revision += 1;
    const receiptLines: ReceiptLine[] = ticket.lines.map((line) => {
      const state = this.stock.get(stockKey(ticket.establishmentId, line.sku))!;
      state.reserved -= line.quantity;
      state.onHand -= line.quantity;
      state.revision += 1;
      return {
        sku: line.sku,
        displayName: line.displayName,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.lineTotalCents,
        stockRevisionObserved: line.observedStockRevision,
        stockRevisionAfterSale: state.revision,
      };
    });
    queue.shift();
    if (queue.length === 0) this.queues.delete(key);

    const counter = this.counters.get(establishmentId)!.get(counterId)!;
    const receipt: PurchaseReceipt = {
      receiptId: `receipt-${ticket.sequence}`,
      receiptNumber: `${establishment.establishmentId.toUpperCase()}-${String(ticket.sequence).padStart(6, '0')}`,
      requestId: ticket.requestId,
      ticketId: ticket.ticketId,
      actorId: ticket.actorId,
      establishmentId,
      establishmentName: establishment.displayName,
      placeId: establishment.placeId,
      counterId,
      cashierName: counter.staffName,
      completedAtEpochMs: clock.epochMs,
      completedLocalDate: clock.localDate,
      currency: establishment.currency,
      subtotalCents: ticket.subtotalCents,
      taxCents: ticket.taxCents,
      totalCents: ticket.totalCents,
      accountRevisionAfterSale: account.revision,
      lines: receiptLines,
    };
    this.receipts.set(receipt.receiptId, receipt);
    return ok({ status: 'completed', receipt: cloneReceipt(receipt) });
  }

  cancelQueuedPurchase(
    ticketId: string,
    actorId: string,
    reason: string,
    clock: CommerceClock,
  ): CommerceResult<CancelledQueueTicket> {
    if (!isValidCommerceClock(clock)) {
      return fail('clock-invalid', 'The supplied game clock is invalid.');
    }
    if (!nonEmpty(reason)) {
      return fail('request-invalid', 'Cancelling a queued purchase requires a reason.');
    }

    for (const [key, queue] of this.queues) {
      const index = queue.findIndex((candidate) => candidate.ticketId === ticketId);
      if (index < 0) continue;
      const ticket = queue[index];
      if (ticket.actorId !== actorId) {
        return fail('queue-head-mismatch', 'Only the actor who queued this purchase may cancel it.', {
          ticketId,
          actorId,
        });
      }

      this.releaseReservation(ticket);
      queue.splice(index, 1);
      if (queue.length === 0) this.queues.delete(key);
      this.terminalRequestIds.add(ticket.requestId);
      return ok({
        status: 'cancelled',
        ticket: cloneTicket(ticket),
        cancelledAtEpochMs: clock.epochMs,
        reason: reason.trim(),
      });
    }

    return fail('queue-ticket-not-found', 'The queued purchase to cancel does not exist.', {
      ticketId,
    });
  }

  getQueue(establishmentId: string, counterId: string): readonly QueueTicketView[] {
    const queue = this.queues.get(queueKey(establishmentId, counterId)) ?? [];
    return queue.map((ticket, index) => this.toTicketView(ticket, index + 1));
  }

  listReceipts(actorId: string): readonly PurchaseReceipt[] {
    return [...this.receipts.values()]
      .filter((receipt) => receipt.actorId === actorId)
      .sort((left, right) => left.completedAtEpochMs - right.completedAtEpochMs)
      .map(cloneReceipt);
  }

  getReceipt(receiptId: string): CommerceResult<PurchaseReceipt> {
    const receipt = this.receipts.get(receiptId);
    return receipt
      ? ok(cloneReceipt(receipt))
      : fail('receipt-not-found', 'The requested receipt does not exist.', { receiptId });
  }

  saveSnapshot(): CommerceSnapshot {
    return {
      schemaVersion: 1,
      savedAtEpochMs: this.now(),
      nextSequence: this.nextSequence,
      accounts: [...this.accounts].map(([actorId, account]) => ({ actorId, ...account })),
      stock: [...this.stock].map(([key, state]) => {
        const [establishmentId, sku] = key.split('\u0000');
        return {
          establishmentId,
          sku,
          onHand: state.onHand,
          reserved: state.reserved,
          revision: state.revision,
        };
      }),
      queues: [...this.queues.values()].flat().map(cloneTicket),
      receipts: [...this.receipts.values()].map(cloneReceipt),
      terminalRequestIds: [...this.terminalRequestIds],
    };
  }

  serializeSnapshot(snapshot: CommerceSnapshot = this.saveSnapshot()): string {
    return JSON.stringify(snapshot);
  }

  parseSnapshot(serialized: string): CommerceResult<CommerceSnapshot> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      return fail('snapshot-invalid', 'The commerce snapshot is not valid JSON.');
    }
    return this.reloadSnapshot(parsed as CommerceSnapshot);
  }

  reloadSnapshot(snapshot: CommerceSnapshot): CommerceResult<CommerceSnapshot> {
    const invalid = (message: string, details: Record<string, string | number | boolean | null> = {}) =>
      fail<CommerceSnapshot>('snapshot-invalid', message, details);
    if (
      !snapshot ||
      typeof snapshot !== 'object' ||
      snapshot.schemaVersion !== 1 ||
      !Number.isFinite(snapshot.savedAtEpochMs) ||
      !validPositiveInteger(snapshot.nextSequence) ||
      !Array.isArray(snapshot.accounts) ||
      !Array.isArray(snapshot.stock) ||
      !Array.isArray(snapshot.queues) ||
      !Array.isArray(snapshot.receipts) ||
      !Array.isArray(snapshot.terminalRequestIds)
    ) {
      return invalid('The commerce snapshot header or collection shape is invalid.');
    }

    const accounts = new Map<string, InternalAccount>();
    for (const account of snapshot.accounts) {
      if (
        !account ||
        !nonEmpty(account.actorId) ||
        !validNonNegativeInteger(account.balanceCents) ||
        !validPositiveInteger(account.revision) ||
        accounts.has(account.actorId)
      ) {
        return invalid('The commerce snapshot contains an invalid or duplicate account.');
      }
      accounts.set(account.actorId, {
        balanceCents: account.balanceCents,
        revision: account.revision,
      });
    }

    const stock = new Map<string, InternalStock>();
    for (const item of snapshot.stock) {
      const definition = this.establishments
        .get(item?.establishmentId)
        ?.inventory.find((candidate) => candidate.sku === item?.sku);
      const key = item ? stockKey(item.establishmentId, item.sku) : '';
      if (
        !definition ||
        stock.has(key) ||
        !validNonNegativeInteger(item.onHand) ||
        !validNonNegativeInteger(item.reserved) ||
        item.reserved > item.onHand ||
        !validPositiveInteger(item.revision)
      ) {
        return invalid('The commerce snapshot contains invalid, unknown, or duplicate stock.');
      }
      stock.set(key, {
        displayName: definition.displayName,
        unitPriceCents: definition.unitPriceCents,
        onHand: item.onHand,
        reserved: item.reserved,
        revision: item.revision,
      });
    }
    if (stock.size !== this.stock.size) {
      return invalid('The commerce snapshot does not account for every configured stock item.', {
        expected: this.stock.size,
        actual: stock.size,
      });
    }

    const queues = new Map<string, QueueTicket[]>();
    const requestIds = new Set<string>();
    const ticketIds = new Set<string>();
    const expectedReservations = new Map<string, number>();
    for (const ticket of snapshot.queues) {
      const establishment = this.establishments.get(ticket?.establishmentId);
      const counter = establishment && this.counters.get(establishment.establishmentId)?.get(ticket?.counterId);
      if (
        !ticket ||
        !establishment ||
        !counter ||
        !nonEmpty(ticket.ticketId) ||
        !nonEmpty(ticket.requestId) ||
        !nonEmpty(ticket.actorId) ||
        !nonEmpty(ticket.interactionId) ||
        !validPositiveInteger(ticket.sequence) ||
        ticket.sequence >= snapshot.nextSequence ||
        !Number.isFinite(ticket.queuedAtEpochMs) ||
        !Array.isArray(ticket.lines) ||
        ticket.lines.length === 0 ||
        requestIds.has(ticket.requestId) ||
        ticketIds.has(ticket.ticketId)
      ) {
        return invalid('The commerce snapshot contains an invalid or duplicate queue ticket.');
      }
      if (
        ticket.establishmentId !== establishment.establishmentId ||
        ticket.placeId !== establishment.placeId ||
        ticket.currency !== establishment.currency ||
        !validNonNegativeInteger(ticket.subtotalCents) ||
        !validNonNegativeInteger(ticket.taxCents) ||
        ticket.totalCents !== ticket.subtotalCents + ticket.taxCents
      ) {
        return invalid('A queued purchase does not match its configured establishment.');
      }

      let computedSubtotal = 0;
      const lineSkus = new Set<string>();
      for (const line of ticket.lines) {
        const item = stock.get(stockKey(ticket.establishmentId, line?.sku));
        if (
          !line ||
          !item ||
          lineSkus.has(line.sku) ||
          !validPositiveInteger(line.quantity) ||
          !validNonNegativeInteger(line.unitPriceCents) ||
          line.lineTotalCents !== line.quantity * line.unitPriceCents ||
          !validPositiveInteger(line.observedStockRevision) ||
          !validPositiveInteger(line.reservedStockRevision)
        ) {
          return invalid('A queued purchase contains an invalid reservation line.');
        }
        lineSkus.add(line.sku);
        computedSubtotal += line.lineTotalCents;
        const key = stockKey(ticket.establishmentId, line.sku);
        expectedReservations.set(key, (expectedReservations.get(key) ?? 0) + line.quantity);
      }
      if (computedSubtotal !== ticket.subtotalCents) {
        return invalid('A queued purchase subtotal does not match its reservation lines.');
      }

      requestIds.add(ticket.requestId);
      ticketIds.add(ticket.ticketId);
      const key = queueKey(ticket.establishmentId, ticket.counterId);
      const queue = queues.get(key) ?? [];
      queue.push(cloneTicket(ticket));
      queues.set(key, queue);
    }
    for (const queue of queues.values()) queue.sort((left, right) => left.sequence - right.sequence);
    for (const [key, state] of stock) {
      if (state.reserved !== (expectedReservations.get(key) ?? 0)) {
        return invalid('Snapshot stock reservations do not match the queued purchase lines.', { key });
      }
    }

    const receipts = new Map<string, PurchaseReceipt>();
    for (const receipt of snapshot.receipts) {
      if (
        !receipt ||
        !nonEmpty(receipt.receiptId) ||
        !nonEmpty(receipt.requestId) ||
        !nonEmpty(receipt.ticketId) ||
        !this.establishments.has(receipt.establishmentId) ||
        !Array.isArray(receipt.lines) ||
        receipt.lines.length === 0 ||
        receipts.has(receipt.receiptId) ||
        requestIds.has(receipt.requestId) ||
        !validNonNegativeInteger(receipt.totalCents) ||
        receipt.totalCents !== receipt.subtotalCents + receipt.taxCents
      ) {
        return invalid('The commerce snapshot contains an invalid or duplicate receipt.');
      }
      requestIds.add(receipt.requestId);
      receipts.set(receipt.receiptId, cloneReceipt(receipt));
    }

    const terminalRequestIds = new Set<string>();
    for (const requestId of snapshot.terminalRequestIds) {
      if (!nonEmpty(requestId) || requestIds.has(requestId) || terminalRequestIds.has(requestId)) {
        return invalid('The commerce snapshot contains an invalid or duplicate terminal request id.');
      }
      terminalRequestIds.add(requestId);
    }

    this.accounts = accounts;
    this.stock = stock;
    this.queues = queues;
    this.receipts = receipts;
    this.terminalRequestIds = terminalRequestIds;
    this.nextSequence = snapshot.nextSequence;
    return ok(this.saveSnapshot());
  }

  private validatePhysicalContext(
    actorId: string,
    establishmentId: string,
    counterId: string,
    context: PhysicalTransactionContext,
    clock: CommerceClock,
    establishment: EstablishmentDefinition,
  ): CommerceResult<true> {
    if (!isValidCommerceClock(clock)) {
      return fail('clock-invalid', 'The supplied game clock is invalid.');
    }
    if (context.channel === 'remote-gui') {
      return fail(
        'remote-purchase-forbidden',
        'Informational remote interfaces cannot create or settle purchases.',
        { channel: context.channel },
      );
    }
    if (context.channel !== 'physical-counter' && context.channel !== 'physical-machine') {
      return fail('physical-context-required', 'This transaction must begin at a physical counter or machine.', {
        channel: context.channel,
      });
    }
    if (
      !nonEmpty(context.interactionId) ||
      context.actorId !== actorId ||
      context.establishmentId !== establishmentId ||
      context.placeId !== establishment.placeId ||
      context.counterId !== counterId ||
      !this.counters.get(establishmentId)?.has(counterId)
    ) {
      return fail('interaction-invalid', 'The physical interaction does not match the actor, place, or counter.', {
        actorId,
        establishmentId,
        counterId,
      });
    }
    if (
      !Number.isFinite(context.enteredAtEpochMs) ||
      !Number.isFinite(context.expiresAtEpochMs) ||
      context.enteredAtEpochMs > clock.epochMs ||
      context.expiresAtEpochMs < context.enteredAtEpochMs ||
      context.expiresAtEpochMs < clock.epochMs
    ) {
      return fail('interaction-expired', 'The physical interaction is expired or has an invalid time range.', {
        enteredAtEpochMs: context.enteredAtEpochMs,
        expiresAtEpochMs: context.expiresAtEpochMs,
        clockEpochMs: clock.epochMs,
      });
    }
    if (
      !Number.isFinite(context.distanceMeters) ||
      context.distanceMeters < 0 ||
      context.distanceMeters > establishment.maxInteractionDistanceMeters
    ) {
      return fail('physical-context-required', 'The actor is outside this counter’s transaction distance.', {
        distanceMeters: context.distanceMeters,
        maxDistanceMeters: establishment.maxInteractionDistanceMeters,
      });
    }
    return ok(true);
  }

  private rejectAndRelease(
    key: string,
    ticket: QueueTicket,
    rejectionCode: 'insufficient-funds-at-service' | 'reserved-stock-unavailable',
    message: string,
  ): Extract<QueueSettlement, { status: 'rejected' }> {
    this.releaseReservation(ticket);
    const queue = this.queues.get(key)!;
    queue.shift();
    if (queue.length === 0) this.queues.delete(key);
    this.terminalRequestIds.add(ticket.requestId);
    return { status: 'rejected', ticket: cloneTicket(ticket), rejectionCode, message };
  }

  private releaseReservation(ticket: QueueTicket): void {
    for (const line of ticket.lines) {
      const state = this.stock.get(stockKey(ticket.establishmentId, line.sku));
      if (!state) continue;
      state.reserved = Math.max(0, state.reserved - line.quantity);
      state.revision += 1;
    }
  }

  private toStockView(establishmentId: string, sku: string, state: InternalStock): StockView {
    return {
      establishmentId,
      sku,
      displayName: state.displayName,
      unitPriceCents: state.unitPriceCents,
      onHand: state.onHand,
      reserved: state.reserved,
      available: state.onHand - state.reserved,
      revision: state.revision,
    };
  }

  private toTicketView(ticket: QueueTicket, position: number): QueueTicketView {
    return {
      ...cloneTicket(ticket),
      position,
      customersAhead: position - 1,
    };
  }

  private hasRequestId(requestId: string): boolean {
    if (this.terminalRequestIds.has(requestId)) return true;
    if ([...this.receipts.values()].some((receipt) => receipt.requestId === requestId)) return true;
    return [...this.queues.values()].some((queue) =>
      queue.some((ticket) => ticket.requestId === requestId),
    );
  }
}
