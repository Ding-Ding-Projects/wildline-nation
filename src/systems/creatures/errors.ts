export type CreatureErrorCode =
  | 'ball-invalid'
  | 'ball-not-found'
  | 'capture-complete'
  | 'capture-failed'
  | 'duplicate-creature'
  | 'encounter-not-found'
  | 'encounter-owner-mismatch'
  | 'habitat-invalid'
  | 'inventory-invalid'
  | 'not-enough-balls'
  | 'owner-invalid'
  | 'snapshot-invalid'
  | 'species-not-found';

export class CreatureDomainError extends Error {
  readonly code: CreatureErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: CreatureErrorCode, message: string, details: Readonly<Record<string, unknown>> = {}) {
    super(message);
    this.name = 'CreatureDomainError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}
