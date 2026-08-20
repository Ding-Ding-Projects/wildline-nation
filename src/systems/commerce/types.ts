export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type TransactionChannel =
  | 'physical-counter'
  | 'physical-machine'
  | 'remote-gui'
  | 'map-overlay';

export interface CommerceClock {
  /** Milliseconds on the game clock. The caller owns wall-clock-to-game-clock conversion. */
  readonly epochMs: number;
  readonly dayOfWeek: DayOfWeek;
  readonly minuteOfDay: number;
  readonly localDate: string;
}

export interface StoreHoursWindow {
  readonly dayOfWeek: DayOfWeek;
  readonly opensMinute: number;
  readonly closesMinute: number;
}

export interface CounterDefinition {
  readonly counterId: string;
  readonly displayName: string;
  readonly staffName: string;
}

export interface StockItemDefinition {
  readonly sku: string;
  readonly displayName: string;
  readonly unitPriceCents: number;
  readonly initialQuantity: number;
  readonly initialRevision?: number;
}

export interface EstablishmentDefinition {
  readonly establishmentId: string;
  readonly placeId: string;
  readonly displayName: string;
  readonly currency: string;
  readonly taxRateBasisPoints: number;
  readonly timezoneLabel: string;
  readonly maxInteractionDistanceMeters: number;
  readonly hours: readonly StoreHoursWindow[];
  readonly counters: readonly CounterDefinition[];
  readonly inventory: readonly StockItemDefinition[];
}

export interface PhysicalTransactionContext {
  readonly channel: TransactionChannel;
  readonly actorId: string;
  readonly placeId: string;
  readonly establishmentId: string;
  readonly counterId: string;
  readonly interactionId: string;
  readonly enteredAtEpochMs: number;
  readonly expiresAtEpochMs: number;
  readonly distanceMeters: number;
}

export interface PurchaseLineRequest {
  readonly sku: string;
  readonly quantity: number;
  /** The revision observed while the player was physically inspecting this stock. */
  readonly expectedStockRevision: number;
}

export interface PurchaseRequest {
  /** Caller-provided idempotency key. It must be unique for the saved commerce state. */
  readonly requestId: string;
  readonly actorId: string;
  readonly establishmentId: string;
  readonly counterId: string;
  readonly lines: readonly PurchaseLineRequest[];
}

export interface AccountView {
  readonly actorId: string;
  readonly balanceCents: number;
  readonly revision: number;
}

export interface StockView {
  readonly establishmentId: string;
  readonly sku: string;
  readonly displayName: string;
  readonly unitPriceCents: number;
  readonly onHand: number;
  readonly reserved: number;
  readonly available: number;
  readonly revision: number;
}

export interface ReservedPurchaseLine {
  readonly sku: string;
  readonly displayName: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly lineTotalCents: number;
  readonly observedStockRevision: number;
  readonly reservedStockRevision: number;
}

export interface QueueTicket {
  readonly ticketId: string;
  readonly sequence: number;
  readonly requestId: string;
  readonly actorId: string;
  readonly establishmentId: string;
  readonly placeId: string;
  readonly counterId: string;
  readonly interactionId: string;
  readonly queuedAtEpochMs: number;
  readonly queuedLocalDate: string;
  readonly subtotalCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly currency: string;
  readonly lines: readonly ReservedPurchaseLine[];
}

export interface QueueTicketView extends QueueTicket {
  readonly position: number;
  readonly customersAhead: number;
}

export interface ReceiptLine {
  readonly sku: string;
  readonly displayName: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly lineTotalCents: number;
  readonly stockRevisionObserved: number;
  readonly stockRevisionAfterSale: number;
}

export interface PurchaseReceipt {
  readonly receiptId: string;
  readonly receiptNumber: string;
  readonly requestId: string;
  readonly ticketId: string;
  readonly actorId: string;
  readonly establishmentId: string;
  readonly establishmentName: string;
  readonly placeId: string;
  readonly counterId: string;
  readonly cashierName: string;
  readonly completedAtEpochMs: number;
  readonly completedLocalDate: string;
  readonly currency: string;
  readonly subtotalCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly accountRevisionAfterSale: number;
  readonly lines: readonly ReceiptLine[];
}

export type QueueRejectionCode =
  | 'insufficient-funds-at-service'
  | 'reserved-stock-unavailable';

export interface RejectedQueueSettlement {
  readonly status: 'rejected';
  readonly ticket: QueueTicket;
  readonly rejectionCode: QueueRejectionCode;
  readonly message: string;
}

export interface CompletedQueueSettlement {
  readonly status: 'completed';
  readonly receipt: PurchaseReceipt;
}

export type QueueSettlement = CompletedQueueSettlement | RejectedQueueSettlement;

export interface CancelledQueueTicket {
  readonly status: 'cancelled';
  readonly ticket: QueueTicket;
  readonly cancelledAtEpochMs: number;
  readonly reason: string;
}

export type CommerceErrorCode =
  | 'account-already-exists'
  | 'account-not-found'
  | 'amount-invalid'
  | 'clock-invalid'
  | 'counter-not-found'
  | 'duplicate-request'
  | 'establishment-not-found'
  | 'insufficient-funds'
  | 'interaction-expired'
  | 'interaction-invalid'
  | 'inventory-not-found'
  | 'physical-context-required'
  | 'queue-empty'
  | 'queue-head-mismatch'
  | 'queue-ticket-not-found'
  | 'receipt-not-found'
  | 'remote-purchase-forbidden'
  | 'request-invalid'
  | 'snapshot-invalid'
  | 'stock-insufficient'
  | 'stock-revision-conflict'
  | 'store-closed';

export type CommerceResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: import('./errors').CommerceDomainError };

export interface StockSnapshot {
  readonly establishmentId: string;
  readonly sku: string;
  readonly onHand: number;
  readonly reserved: number;
  readonly revision: number;
}

export interface CommerceSnapshot {
  readonly schemaVersion: 1;
  readonly savedAtEpochMs: number;
  readonly nextSequence: number;
  readonly accounts: readonly AccountView[];
  readonly stock: readonly StockSnapshot[];
  readonly queues: readonly QueueTicket[];
  readonly receipts: readonly PurchaseReceipt[];
  /** Request ids that ended in cancellation or a queue-time rejection. */
  readonly terminalRequestIds: readonly string[];
}

export interface CommerceServiceOptions {
  readonly establishments: readonly EstablishmentDefinition[];
  readonly now?: () => number;
}
