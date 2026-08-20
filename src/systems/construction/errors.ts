export type ConstructionErrorCode =
  | 'invalid-input'
  | 'project-exists'
  | 'project-missing'
  | 'builder-office-required'
  | 'construction-site-required'
  | 'context-expired'
  | 'lot-invalid'
  | 'template-not-found'
  | 'template-not-selected'
  | 'template-incompatible'
  | 'crew-invalid'
  | 'crew-size-mismatch'
  | 'crew-unavailable'
  | 'invalid-state'
  | 'paused'
  | 'cancelled'
  | 'delay-invalid'
  | 'snapshot-invalid'
  | 'inspection-required'
  | 'inspection-failed'
  | 'handover-complete';

export class ConstructionDomainError extends Error {
  readonly code: ConstructionErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: ConstructionErrorCode, message: string, details: Readonly<Record<string, unknown>> = {}) {
    super(message);
    this.name = 'ConstructionDomainError';
    this.code = code;
    this.details = details;
  }
}

