export type TransitErrorCode =
  | 'clock-invalid'
  | 'destination-invalid'
  | 'disruption-invalid'
  | 'duplicate-trip'
  | 'fare-invalid'
  | 'fare-required'
  | 'journey-not-found'
  | 'no-capacity'
  | 'no-service'
  | 'pass-not-found'
  | 'route-not-found'
  | 'snapshot-invalid'
  | 'stop-not-found'
  | 'trip-not-found'
  | 'trip-not-boardable'
  | 'trip-not-alightable'
  | 'rider-already-boarded';

export class TransitDomainError extends Error {
  readonly code: TransitErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: TransitErrorCode, message: string, details: Readonly<Record<string, unknown>> = {}) {
    super(message);
    this.name = 'TransitDomainError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}
